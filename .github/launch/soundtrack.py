"""
Synthesises the launch film's soundtrack from nothing but numpy and scipy.

The sound effects come from `audioEvents()` in timeline.mjs, so every flap,
keystroke and impact lands on the frame that shows it; the music bed around
them (drone, riser, drums, bass, pads, arpeggio) is written out below against
the same clock: 120 BPM, one bar every two seconds, the drop at 12s.

    python3 soundtrack.py soundtrack.wav
"""

import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from scipy import signal
from scipy.io import wavfile

HERE = Path(__file__).parent
SR = 48000
DURATION = 56.0
BEAT = 0.5
DROP = 12.0
FINALE = 45.4
N = int(SR * DURATION)
rng = np.random.default_rng(3)

dry = np.zeros((N, 2))
send = np.zeros((N, 2))  # what goes to the reverb


def midi(note):
    return 440.0 * 2 ** ((note - 69) / 12)


def seconds(length):
    return np.arange(int(SR * length)) / SR


def place(buffer, t, sound, gain=1.0, pan=0.0):
    """Mixes a mono or stereo sound into a stereo buffer at time t."""
    start = int(round(t * SR))
    if start >= N:
        return
    if sound.ndim == 1:
        left = np.cos((pan + 1) * np.pi / 4)
        right = np.sin((pan + 1) * np.pi / 4)
        sound = np.stack([sound * left, sound * right], axis=1) * np.sqrt(2)
    end = min(N, start + len(sound))
    if start < 0:
        sound = sound[-start:]
        start = 0
        end = min(N, len(sound))
    buffer[start:end] += sound[: end - start] * gain


def add(t, sound, gain=1.0, pan=0.0, wet=0.2):
    place(dry, t, sound, gain, pan)
    if wet:
        place(send, t, sound, gain * wet, pan)


def lowpass(x, cutoff, order=2):
    b, a = signal.butter(order, min(cutoff, SR / 2 - 100) / (SR / 2), 'low')
    return signal.lfilter(b, a, x, axis=0)


def highpass(x, cutoff, order=2):
    b, a = signal.butter(order, cutoff / (SR / 2), 'high')
    return signal.lfilter(b, a, x, axis=0)


def bandpass(x, low, high, order=2):
    b, a = signal.butter(order, [low / (SR / 2), min(high, SR / 2 - 100) / (SR / 2)], 'band')
    return signal.lfilter(b, a, x, axis=0)


def saw(freq, length, detune=0.0, phase=None):
    t = seconds(length)
    phase = rng.random() if phase is None else phase
    f = freq * (1 + detune)
    return 2 * ((t * f + phase) % 1) - 1


def supersaw(freq, length, voices=5, spread=0.012):
    out = np.zeros(int(SR * length))
    for v in range(voices):
        d = (v - (voices - 1) / 2) / max(1, (voices - 1) / 2) * spread
        out += saw(freq, length, d)
    return out / voices


def sweep_filter(x, start, end, steps=64):
    """A lowpass whose cutoff glides from start to end over the sound, in blocks."""
    out = np.zeros_like(x)
    edges = np.linspace(0, len(x), steps + 1).astype(int)
    zi = None
    for i in range(steps):
        cutoff = start * (end / start) ** (i / (steps - 1))
        b, a = signal.butter(2, min(cutoff, SR / 2 - 100) / (SR / 2), 'low')
        if zi is None:
            zi = signal.lfilter_zi(b, a) * 0
        out[edges[i] : edges[i + 1]], zi = signal.lfilter(b, a, x[edges[i] : edges[i + 1]], zi=zi)
    return out


def adsr(length, attack=0.005, decay=0.1, sustain=0.0, release=0.05):
    n = int(SR * length)
    env = np.full(n, sustain, dtype=float)
    a = max(1, int(SR * attack))
    d = max(1, int(SR * decay))
    r = max(1, int(SR * release))
    env[: min(a, n)] = np.linspace(0, 1, a)[: min(a, n)]
    if a < n:
        seg = np.linspace(1, sustain, d)[: max(0, min(d, n - a))]
        env[a : a + len(seg)] = seg
    env[-min(r, n) :] *= np.linspace(1, 0, min(r, n))
    return env


def noise(length):
    return rng.standard_normal(int(SR * length))


# ─── Sound design ────────────────────────────────────────────────────────────


def flap(seed):
    """A split-flap leaf hitting its stop: a click with a small plastic body."""
    length = 0.045
    t = seconds(length)
    click = highpass(noise(length), 2500) * np.exp(-t * 600)
    body_f = 1400 + seed * 1800
    body = np.sin(2 * np.pi * body_f * t) * np.exp(-t * 160)
    thock = np.sin(2 * np.pi * (180 + seed * 60) * t) * np.exp(-t * 120)
    return (click * 0.5 + body * 0.35 + thock * 0.4) * 0.6


