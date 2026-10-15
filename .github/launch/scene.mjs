/*
 * Draws one frame of the launch film on a 1920×1080 canvas, as a pure function
 * of time. Nothing here keeps state between frames, so any frame can be
 * rendered on its own and the film is the same every time it is rendered.
 */

import {
  CALLOUTS,
  CODE,
  DROP,
  DURATION,
  FINALE_HIT,
  HARD_WORDS,
  HEIGHT,
  MANIFESTO,
  PACKETS,
  SLAMS,
  TOAST_COLLAPSE,
  TOASTS,
  TYPE,
  WAYS,
  WIDTH,
  BOARD_COLUMNS,
  BOARD_ROWS,
  boardRows,
  boardingRow,
  flapState,
  hash,
  heroCode,
  terminalCode,
  typedText,
} from './timeline.mjs'

/* ─── Palette, straight from apps/website/app/globals.css ───────────────── */

const C = {
  canvas: '#0a0a0a',
  surface: '#111111',
  surfaceMuted: '#171716',
  ink: '#f3efe4',
  inkMuted: '#b3ada1',
  inkFaint: '#7f7a70',
  line: '#262624',
  lineStrong: '#3d3b36',
  accent: '#ffb000',
  accentBright: '#ffcf4d',
  accentInk: '#0a0a0a',
  ok: '#6fe3a1',
  danger: '#ff5a4a',
}

const DISPLAY = 'Display'
const MONO = 'Mono'

/* ─── Maths ──────────────────────────────────────────────────────────────── */

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const lerp = (a, b, k) => a + (b - a) * k
const range = (t, a, b) => clamp((t - a) / (b - a))
const easeOutCubic = (k) => 1 - (1 - k) ** 3
const easeInCubic = (k) => k ** 3
const easeInOutCubic = (k) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2)
const easeOutExpo = (k) => (k >= 1 ? 1 : 1 - 2 ** (-10 * k))
const easeInExpo = (k) => (k <= 0 ? 0 : 2 ** (10 * k - 10))
const easeOutBack = (k) => 1 + 2.4 * (k - 1) ** 3 + 1.4 * (k - 1) ** 2
/** Fades in over [a, b] and out over [c, d]. */
const envelope = (t, a, b, c, d) => Math.min(range(t, a, b), 1 - range(t, c, d))

function bezier(p, k) {
  const u = 1 - k
  return {
    x: u ** 3 * p[0].x + 3 * u * u * k * p[1].x + 3 * u * k * k * p[2].x + k ** 3 * p[3].x,
    y: u ** 3 * p[0].y + 3 * u * u * k * p[1].y + 3 * u * k * k * p[2].y + k ** 3 * p[3].y,
  }
}

/* ─── Drawing helpers ────────────────────────────────────────────────────── */

function font(ctx, family, weight, size, spacing = 0) {
  ctx.font = `${weight} ${size}px ${family}`
  ctx.letterSpacing = `${spacing}px`
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

function text(ctx, value, x, y, { color = C.ink, align = 'left', baseline = 'alphabetic', alpha = 1, glow = 0 } = {}) {
  if (alpha <= 0) return
  ctx.save()
  ctx.globalAlpha *= alpha
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = baseline
  if (glow) {
    ctx.shadowColor = color
    ctx.shadowBlur = glow
  }
  ctx.fillText(value, x, y)
  ctx.restore()
}

/** Text drawn as runs of different colours, laid out from a left edge or a centre. */
function runs(ctx, parts, x, y, { align = 'left', alpha = 1 } = {}) {
  const widths = parts.map(([value]) => ctx.measureText(value).width)
  const total = widths.reduce((a, b) => a + b, 0)
  let cursor = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x
  parts.forEach(([value, color, glow], i) => {
    text(ctx, value, cursor, y, { color, alpha, glow })
    cursor += widths[i]
  })
  return total
}

/* ─── The split-flap tile ────────────────────────────────────────────────── */

function tileFace(ctx, x, y, w, h, character, half, { color, lit }) {
  ctx.save()
  ctx.beginPath()
  if (half === 'top') ctx.rect(x - 2, y - 2, w + 4, h / 2 + 2)
  else if (half === 'bottom') ctx.rect(x - 2, y + h / 2, w + 4, h / 2 + 2)
  else ctx.rect(x - 2, y - 2, w + 4, h + 4)
  ctx.clip()

  const r = Math.max(2, w * 0.07)
  const body = ctx.createLinearGradient(0, y, 0, y + h)
  body.addColorStop(0, '#262523')
  body.addColorStop(0.496, '#1c1b19')
  body.addColorStop(0.504, '#111110')
  body.addColorStop(1, '#181816')
  roundRect(ctx, x, y, w, h, r)
  ctx.fillStyle = body
  ctx.fill()

  if (character !== ' ') {
    font(ctx, MONO, 700, h * 0.64)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = color
    ctx.shadowColor = color === C.accent ? 'rgba(255,176,0,0.55)' : 'rgba(255,255,255,0.12)'
    ctx.shadowBlur = h * 0.18 * lit
    ctx.fillText(character, x + w / 2, y + h / 2 + h * 0.03)
  } else {
    font(ctx, MONO, 700, h * 0.4)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = C.lineStrong
    ctx.fillText('·', x + w / 2, y + h / 2)
  }
  ctx.restore()
}

/**
 * A departure-board tile mid-flip. The top half already shows the next
 * character, the bottom half still the previous one, and the leaf falls over
 * the hinge between them: first the old top folding down, then the new bottom.
 */
function flapTile(ctx, x, y, w, h, { prev, next, p }, { color = C.accent, lit = 1 } = {}) {
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.9)'
  ctx.shadowBlur = h * 0.25
  ctx.shadowOffsetY = h * 0.08
  roundRect(ctx, x, y, w, h, Math.max(2, w * 0.07))
  ctx.fillStyle = '#111110'
  ctx.fill()
  ctx.restore()

  const style = { color, lit }
  if (p >= 1) {
    tileFace(ctx, x, y, w, h, next, 'full', style)
  } else {
    const hinge = y + h / 2
    tileFace(ctx, x, y, w, h, next, 'top', style)
    tileFace(ctx, x, y, w, h, prev, 'bottom', style)
    const fold = Math.cos(p * Math.PI)
    ctx.save()
    ctx.translate(0, hinge)
    ctx.scale(1, Math.max(0.001, Math.abs(fold)))
    ctx.translate(0, -hinge)
    if (fold > 0) tileFace(ctx, x, y, w, h, prev, 'top', style)
    else tileFace(ctx, x, y, w, h, next, 'bottom', style)
    // The leaf darkens as it turns edge-on to the light.
    ctx.globalAlpha = (1 - Math.abs(fold)) * 0.75
    ctx.fillStyle = '#000'
    ctx.fillRect(x, fold > 0 ? y : hinge, w, h / 2)
    ctx.restore()
  }

  ctx.fillStyle = '#050505'
  ctx.fillRect(x, y + h / 2 - Math.max(1, h * 0.008), w, Math.max(1.5, h * 0.016))
  ctx.fillStyle = 'rgba(255,255,255,0.05)'
  ctx.fillRect(x + 1, y + 1, w - 2, 1)
}