def key(seed):
    length = 0.06
    t = seconds(length)
    click = bandpass(noise(length), 1800, 9000) * np.exp(-t * 400)
    body = np.sin(2 * np.pi * (240 + seed * 80) * t) * np.exp(-t * 90)
    return click * 0.35 + body * 0.25


def glitch(seed):
    length = 0.16
    t = seconds(length)
    f = 300 + seed * 900
    square = np.sign(np.sin(2 * np.pi * f * t * (1 + 3 * t)))
    stutter = (np.floor(t * 70) % 2 == 0).astype(float)
    crushed = np.round(square * stutter * 4) / 4
    return lowpass(crushed * np.exp(-t * 14), 5000) * 0.18 + bandpass(noise(length), 2000, 6000) * np.exp(-t * 40) * 0.12


def tom(freq=95.0, length=1.0):
    t = seconds(length)
    f = freq * (0.45 + 0.55 * np.exp(-t * 12))
    phase = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(phase) * np.exp(-t * 4.5) + lowpass(noise(length), 1500) * np.exp(-t * 30) * 0.3


def kick(strength=1.0):
    length = 0.45
    t = seconds(length)
    f = 48 + 110 * np.exp(-t * 35)
    phase = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(phase) * np.exp(-t * 7)
    click = highpass(noise(length), 3000) * np.exp(-t * 300) * 0.3
    return np.tanh((body + click) * 1.6 * strength) * 0.9


def clap():
    length = 0.35
    t = seconds(length)
    bursts = sum(np.exp(-np.maximum(0, t - d) * 180) * (t >= d) for d in (0, 0.011, 0.022))
    tail = np.exp(-t * 18)
    return bandpass(noise(length), 900, 7000) * (bursts * 0.7 + tail * 0.5) * 0.5


def hat(open_=False):
    length = 0.25 if open_ else 0.06
    t = seconds(length)
    return highpass(noise(length), 7000, 4) * np.exp(-t * (12 if open_ else 70)) * 0.22


def impact(size=1.0):
    length = 3.2
    t = seconds(length)
    f = 70 * (0.4 + 0.6 * np.exp(-t * 3))
    phase = 2 * np.pi * np.cumsum(f) / SR
    sub = np.sin(phase) * np.exp(-t * 1.4)
    crack = lowpass(noise(length), 6000) * np.exp(-t * 9)
    grit = np.tanh(lowpass(noise(length), 400) * 3) * np.exp(-t * 3) * 0.3
    return np.tanh((sub * 1.2 + crack * 0.6 + grit) * 1.3) * 0.9 * size


def hit(size=0.6):
    length = 1.2
    t = seconds(length)
    body = np.zeros(len(t))
    k = kick(1.2)
    body[: len(k)] = k
    return body * 0.8 * size + lowpass(noise(length), 5000) * np.exp(-t * 14) * 0.45 * size


def tick():
    length = 0.12
    t = seconds(length)
    return (np.sin(2 * np.pi * 2400 * t) * 0.5 + np.sin(2 * np.pi * 3600 * t) * 0.2) * np.exp(-t * 45) * 0.3


def whoosh(length):
    length = max(0.3, length)
    t = seconds(length + 0.3)
    shape = np.sin(np.pi * np.clip(t / (length + 0.3), 0, 1)) ** 2
    raw = noise(length + 0.3)
    out = np.zeros_like(raw)
    steps = 40
    edges = np.linspace(0, len(raw), steps + 1).astype(int)
    for i in range(steps):
        k = i / (steps - 1)
        centre = 300 + 3500 * np.sin(np.pi * k)
        out[edges[i] : edges[i + 1]] = bandpass(raw[edges[i] - min(edges[i], 2000) : edges[i + 1]], centre * 0.6, centre * 1.6)[
            min(edges[i], 2000) :
        ]
    return out * shape * 0.5


def chime(note):
    length = 2.2
    t = seconds(length)
    f = midi(note)
    mod = np.sin(2 * np.pi * f * 3.5 * t) * 2.2 * np.exp(-t * 3)
    bell = np.sin(2 * np.pi * f * t + mod) * np.exp(-t * 2.2)
    shimmer = np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 4) * 0.3
    return (bell + shimmer) * 0.25


def pluck(note, length=0.35, bright=1.0):
    t = seconds(length)
    raw = supersaw(midi(note), length, voices=3, spread=0.006)
    return sweep_filter(raw, 400 + 5000 * bright, 400, steps=16) * np.exp(-t * 9) * 0.35