function flapRowAt(ctx, tiles, t, x, y, w, h, gap, { groupAt = 0, groupGap = 0, colorOf, lit = 1 } = {}) {
  let cursor = x
  tiles.forEach((tile, i) => {
    const state = flapState(tile, t)
    const color = colorOf ? colorOf(i, state.next) : C.accent
    flapTile(ctx, cursor, y, w, h, state, { color, lit })
    cursor += w + gap + (groupAt && i === groupAt - 1 ? groupGap : 0)
  })
}

/* ─── The logo, as apps/website/components/logo.tsx draws it ────────────── */

function logo(ctx, cx, cy, size, { arrow = 1, perforation = 1, glow = 0 } = {}) {
  const s = size / 32
  ctx.save()
  ctx.translate(cx - size / 2, cy - size / 2)
  ctx.save()
  ctx.shadowColor = 'rgba(255,176,0,0.8)'
  ctx.shadowBlur = glow
  roundRect(ctx, 0, 0, size, size, 5 * s)
  ctx.fillStyle = C.accent
  ctx.fill()
  ctx.restore()

  ctx.strokeStyle = C.accentInk
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (arrow > 0) {
    ctx.lineWidth = 2.8 * s
    const shaft = 12 * s
    const head = 7.78 * s * 2
    const total = shaft + head
    ctx.setLineDash([total * arrow, total])
    ctx.beginPath()
    ctx.moveTo(10 * s, 16 * s)
    ctx.lineTo(22 * s, 16 * s)
    ctx.stroke()
    ctx.setLineDash([Math.max(0, total * arrow - shaft), total])
    ctx.beginPath()
    ctx.moveTo(16.5 * s, 10.5 * s)
    ctx.lineTo(22 * s, 16 * s)
    ctx.lineTo(16.5 * s, 21.5 * s)
    if (arrow * total > shaft) ctx.stroke()
  }
  if (perforation > 0) {
    ctx.setLineDash([])
    ctx.fillStyle = C.accentInk
    for (let i = 0; i < 5; i++) {
      const k = clamp(perforation * 5 - i)
      if (k <= 0) continue
      ctx.beginPath()
      ctx.arc(7.5 * s, (6.5 + 0.5 + i * 4) * s, 0.8 * s * easeOutBack(k), 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

/* ─── Atmosphere ─────────────────────────────────────────────────────────── */

let grain = []
let vignette = null

function prepare() {
  if (vignette) return
  vignette = new OffscreenCanvas(WIDTH, HEIGHT)
  const v = vignette.getContext('2d')
  const g = v.createRadialGradient(WIDTH / 2, HEIGHT / 2, HEIGHT * 0.35, WIDTH / 2, HEIGHT / 2, WIDTH * 0.72)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, 'rgba(0,0,0,0.78)')
  v.fillStyle = g
  v.fillRect(0, 0, WIDTH, HEIGHT)

  for (let n = 0; n < 6; n++) {
    const c = new OffscreenCanvas(WIDTH / 2, HEIGHT / 2)
    const g2 = c.getContext('2d')
    const img = g2.createImageData(c.width, c.height)
    for (let i = 0; i < img.data.length; i += 4) {
      const value = hash('grain', n, i) * 255
      img.data[i] = img.data[i + 1] = img.data[i + 2] = value
      img.data[i + 3] = 255
    }
    g2.putImageData(img, 0, 0)
    grain.push(c)
  }
}

/** Amber dust drifting through the dark, denser once the code has landed. */
function dust(ctx, t, amount, pull = 0) {
  if (amount <= 0) return
  ctx.save()
  for (let i = 0; i < 90; i++) {
    const depth = 0.3 + hash('d', i, 'z') * 0.7
    const speed = 8 + depth * 22
    let x = (hash('d', i, 'x') * (WIDTH + 200) + t * speed * (hash('d', i, 'v') - 0.3)) % (WIDTH + 200)
    let y = (hash('d', i, 'y') * (HEIGHT + 200) - t * speed * 0.6) % (HEIGHT + 200)
    if (x < 0) x += WIDTH + 200
    if (y < 0) y += HEIGHT + 200
    x -= 100
    y -= 100
    if (pull) {
      x = lerp(x, WIDTH / 2, pull * depth)
      y = lerp(y, HEIGHT / 2, pull * depth)
    }
    const twinkle = 0.5 + 0.5 * Math.sin(t * (1 + depth * 2) + i)
    ctx.globalAlpha = amount * depth * (0.25 + 0.5 * twinkle)
    ctx.fillStyle = i % 5 === 0 ? C.accentBright : C.accent
    ctx.beginPath()
    ctx.arc(x, y, 0.8 + depth * 2.2, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/** A faint grid of perforation holes, the texture of a ticket. */
function perforationGrid(ctx, alpha, offset = 0) {
  if (alpha <= 0) return
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = C.lineStrong
  for (let y = 30; y < HEIGHT; y += 48) {
    for (let x = 30 + (((offset % 48) + 48) % 48) - 48; x < WIDTH + 48; x += 48) {
      ctx.beginPath()
      ctx.arc(x, y, 1.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

function glowSpot(ctx, x, y, radius, alpha, color = '255,176,0') {
  if (alpha <= 0) return
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius)
  g.addColorStop(0, `rgba(${color},${alpha})`)
  g.addColorStop(1, `rgba(${color},0)`)
  ctx.fillStyle = g
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
}

function shockwave(ctx, t, at, x, y, { size = 1, color = '255,176,0' } = {}) {
  const k = (t - at) / 0.9
  if (k < 0 || k > 1) return
  ctx.save()
  for (const [delay, width] of [
    [0, 10],
    [0.12, 4],
  ]) {
    const q = clamp((k - delay) / (1 - delay))
    if (q <= 0) continue
    ctx.globalAlpha = (1 - q) ** 2 * 0.8
    ctx.strokeStyle = `rgb(${color})`
    ctx.lineWidth = width * (1 - q) + 1
    ctx.beginPath()
    ctx.arc(x, y, easeOutCubic(q) * 900 * size, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()
}

/* ─── Camera ─────────────────────────────────────────────────────────────── */

const SHAKES = [
  { at: TOAST_COLLAPSE, size: 0.5 },
  { at: DROP, size: 1.2 },
  ...SLAMS.map((s) => ({ at: s.at, size: 0.35 })),
  ...MANIFESTO.map((s) => ({ at: s.at, size: 0.55 })),
  { at: FINALE_HIT, size: 1.4 },
]

function shake(t) {
  let x = 0
  let y = 0
  for (const s of SHAKES) {
    const dt = t - s.at
    if (dt < 0 || dt > 0.8) continue
    const a = s.size * 16 * Math.exp(-dt * 8)
    x += Math.sin(dt * 90 + s.at) * a
    y += Math.cos(dt * 77 + s.at * 3) * a
  }
  return { x, y }
}

const FLASHES = [
  { at: TOAST_COLLAPSE, size: 0.15, color: '255,90,74' },
  { at: DROP, size: 0.45, color: '255,190,60' },
  { at: 17.95, size: 0.9, color: '255,230,180' },
  ...SLAMS.map((s) => ({ at: s.at, size: 0.1, color: '255,176,0' })),
  { at: 32, size: 0.35, color: '255,207,77' },
  ...MANIFESTO.map((s) => ({ at: s.at, size: 0.22, color: '255,176,0' })),
  { at: FINALE_HIT, size: 0.75, color: '255,214,120' },
]

function flash(ctx, t) {
  for (const f of FLASHES) {
    const dt = t - f.at
    if (dt < -0.03 || dt > 0.7) continue
    const a = dt < 0 ? f.size * (1 + dt / 0.03) : f.size * Math.exp(-dt * 7)
    ctx.fillStyle = `rgba(${f.color},${a})`
    ctx.fillRect(0, 0, WIDTH, HEIGHT)
  }
}

/** Runs `draw` inside a camera that zooms by `zoom` around (cx, cy). */
function camera(ctx, zoom, cx, cy, draw) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(zoom, zoom)
  ctx.translate(-cx, -cy)
  draw()
  ctx.restore()
}

/* ─── Act I: the friction ────────────────────────────────────────────────── */

function cursor(ctx, x, y, h, t, solid) {
  if (!solid && Math.floor(t * 2.2) % 2 === 1) return
  ctx.fillStyle = C.accent
  ctx.save()
  ctx.shadowColor = C.accent
  ctx.shadowBlur = 14
  ctx.fillRect(x + 4, y - h * 0.78, h * 0.5, h * 0.95)
  ctx.restore()
}

function toast(ctx, item, t, k) {
  font(ctx, DISPLAY, 500, 27)
  const w = ctx.measureText(item.text).width + 118
  const h = 70
  const age = t - item.at
  const pop = easeOutBack(clamp(age / 0.28))
  const jitter = age < 0.18 ? (hash(item.text, Math.floor(t * 60)) - 0.5) * 26 : 0

  ctx.save()
  ctx.translate(item.x + w / 2 + jitter, item.y + h / 2)
  ctx.rotate((hash(item.text, 'r') - 0.5) * 0.05)
  ctx.scale(lerp(0.85, 1, pop), lerp(0.85, 1, pop))

  if (k > 0) {
    // Collapsing: every toast drops out of frame, tumbling.
    const fall = easeInCubic(k)
    ctx.translate((hash(item.text, 'fx') - 0.5) * 200 * k, fall * (900 + hash(item.text, 'fy') * 500))
    ctx.rotate((hash(item.text, 'fr') - 0.5) * 2.2 * fall)
  }
  ctx.globalAlpha = clamp(age / 0.08) * (1 - clamp(k * 1.4 - 0.4))

  const draw = (dx, color) => {
    ctx.save()
    ctx.translate(dx, 0)
    ctx.shadowColor = 'rgba(0,0,0,0.8)'
    ctx.shadowBlur = 30
    ctx.shadowOffsetY = 12
    roundRect(ctx, -w / 2, -h / 2, w, h, 8)
    ctx.fillStyle = color ?? '#171716'
    ctx.fill()
    ctx.shadowColor = 'transparent'
    ctx.strokeStyle = color ? 'transparent' : '#2e2d2a'
    ctx.lineWidth = 1.5
    ctx.stroke()
    if (!color) {
      const ix = -w / 2 + 44
      if (item.kind === 'error') {
        ctx.fillStyle = C.danger
        ctx.beginPath()
        ctx.arc(ix, 0, 13, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#171716'
        ctx.fillRect(ix - 1.8, -7, 3.6, 8.5)
        ctx.fillRect(ix - 1.8, 3.5, 3.6, 3.6)
      } else if (item.kind === 'wait') {
        ctx.strokeStyle = C.inkFaint
        ctx.lineWidth = 3.5
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.arc(ix, 0, 11, t * 7, t * 7 + Math.PI * 1.4)
        ctx.stroke()
      } else {
        ctx.strokeStyle = C.inkMuted
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(ix, -4, 6.5, Math.PI, 0)
        ctx.stroke()
        ctx.fillStyle = C.inkMuted
        roundRect(ctx, ix - 10, -4, 20, 15, 3)
        ctx.fill()
      }
      font(ctx, DISPLAY, 500, 27)
      text(ctx, item.text, -w / 2 + 80, 1, { color: C.ink, baseline: 'middle' })
    }
    ctx.restore()
  }

  if (age < 0.22) {
    // Chromatic split while the toast glitches in.
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha *= 0.55
    draw(-10 * (1 - age / 0.22), 'rgba(255,40,40,0.5)')
    draw(10 * (1 - age / 0.22), 'rgba(40,200,255,0.5)')
    ctx.restore()
  }
  draw(0)
  ctx.restore()
}

function intro(ctx, t) {
  const stress = range(t, 3.4, 6.9) * (1 - range(t, 7.0, 7.6))
  glowSpot(ctx, WIDTH / 2, HEIGHT / 2, 900, stress * 0.12, '255,60,50')
  dust(ctx, t, 0.35 * (1 - range(t, 3.4, 5)))

  const lines = 1 - range(t, 3.3, 4.2) * 0.7 - range(t, TOAST_COLLAPSE, TOAST_COLLAPSE + 0.3) * 0.3
  font(ctx, MONO, 500, 46)
  const x = WIDTH / 2 - ctx.measureText(TYPE.kinds.text).width / 2
  const first = typedText(TYPE.every, t)
  const second = typedText(TYPE.kinds, t)
  ctx.save()
  ctx.globalAlpha = lines
  text(ctx, first, x, 500, { color: C.ink })
  font(ctx, MONO, 500, 46)
  text(ctx, second, x, 572, { color: C.inkMuted })
  const typing = t < TYPE.every.end + 0.1 ? [first, 500] : [second, 572]
  const onSecond = t >= TYPE.kinds.start
  font(ctx, MONO, 500, 46)
  const cx = x + ctx.measureText(onSecond ? second : typing[0]).width
  const solid = (t > TYPE.every.start && t < TYPE.every.end) || (t > TYPE.kinds.start && t < TYPE.kinds.end)
  if (t < 3.6) cursor(ctx, cx, onSecond ? 572 : 500, 46, t, solid)
  ctx.restore()

  const collapse = range(t, TOAST_COLLAPSE, TOAST_COLLAPSE + 0.95)
  for (const item of TOASTS) {
    if (t < item.at || collapse >= 1) continue
    toast(ctx, item, t, collapse)
  }

  // "Why is it still this hard?"
  const out = range(t, 9.1, 9.8)
  if (t > HARD_WORDS[0].at && out < 1) {
    font(ctx, DISPLAY, 800, 132, -4)
    const space = ctx.measureText(' ').width
    const widths = HARD_WORDS.map((w) => ctx.measureText(w.text).width)
    const total = widths.reduce((a, b) => a + b, 0) + space * (HARD_WORDS.length - 1)
    let cursorX = WIDTH / 2 - total / 2
    ctx.save()
    ctx.globalAlpha = 1 - out
    camera(ctx, 1 + range(t, 7.3, 9.8) * 0.06, WIDTH / 2, HEIGHT / 2, () => {
      HARD_WORDS.forEach((word, i) => {
        const k = range(t, word.at, word.at + 0.22)
        if (k > 0) {
          const last = i === HARD_WORDS.length - 1
          ctx.save()
          const s = lerp(1.35, 1, easeOutExpo(k))
          ctx.translate(cursorX + widths[i] / 2, 580)
          ctx.scale(s, s)
          font(ctx, DISPLAY, 800, 132, -4)
          text(ctx, word.text, 0, 0, {
            color: last ? C.ink : C.inkMuted,
            align: 'center',
            alpha: k,
          })
          ctx.restore()
        }
        cursorX += widths[i] + space
      })
    })
    ctx.restore()
  }
}

/* ─── Act II: eight characters ───────────────────────────────────────────── */

const HERO = { w: 150, h: 212, gap: 14, groupGap: 54, y: 430 }
HERO.width = 8 * HERO.w + 6 * HERO.gap + HERO.groupGap
HERO.x = (WIDTH - HERO.width) / 2

function heroTileX(i) {
  return HERO.x + i * (HERO.w + HERO.gap) + (i >= 4 ? HERO.groupGap - HERO.gap : 0)
}

function reveal(ctx, t) {
  const pre = range(t, 11.2, DROP)
  const zoomOut = easeInExpo(range(t, 17.1, 17.95))
  const zoom = 1 + (t > DROP ? (t - DROP) * 0.008 : 0) + zoomOut * 7
  const focusX = (heroTileX(3) + HERO.w + heroTileX(4)) / 2

  perforationGrid(ctx, range(t, DROP, DROP + 1) * 0.35 * (1 - zoomOut), (t - DROP) * 6)
  dust(ctx, t, 0.3 + range(t, DROP, DROP + 0.5) * 0.5, pre * 0.3 * (t < DROP ? 1 : 0))
  glowSpot(ctx, WIDTH / 2, HERO.y + HERO.h / 2, 700 + pre * 300, pre * 0.2 + (t >= DROP ? 0.09 : 0))

  camera(ctx, zoom, focusX, HERO.y + HERO.h / 2, () => {
    font(ctx, MONO, 500, 40)
    const whatif = typedText(TYPE.whatif, t)
    const wx = WIDTH / 2 - ctx.measureText(TYPE.whatif.text + '…').width / 2
    const fade = 1 - range(t, 14.3, 14.7)
    text(ctx, whatif + (t > TYPE.whatif.end + 0.2 ? '…' : ''), wx, 340, { color: C.inkMuted, alpha: fade })
    if (t < DROP) cursor(ctx, wx + ctx.measureText(whatif).width, 340, 40, t, t < TYPE.whatif.end)

    if (t >= DROP) {
      heroCode.forEach((tile, i) => {
        const land = range(t, tile.from - 0.02, tile.from + 0.16)
        if (land <= 0) return
        const x = heroTileX(i)
        const s = lerp(1.7, 1, easeOutExpo(land))
        ctx.save()
        ctx.globalAlpha = land
        ctx.translate(x + HERO.w / 2, HERO.y + HERO.h / 2)
        ctx.scale(s, s)
        ctx.translate(-(x + HERO.w / 2), -(HERO.y + HERO.h / 2))
        flapTile(ctx, x, HERO.y, HERO.w, HERO.h, flapState(tile, t), { lit: 1 + 0.3 * Math.sin(t * 3 + i) })
        ctx.restore()
      })
    }

    const headline = range(t, 13.55, 14.05)
    if (headline > 0) {
      ctx.save()
      ctx.globalAlpha = headline
      ctx.translate(0, (1 - easeOutCubic(headline)) * 30)
      font(ctx, DISPLAY, 800, 96, -3)
      runs(
        ctx,
        [
          ['Eight', C.accent, 30],
          [' characters.', C.ink],
        ],
        WIDTH / 2,
        850,
        { align: 'center' },
      )
      ctx.restore()
    }

    const anchors = [
      { x: heroTileX(0), y: HERO.y, dir: -1, align: 'left' },
      { x: heroTileX(7) + HERO.w, y: HERO.y, dir: -1, align: 'right' },
      { x: heroTileX(0), y: HERO.y + HERO.h, dir: 1, align: 'left' },
      { x: heroTileX(7) + HERO.w, y: HERO.y + HERO.h, dir: 1, align: 'right' },
    ]
    CALLOUTS.forEach((callout, i) => {
      const k = range(t, callout.at, callout.at + 0.35)
      if (k <= 0) return
      const a = anchors[i]
      const len = 44 * easeOutCubic(k)
      ctx.save()
      ctx.globalAlpha = 1 - range(t, 16.9, 17.2)
      ctx.strokeStyle = C.accent
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(a.x + (a.align === 'left' ? 6 : -6), a.y + a.dir * 12)
      ctx.lineTo(a.x + (a.align === 'left' ? 6 : -6), a.y + a.dir * (12 + len))
      ctx.stroke()
      ctx.fillStyle = C.accent
      ctx.beginPath()
      ctx.arc(a.x + (a.align === 'left' ? 6 : -6), a.y + a.dir * 12, 4, 0, Math.PI * 2)
      ctx.fill()
      font(ctx, MONO, 600, 24, 3)
      const shown = callout.text
        .toUpperCase()
        .slice(0, Math.ceil(callout.text.length * range(t, callout.at + 0.05, callout.at + 0.4)))
      text(ctx, shown, a.x + (a.align === 'left' ? 22 : -22), a.y + a.dir * (12 + len) + (a.dir > 0 ? 8 : 6), {
        color: C.inkMuted,
        align: a.align,
        baseline: a.dir > 0 ? 'top' : 'bottom',
      })
      ctx.restore()
    })
  })

  shockwave(ctx, t, DROP, WIDTH / 2, HERO.y + HERO.h / 2, { size: 1.2 })
}

/* ─── Act III: the journey ───────────────────────────────────────────────── */

const TERM = { w: 760, h: 380, y: 610, ax: 110, bx: 1050 }
const BUCKET = { x: 960, y: 270, scale: 1.3 }
const PATH_UP = [
  { x: TERM.ax + 380, y: TERM.y - 70 },
  { x: TERM.ax + 380, y: 300 },
  { x: 700, y: BUCKET.y },
  { x: BUCKET.x - 140, y: BUCKET.y },
]
const PATH_DOWN = [
  { x: BUCKET.x + 140, y: BUCKET.y },
  { x: 1220, y: BUCKET.y },
  { x: TERM.bx + 380, y: 300 },
  { x: TERM.bx + 380, y: TERM.y - 70 },
]

function terminal(ctx, x, y, w, h, title, label) {
  font(ctx, DISPLAY, 700, 22, 5)
  text(ctx, label, x, y - 26, { color: C.inkFaint })
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.9)'
  ctx.shadowBlur = 50
  ctx.shadowOffsetY = 20
  roundRect(ctx, x, y, w, h, 10)
  ctx.fillStyle = C.surface
  ctx.fill()
  ctx.restore()
  roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 10)
  ctx.strokeStyle = C.line
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.fillStyle = C.surfaceMuted
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(x + 1, y + 1, w - 2, 50, [9, 9, 0, 0])
  ctx.fill()
  ctx.restore()
  ctx.fillStyle = C.line
  ctx.fillRect(x, y + 50, w, 1.5)
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = C.lineStrong
    ctx.beginPath()
    ctx.arc(x + 28 + i * 22, y + 26, 6.5, 0, Math.PI * 2)
    ctx.fill()
  }
  font(ctx, MONO, 500, 18)
  text(ctx, title, x + w / 2, y + 32, { color: C.inkFaint, align: 'center' })
}

function bucket(ctx, t, glow) {
  const { x, y } = BUCKET
  const top = 150
  const bottom = 112
  const h = 150
  const rim = 26
  glowSpot(ctx, x, y + 20, 380, 0.1 + glow * 0.35)

  ctx.save()
  ctx.translate(x, y)
  ctx.scale(BUCKET.scale, BUCKET.scale)
  ctx.translate(-x, -y)
  ctx.lineWidth = 3 / BUCKET.scale
  ctx.strokeStyle = C.accent
  ctx.shadowColor = 'rgba(255,176,0,0.8)'
  ctx.shadowBlur = 12 + glow * 40

  const body = ctx.createLinearGradient(x - top, 0, x + top, 0)
  body.addColorStop(0, '#15130f')
  body.addColorStop(0.5, `rgb(${40 + glow * 60},${30 + glow * 40},${10})`)
  body.addColorStop(1, '#15130f')
  ctx.beginPath()
  ctx.moveTo(x - top / 2 - 25, y - h / 2)
  ctx.lineTo(x - bottom / 2 - 18, y + h / 2)
  ctx.ellipse(x, y + h / 2, bottom / 2 + 18, rim * 0.7, 0, Math.PI, 0, true)
  ctx.lineTo(x + top / 2 + 25, y - h / 2)
  ctx.closePath()
  ctx.fillStyle = body
  ctx.fill()
  ctx.stroke()

  ctx.beginPath()
  ctx.ellipse(x, y - h / 2, top / 2 + 25, rim, 0, 0, Math.PI * 2)
  ctx.fillStyle = `rgb(${14 + glow * 90},${12 + glow * 64},${6 + glow * 10})`
  ctx.fill()
  ctx.stroke()
  ctx.restore()

  // The transfer at rest inside the bucket, once it has arrived.
  const stored = range(t, 21.75, 22.2)
  if (stored > 0) {
    font(ctx, MONO, 700, 28, 2)
    text(ctx, CODE, x, y + 30, { color: C.accent, align: 'center', alpha: stored, glow: 16 })
  }

  const below = y + (h / 2) * BUCKET.scale
  font(ctx, DISPLAY, 700, 32, -0.5)
  text(ctx, 'your bucket', x, below + 72, { color: C.ink, align: 'center' })
  font(ctx, MONO, 500, 18, 1)
  text(ctx, 'r2 · transfers/', x, below + 104, { color: C.inkFaint, align: 'center' })
}

function route(ctx, points, t, active) {
  ctx.save()
  ctx.lineWidth = 2
  ctx.setLineDash([2, 10])
  ctx.lineCap = 'round'
  ctx.strokeStyle = C.lineStrong
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  ctx.bezierCurveTo(points[1].x, points[1].y, points[2].x, points[2].y, points[3].x, points[3].y)
  ctx.stroke()
  if (active > 0) {
    ctx.strokeStyle = C.accent
    ctx.globalAlpha = active
    ctx.setLineDash([14, 14])
    ctx.lineDashOffset = -t * 90
    ctx.shadowColor = C.accent
    ctx.shadowBlur = 12
    ctx.stroke()
  }
  ctx.restore()
}

function packet(ctx, points, t, from, to, label) {
  const k = (t - from) / (to - from)
  if (k < 0 || k > 1.05) return
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 40; i >= 0; i--) {
    const q = easeInOutCubic(clamp(k - i * 0.007))
    const p = bezier(points, q)
    const a = (1 - i / 40) ** 2
    ctx.globalAlpha = a * 0.5 * (k > 1 ? 1 - (k - 1) * 20 : 1)
    ctx.fillStyle = i < 3 ? C.accentBright : C.accent
    ctx.beginPath()
    ctx.arc(p.x, p.y, 3 + (1 - i / 40) * 10, 0, Math.PI * 2)
    ctx.fill()
  }
  const head = bezier(points, easeInOutCubic(clamp(k)))
  glowSpot(ctx, head.x, head.y, 90, 0.5 * (k > 1 ? 0 : 1))
  for (let s = 0; s < 18; s++) {
    const life = (t * 3 + hash('spark', s)) % 1
    const q = easeInOutCubic(clamp(k - life * 0.12))
    const p = bezier(points, q)
    ctx.globalAlpha = (1 - life) * 0.8 * (k > 1 ? 0 : 1)
    ctx.fillStyle = C.accentBright
    ctx.beginPath()
    ctx.arc(p.x + (hash('sx', s) - 0.5) * 60 * life, p.y + (hash('sy', s) - 0.5) * 60 * life, 2, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
  if (k <= 1) {
    font(ctx, MONO, 600, 20, 1)
    text(ctx, label, head.x, head.y - 30, { color: C.ink, align: 'center', alpha: Math.min(k * 8, (1 - k) * 8, 1) })
  }
}

function journey(ctx, t) {
  const enter = easeOutCubic(range(t, 18, 18.7))
  const slams = range(t, 26.9, 27.05)
  const bucketGlow = Math.max(Math.exp(-Math.max(0, t - 21.75) * 3) * (t > 21.75 ? 1 : 0), range(t, 29.9, 30.3) * 0.8)

  perforationGrid(ctx, 0.28 * enter, t * 4)
  dust(ctx, t, 0.45)

  camera(ctx, 1 + (t - 18) * 0.004, WIDTH / 2, HEIGHT / 2, () => {
    ctx.save()
    ctx.globalAlpha = range(t, 18.1, 18.8)
    route(ctx, PATH_UP, t, envelope(t, 20.3, 20.5, 21.8, 22.3))
    route(ctx, PATH_DOWN, t, envelope(t, 25.0, 25.2, 26.5, 27))
    ctx.restore()

    ctx.save()
    ctx.globalAlpha = range(t, 18.2, 18.9)
    const s = lerp(0.8, 1, easeOutBack(range(t, 18.2, 18.9)))
    ctx.translate(BUCKET.x, BUCKET.y)
    ctx.scale(s, s)
    ctx.translate(-BUCKET.x, -BUCKET.y)
    bucket(ctx, t, bucketGlow)
    ctx.restore()
    shockwave(ctx, t, 21.75, BUCKET.x, BUCKET.y, { size: 0.35 })
    shockwave(ctx, t, 26.45, TERM.bx + TERM.w / 2, TERM.y + TERM.h / 2, { size: 0.35, color: '111,227,161' })

    // Machine A
    ctx.save()
    ctx.globalAlpha = enter
    ctx.translate(0, (1 - enter) * 80)
    terminal(ctx, TERM.ax, TERM.y, TERM.w, TERM.h, 'you@laptop — zsh', 'YOUR LAPTOP')
    const ax = TERM.ax + 40
    font(ctx, MONO, 500, 30)
    const put = typedText(TYPE.put, t)
    const w = runs(
      ctx,
      [
        ['$ ', C.accent],
        [put, C.ink],
      ],
      ax,
      TERM.y + 112,
    )
    if (t < 20.1) cursor(ctx, ax + w, TERM.y + 112, 30, t, t > TYPE.put.start && t < TYPE.put.end)
    font(ctx, MONO, 500, 24)
    text(ctx, 'report.pdf · 284 kB · expires in 1 day', ax, TERM.y + 170, {
      color: C.inkFaint,
      alpha: range(t, 20.1, 20.2),
    })
    if (t >= 20.28) flapRowAt(ctx, terminalCode, t, ax, TERM.y + 205, 58, 82, 7, { groupAt: 4, groupGap: 16 })
    ctx.restore()

    // Machine B
    const enterB = easeOutCubic(range(t, 18.15, 18.85))
    ctx.save()
    ctx.globalAlpha = enterB
    ctx.translate(0, (1 - enterB) * 80)
    terminal(ctx, TERM.bx, TERM.y, TERM.w, TERM.h, 'you@anywhere — zsh', 'ANY OTHER MACHINE')
    const bx = TERM.bx + 40
    font(ctx, MONO, 500, 30)
    const get = typedText(TYPE.get, t)
    const wb = runs(
      ctx,
      [
        ['$ ', C.accent],
        [get, C.ink],
      ],
      bx,
      TERM.y + 112,
    )
    if (t < 24.85) cursor(ctx, bx + wb, TERM.y + 112, 30, t, t > TYPE.get.start && t < TYPE.get.end)
    font(ctx, MONO, 500, 24)
    runs(
      ctx,
      [
        ['read as ', C.inkFaint],
        [CODE, C.accent, 12],
      ],
      bx,
      TERM.y + 170,
      { alpha: range(t, 24.85, 24.95) },
    )
    const wrote = range(t, 26.45, 26.6)
    if (wrote > 0) {
      font(ctx, MONO, 600, 28)
      runs(
        ctx,
        [
          ['✓ ', C.ok, 14],
          ['Wrote ', C.ink],
          ['report.pdf', C.ok],
          [' · 284 kB', C.inkMuted],
        ],
        bx,
        TERM.y + 250,
        { alpha: wrote },
      )
    }
    ctx.restore()

    packet(ctx, PATH_UP, t, PACKETS[0].from, PACKETS[0].to, 'report.pdf')
    packet(ctx, PATH_DOWN, t, PACKETS[1].from, PACKETS[1].to, 'report.pdf')
  })

  // The captions, slammed over a darkened stage.
  if (slams > 0) {
    const dim = slams * (0.82 - range(t, 29.95, 30.3) * 0.12)
    ctx.fillStyle = `rgba(6,6,6,${dim})`
    ctx.fillRect(0, 0, WIDTH, HEIGHT)
    SLAMS.forEach((slam, i) => {
      const next = SLAMS[i + 1]?.at ?? 31.85
      const k = range(t, slam.at, slam.at + 0.2)
      if (k <= 0 || t > next + 0.25) return
      const leave = range(t, next, next + 0.2)
      const last = i === SLAMS.length - 1
      ctx.save()
      ctx.translate(WIDTH / 2, last ? 640 : HEIGHT / 2 + 50 - leave * 120)
      const s = lerp(1.3, 1, easeOutExpo(k)) * (1 + (t - slam.at) * 0.02)
      ctx.scale(s, s)
      font(ctx, DISPLAY, 800, last ? 150 : 170, -5)
      if (slam.accent) {
        const plain = slam.text.replace(slam.accent, '')
        runs(
          ctx,
          [
            [plain, C.ink],
            [slam.accent, C.accent, 40],
          ],
          0,
          0,
          { align: 'center', alpha: k * (1 - leave) },
        )
      } else {
        text(ctx, slam.text, 0, 0, { align: 'center', baseline: 'middle', alpha: k * (1 - leave) })
      }
      ctx.restore()
    })
  }
}

/* ─── Act IV: the board ──────────────────────────────────────────────────── */

const BOARD = { x: 0, y: 330, w: 35, h: 58, gap: 3, colGap: 26, rowPitch: 86 }
BOARD.width =
  BOARD_COLUMNS.reduce((a, b) => a + b, 0) * (BOARD.w + BOARD.gap) + (BOARD_COLUMNS.length - 1) * BOARD.colGap
BOARD.x = (WIDTH - BOARD.width) / 2

function columnStart(c) {
  let x = BOARD.x
  for (let i = 0; i < c; i++) x += BOARD_COLUMNS[i] * (BOARD.w + BOARD.gap) + BOARD.colGap
  return x
}

function statusColor(status, t) {
  if (status.startsWith('DELIVERED')) return C.ok
  if (status.startsWith('BOARDING')) return Math.floor(t * 2) % 2 ? C.accent : C.accentBright
  return C.ink
}

function board(ctx, t) {
  const zoom = 1.0 + range(t, 32, 37) * 0.025
  dust(ctx, t, 0.3)
  camera(ctx, zoom, WIDTH / 2, 520, () => {
    const head = easeOutCubic(range(t, 32, 32.4))
    ctx.save()
    ctx.globalAlpha = head
    font(ctx, DISPLAY, 800, 92, -3)
    text(ctx, 'Departures', BOARD.x, 200, { color: C.accent, glow: 30 })
    font(ctx, MONO, 600, 22, 3)
    const seconds = String(Math.floor(t) % 60).padStart(2, '0')
    text(ctx, `S3ND · ${'21:4' + Math.floor(t / 60)}:${seconds}`, BOARD.x + BOARD.width, 196, {
      color: C.inkMuted,
      align: 'right',
    })
    ctx.fillStyle = C.accent
    ctx.globalAlpha = head * (0.4 + 0.6 * (Math.floor(t * 2) % 2))
    ctx.beginPath()
    ctx.arc(BOARD.x + BOARD.width - 330, 188, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    ctx.save()
    ctx.globalAlpha = head
    ctx.fillStyle = C.line
    ctx.fillRect(BOARD.x, 236, BOARD.width, 2)
    font(ctx, MONO, 600, 18, 4)
    ;['CODE', 'PAYLOAD', 'VIA', 'STATUS'].forEach((label, c) => {
      text(ctx, label, columnStart(c), 292, { color: C.inkFaint })
    })
    ctx.restore()

    boardRows.forEach((row, r) => {
      const status = BOARD_ROWS[r][3]
      const offsets = []
      BOARD_COLUMNS.forEach((n, c) => {
        for (let i = 0; i < n; i++) offsets.push({ c, x: columnStart(c) + i * (BOARD.w + BOARD.gap) })
      })
      const y = BOARD.y + r * BOARD.rowPitch
      row.forEach((tile, i) => {
        const { c, x } = offsets[i]
        const color = c === 0 ? C.accent : c === 1 ? C.ink : c === 2 ? C.inkMuted : statusColor(status, t)
        flapTile(ctx, x, y, BOARD.w, BOARD.h, flapState(tile, t), { color, lit: c === 0 || c === 3 ? 1 : 0.4 })
      })
    })
  })

  // Providers ticker along the bottom.
  const band = range(t, 33.2, 33.8)
  if (band > 0) {
    ctx.save()
    ctx.globalAlpha = band
    ctx.fillStyle = C.accent
    ctx.fillRect(0, 930, WIDTH, 64)
    font(ctx, MONO, 700, 26, 4)
    const item = 'AWS S3  ✦  CLOUDFLARE R2  ✦  MINIO  ✦  SCALEWAY  ✦  WASABI  ✦  ANY S3-COMPATIBLE STORAGE  ✦  '
    const w = ctx.measureText(item).width
    let x = -((t * 160) % w)
    while (x < WIDTH) {
      text(ctx, item, x, 972, { color: C.accentInk })
      x += w
    }
    ctx.restore()
  }
}

/* ─── Act IV bis: the manifesto ──────────────────────────────────────────── */

function manifesto(ctx, t) {
  const implode = easeInExpo(range(t, 43.3, 44))
  dust(ctx, t, 0.5, implode)

  // Huge ghost tiles drifting behind the words.
  ctx.save()
  ctx.globalAlpha = 0.07 * (1 - implode)
  CODE.split('').forEach((ch, i) => {
    const x = -200 + i * 330 - (((t - 37) * 40) % 330)
    flapTile(ctx, x, 180, 300, 420, { prev: ch, next: ch, p: 1 }, { lit: 0 })
  })
  ctx.restore()

  camera(ctx, 1 - implode * 0.9, WIDTH / 2, HEIGHT / 2, () => {
    MANIFESTO.forEach((line, i) => {
      const end = MANIFESTO[i + 1]?.at ?? 39.95
      if (t < line.at || t >= end) return
      const k = range(t, line.at, line.at + 0.16)
      const s = lerp(1.25, 1, easeOutExpo(k)) * (1 + (t - line.at) * 0.04)
      ctx.save()
      ctx.translate(WIDTH / 2, HEIGHT / 2)
      ctx.scale(s, s)
      font(ctx, DISPLAY, 800, 250, -9)
      const [first, second] = line.text.split(' ')
      runs(
        ctx,
        [
          [first + ' ', C.ink],
          [second, C.accent, 50],
        ],
        0,
        85,
        { align: 'center', alpha: k },
      )
      ctx.restore()
    })

    if (t >= 39.95) {
      const title = easeOutCubic(range(t, 39.95, 40.4))
      font(ctx, DISPLAY, 800, 84, -3)
      text(ctx, 'Three ways in.', WIDTH / 2, 230, { align: 'center', alpha: title })
      WAYS.forEach((way, i) => {
        const k = easeOutCubic(range(t, way.at, way.at + 0.5))
        if (k <= 0) return
        const w = 540
        const h = 420
        const x = 120 + i * 570 + (WIDTH - 120 * 2 - 3 * 540 - 2 * 30) / 2
        const y = 330 + (1 - k) * 90
        ctx.save()
        ctx.globalAlpha = k
        ctx.shadowColor = 'rgba(0,0,0,0.9)'
        ctx.shadowBlur = 40
        roundRect(ctx, x, y, w, h, 10)
        ctx.fillStyle = C.surface
        ctx.fill()
        ctx.shadowColor = 'transparent'
        ctx.strokeStyle = C.line
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.fillStyle = C.accent
        ctx.fillRect(x, y, w * easeOutCubic(range(t, way.at + 0.2, way.at + 0.8)), 4)
        font(ctx, MONO, 600, 22, 1)
        text(ctx, way.pkg, x + 40, y + 70, { color: C.accent })
        font(ctx, DISPLAY, 800, 50, -1.5)
        text(ctx, way.title, x + 40, y + 140, { color: C.ink })
        roundRect(ctx, x + 40, y + 190, w - 80, 170, 6)
        ctx.fillStyle = C.canvas
        ctx.fill()
        font(ctx, MONO, 500, 23)
        way.code.forEach((line, l) => {
          const shown = range(t, way.at + 0.3 + l * 0.35, way.at + 0.6 + l * 0.35)
          const value = line.slice(0, Math.ceil(line.length * shown))
          const color = line === CODE ? C.accent : line.startsWith('$') ? C.ink : C.inkMuted
          text(ctx, value, x + 66, y + 262 + l * 48, { color, glow: line === CODE ? 14 : 0 })
        })
        ctx.restore()
      })
    }
  })
}

/* ─── Act V: s3nd ────────────────────────────────────────────────────────── */

function finale(ctx, t) {
  const gather = range(t, 44, FINALE_HIT)
  if (t < FINALE_HIT) {
    // Everything that was sent, drawn back into one tile.
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 260; i++) {
      const angle = hash('g', i) * Math.PI * 2
      const start = 700 + hash('gr', i) * 700
      const delay = hash('gd', i) * 0.35
      const k = easeInExpo(clamp((gather - delay) / (1 - delay)))
      const r = start * (1 - k)
      const r2 = start * (1 - easeInExpo(clamp((gather - 0.03 - delay) / (1 - delay))))
      const spin = angle + k * 1.2
      ctx.globalAlpha = clamp(gather * 3) * (0.3 + hash('ga', i) * 0.7)
      ctx.strokeStyle = i % 4 ? C.accent : C.accentBright
      ctx.lineWidth = 1 + hash('gw', i) * 2.5
      ctx.beginPath()
      ctx.moveTo(WIDTH / 2 + Math.cos(spin) * r, HEIGHT / 2 + Math.sin(spin) * r)
      ctx.lineTo(
        WIDTH / 2 + Math.cos(angle + (k - 0.02) * 1.2) * r2,
        HEIGHT / 2 + Math.sin(angle + (k - 0.02) * 1.2) * r2,
      )
      ctx.stroke()
    }
    ctx.restore()
    glowSpot(ctx, WIDTH / 2, HEIGHT / 2, 200 + gather * 300, easeInCubic(gather) * 0.7)
    return
  }

  const hit = t - FINALE_HIT
  dust(ctx, t, 0.55)
  glowSpot(ctx, WIDTH / 2, 400, 900, 0.18 * Math.exp(-hit * 0.6) + 0.07)
  shockwave(ctx, t, FINALE_HIT, WIDTH / 2, HEIGHT / 2, { size: 1.5 })

  // Lockup: the tile settles, then slides left to make room for the name.
  font(ctx, DISPLAY, 800, 200, -8)
  const nameW = ctx.measureText('s3nd').width
  font(ctx, DISPLAY, 600, 200, -8)
  const tldW = ctx.measureText('.sh').width
  const logoSize = 180
  const gap = 46
  const lockupW = logoSize + gap + nameW + tldW
  const slide = easeInOutCubic(range(t, 46.35, 47.15))
  const y = lerp(HEIGHT / 2, 390, slide)
  const size = lerp(230, logoSize, slide) * lerp(2.2, 1, easeOutExpo(range(t, FINALE_HIT, FINALE_HIT + 0.3)))
  const lx = lerp(WIDTH / 2, WIDTH / 2 - lockupW / 2 + logoSize / 2, slide)
  logo(ctx, lx, y, size, {
    arrow: easeOutCubic(range(t, FINALE_HIT + 0.15, FINALE_HIT + 0.6)),
    perforation: range(t, FINALE_HIT + 0.5, FINALE_HIT + 0.85),
    glow: 40 + 60 * Math.exp(-hit * 2),
  })

  if (slide > 0) {
    const nx = WIDTH / 2 - lockupW / 2 + logoSize + gap
    ctx.save()
    ctx.beginPath()
    ctx.rect(lx + size / 2 + 4, 0, WIDTH, HEIGHT)
    ctx.clip()
    const drift = (1 - slide) * -120
    font(ctx, DISPLAY, 800, 200, -8)
    text(ctx, 's3nd', nx + drift, y + 72, { color: C.ink })
    font(ctx, DISPLAY, 600, 200, -8)
    text(ctx, '.sh', nx + nameW + drift, y + 72, { color: C.inkFaint, alpha: range(t, 46.9, 47.4) })
    ctx.restore()
  }

  const tagline = 'Send anything with a code, through your own bucket.'.split(' ')
  font(ctx, DISPLAY, 500, 50, -0.5)
  const space = ctx.measureText(' ').width
  const widths = tagline.map((w) => ctx.measureText(w).width)
  let x = WIDTH / 2 - (widths.reduce((a, b) => a + b, 0) + space * (tagline.length - 1)) / 2
  tagline.forEach((word, i) => {
    const k = easeOutCubic(range(t, 47.6 + i * 0.08, 48.1 + i * 0.08))
    const accent = word === 'code,' || word === 'own'
    font(ctx, DISPLAY, 500, 50, -0.5)
    text(ctx, word, x, 590 + (1 - k) * 24, { color: accent ? C.ink : C.inkMuted, alpha: k })
    x += widths[i] + space
  })

  if (t >= boardingRow[0].from - 0.05) {
    const w = 62
    const gapTile = 7
    const rowW = boardingRow.length * (w + gapTile) - gapTile
    const appear = easeOutCubic(range(t, 50.3, 50.6))
    ctx.save()
    ctx.globalAlpha = appear
    flapRowAt(ctx, boardingRow, t, WIDTH / 2 - rowW / 2, 650 + (1 - appear) * 20, w, 88, gapTile)
    ctx.restore()
  }

  const pill = easeOutCubic(range(t, 51.6, 51.95))
  if (pill > 0) {
    font(ctx, MONO, 600, 32)
    const cmd = typedText(TYPE.install, t)
    const full = ctx.measureText('$ ' + TYPE.install.text).width
    const pw = full + 90
    const px = WIDTH / 2 - pw / 2
    ctx.save()
    ctx.globalAlpha = pill
    roundRect(ctx, px, 800, pw, 76, 8)
    ctx.fillStyle = C.surface
    ctx.fill()
    ctx.strokeStyle = C.lineStrong
    ctx.lineWidth = 1.5
    ctx.stroke()
    font(ctx, MONO, 600, 32)
    const cw = runs(
      ctx,
      [
        ['$ ', C.accent],
        [cmd, C.ink],
      ],
      px + 45,
      850,
    )
    cursor(ctx, px + 45 + cw, 850, 32, t, t < TYPE.install.end)
    font(ctx, MONO, 500, 21, 4)
    text(ctx, 'S3ND.SH   ·   OPEN SOURCE   ·   MIT', WIDTH / 2, 945, {
      color: C.inkFaint,
      align: 'center',
      alpha: range(t, 53, 53.5),
    })
    ctx.restore()
  }
}

/* ─── The frame ──────────────────────────────────────────────────────────── */

export function renderFrame(ctx, t, frame) {
  prepare()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = C.canvas
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  const s = shake(t)
  ctx.save()
  ctx.translate(s.x, s.y)
  if (t < 10) intro(ctx, t)
  else if (t < 18) reveal(ctx, t)
  else if (t < 32) journey(ctx, t)
  else if (t < 37) board(ctx, t)
  else if (t < 44) manifesto(ctx, t)
  else finale(ctx, t)
  ctx.restore()

  // Scene cross-fades from black where a cut would be too abrupt.
  const fromBlack = Math.max(1 - range(t, 0, 0.8), 1 - range(t, 18, 18.35) * (t >= 18 ? 1 : 0))
  if (t < 0.8 || (t >= 18 && t < 18.35)) {
    ctx.fillStyle = `rgba(0,0,0,${fromBlack})`
    ctx.fillRect(0, 0, WIDTH, HEIGHT)
  }

  flash(ctx, t)

  ctx.drawImage(vignette, 0, 0)
  ctx.save()
  ctx.globalAlpha = 0.07
  ctx.globalCompositeOperation = 'overlay'
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(grain[frame % grain.length], 0, 0, WIDTH, HEIGHT)
  ctx.restore()

  const out = range(t, DURATION - 1.4, DURATION - 0.1)
  if (out > 0) {
    ctx.fillStyle = `rgba(0,0,0,${out})`
    ctx.fillRect(0, 0, WIDTH, HEIGHT)
  }
}