def pad(notes, length, cutoff=(500, 2200), attack=0.6, release=1.2):
    out = np.zeros(int(SR * length))
    for n in notes:
        out += supersaw(midi(n), length, voices=5, spread=0.01)
    out /= len(notes)
    out = sweep_filter(out, cutoff[0], cutoff[1], steps=48)
    return out * adsr(length, attack, 0.01, 1.0, release)


def bass(note, length):
    t = seconds(length)
    raw = saw(midi(note), length) * 0.6 + np.sin(2 * np.pi * midi(note) * t) * 0.8
    return lowpass(raw, 420) * adsr(length, 0.004, 0.12, 0.7, 0.03) * 0.5


# ─── The cue sheet from the renderer ─────────────────────────────────────────

events = json.loads(
    subprocess.check_output(
        ['node', '--input-type=module', '-e', "import { audioEvents } from './timeline.mjs'; console.log(JSON.stringify(audioEvents()))"],
        cwd=HERE,
    )
)

for e in events:
    t = e['t']
    kind = e['type']
    seed = e.get('seed', 0.5)
    if kind == 'flap':
        add(t, flap(seed), e['gain'] * 0.55, pan=(seed - 0.5) * 1.2, wet=0.12)
    elif kind == 'key':
        add(t, key(seed), 0.7, pan=(seed - 0.5) * 0.4, wet=0.08)
    elif kind == 'glitch':
        add(t, glitch(seed), 1.0, pan=(seed - 0.5) * 1.4, wet=0.3)
    elif kind == 'collapse':
        add(t, whoosh(0.9)[::-1].copy(), 0.8, wet=0.5)
        add(t, tom(60, 1.5), 0.7, wet=0.5)
    elif kind == 'thud':
        add(t, tom(80, 1.0), 0.55, wet=0.6)
    elif kind == 'impact':
        add(t, impact(e['size']), 1.0, wet=0.7)
    elif kind == 'hit':
        add(t, hit(e['size']), 1.0, wet=0.5)
    elif kind == 'tick':
        add(t, tick(), 0.8, pan=0.3, wet=0.5)
    elif kind == 'whoosh':
        add(t, whoosh(e['length']), 0.7, wet=0.4)
    elif kind == 'chime':
        add(t, chime(e['note']), 1.0, wet=0.8)

# ─── Act I: the drone, the unease, the riser ────────────────────────────────

drone = pad([33, 45, 52], 10.2, cutoff=(150, 900), attack=2.5, release=0.3)
add(0, drone, 0.55, wet=0.5)
t = seconds(10.2)
sub = np.sin(2 * np.pi * 55 * t) * adsr(10.2, 3, 0.01, 1, 0.2)
add(0, sub, 0.25, wet=0)
# A detuned semitone rub that grows with the toasts.
rub_len = 3.8
rub = pad([58, 57 + 12], rub_len, cutoff=(600, 2500), attack=2.8, release=0.1)
add(3.3, rub * np.linspace(0.2, 1, len(rub)), 0.25, wet=0.6)

riser_len = 1.4
t = seconds(riser_len)
riser = sweep_filter(noise(riser_len), 300, 9000, steps=48) * np.linspace(0, 1, len(t)) ** 2
tone = np.sin(2 * np.pi * np.cumsum(200 * 6 ** (t / riser_len)) / SR) * np.linspace(0, 1, len(t)) ** 3
add(8.6, riser * 0.35 + tone * 0.15, 1.0, wet=0.5)

# The held breath before the drop: a reversed swell.
swell = impact(0.8)[: int(SR * 0.9)][::-1].copy()
add(DROP - 0.9, swell * np.linspace(0, 1, len(swell)) ** 2, 0.5, wet=0.6)
soft = pad([45, 52, 57], 2.0, cutoff=(200, 700), attack=1.2, release=0.4)
add(10.0, soft, 0.25, wet=0.6)

# ─── Acts II–IV: the groove ─────────────────────────────────────────────────

PROGRESSION = [  # (bass, pad voicing, arpeggio tones), one bar each
    (45, [57, 60, 64, 69], [69, 72, 76, 81]),  # Am
    (41, [53, 57, 60, 65], [65, 69, 72, 77]),  # F
    (48, [55, 60, 64, 67], [67, 72, 76, 79]),  # C
    (43, [55, 59, 62, 67], [67, 71, 74, 79]),  # G
]

kicks = []
bar_start = DROP
bar = 0
while bar_start < 43.3:
    bass_note, voicing, arp = PROGRESSION[bar % 4]
    energy = 0 if bar_start < 18 else 1 if bar_start < 32 else 2

    add(bar_start, pad(voicing, 2.05, cutoff=(700, 1800 + energy * 900), attack=0.08, release=0.25), 0.34 + 0.06 * energy, wet=0.35)

    for beat in range(4):
        bt = bar_start + beat * BEAT
        if bt >= 43.3 or (17.45 <= bt < 18):
            continue
        # Half-time kicks for the first bars after the drop, then four on the floor.
        if bar_start < 14 and beat % 2:
            continue
        kicks.append(bt)
        add(bt, kick(), 0.85, wet=0.05)
        if energy >= 1 and beat % 2 == 1:
            add(bt, clap(), 0.8, wet=0.35)
        for eighth in (0, 0.25):
            if bar_start >= 14 or energy:
                add(bt + eighth, hat(open_=eighth > 0 and energy == 2), 0.9 if eighth else 0.5, pan=0.25, wet=0.05)
        if energy == 2:
            for sixteenth in (0.125, 0.375):
                add(bt + sixteenth, hat(), 0.35, pan=-0.25, wet=0.05)

    # Bass pulses in eighths once the journey starts, whole notes before.
    if energy == 0:
        add(bar_start, bass(bass_note, 2.0), 0.9, wet=0)
    else:
        for i in range(8):
            bt = bar_start + i * 0.25
            if bt < 43.3:
                add(bt + 0.02, bass(bass_note + (12 if i % 2 else 0), 0.22), 0.9, wet=0)

    if energy >= 1:
        for i in range(16):
            bt = bar_start + i * 0.125
            if bt >= 43.3:
                break
            note = arp[[0, 1, 2, 3, 2, 1, 2, 3][i % 8]] + (12 if energy == 2 and i % 4 == 3 else 0)
            add(bt, pluck(note, 0.3, bright=0.5 + 0.5 * (i % 4 == 0)), 0.55, pan=0.45 * np.sin(i), wet=0.35)

    bar_start += 2.0
    bar += 1

# Sidechain the music bed to the kick so the drums punch through.
duck = np.ones(N)
for k in kicks:
    start = int(k * SR)
    length = int(0.3 * SR)
    end = min(N, start + length)
    curve = 1 - 0.55 * np.exp(-np.arange(end - start) / (0.07 * SR))
    duck[start:end] = np.minimum(duck[start:end], curve)

# ─── Act V: gather, hit, resolve ────────────────────────────────────────────

gather_len = FINALE - 44.0
t = seconds(gather_len)
up = sweep_filter(noise(gather_len), 200, 12000, steps=48) * (t / gather_len) ** 3
climb = np.sin(2 * np.pi * np.cumsum(110 * 8 ** (t / gather_len) ** 2) / SR) * (t / gather_len) ** 2
add(44.0, up * 0.45 + climb * 0.12, 1.0, wet=0.6)

final_len = DURATION - FINALE
add(FINALE, pad([36, 48, 55, 60, 64, 67, 74], final_len, cutoff=(2800, 900), attack=0.02, release=4.0), 0.8, wet=0.7)
t = seconds(final_len)
add(FINALE, np.sin(2 * np.pi * 65.4 * t) * np.exp(-t * 0.35) * adsr(final_len, 0.01, 0.01, 1, 3), 0.35, wet=0)
for i in range(28):
    bt = 47.5 + i * 0.25
    if bt > 54.5:
        break
    note = [72, 76, 79, 84, 86, 84, 79, 76][i % 8]
    add(bt, pluck(note, 0.5, bright=0.4), 0.6 * (1 - (bt - 47.5) / 9), pan=0.5 * np.sin(i * 1.3), wet=0.6)

# ─── Mix ─────────────────────────────────────────────────────────────────────

ir_len = 3.0
t = seconds(ir_len)
ir = np.stack([rng.standard_normal(len(t)), rng.standard_normal(len(t))], axis=1)
ir *= np.exp(-t * 2.3)[:, None]
ir = lowpass(ir, 6000)
ir[: int(0.012 * SR)] = 0
wet = np.stack([signal.fftconvolve(send[:, c], ir[:, c])[:N] for c in range(2)], axis=1)
wet /= np.max(np.abs(wet)) + 1e-9

# The music bed (everything but kicks) is ducked; applying it to the whole mix
# after the fact keeps this simple and still sounds like a pumping sidechain.
mix = dry * duck[:, None] ** 0.6 + wet * 0.35 * duck[:, None]
mix = highpass(mix, 25)
mix = np.tanh(mix * 1.1)
mix /= np.max(np.abs(mix))
mix *= 10 ** (-1 / 20)
fade = np.ones(N)
fade[-int(SR * 1.2) :] = np.linspace(1, 0, int(SR * 1.2)) ** 2
mix *= fade[:, None]

out = sys.argv[1] if len(sys.argv) > 1 else 'soundtrack.wav'
wavfile.write(out, SR, (mix * 32767).astype(np.int16))
print(out)
