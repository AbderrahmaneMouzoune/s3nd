# The launch film

A 56-second film for the launch of s3nd, rendered from code: no footage, no stock music, no samples. The
picture is drawn on a canvas one frame at a time, the soundtrack is synthesised from sine waves and
noise, and both read the same cue sheet, so every tile clicks on the frame it flips.

| Time   | Act              | What happens                                                                                  |
| ------ | ---------------- | --------------------------------------------------------------------------------------------- |
| 0–10s  | The friction     | "Every day, we send things." Sign-up walls, size limits and expired links pile up, then fall. |
| 10–18s | Eight characters | "What if all it took was…" The drop: `K7QP 2M4X` spins in on split-flap tiles.                |
| 18–32s | The journey      | `s3nd put` on a laptop, the bytes arc into your bucket, `s3nd get k7qp-2m4x` anywhere else.   |
| 32–44s | Departures       | A departure board of transfers across providers, "Your bucket. Your keys. Your rules."        |
| 44–56s | s3nd             | Everything collapses into the amber tile, the name, the tagline, `npm i -g @s3nd/cli`.        |

The palette, the fonts (Bricolage Grotesque and JetBrains Mono, loaded from `apps/website/app/fonts`),
the split-flap tile and the logo are the website's own.

## Files

- `timeline.mjs`: the cue sheet. Scene times, the text, every split-flap row, every keystroke, and
  `audioEvents()`, which lists each sound the picture needs.
- `scene.mjs`: `renderFrame(ctx, t)`, a pure function of time that draws one 1920×1080 frame.
- `index.html`: loads the fonts and the scene. Open it through any static server from the repository
  root to watch the film play live in a browser.
- `render.mjs`: drives headless Chromium frame by frame (60 fps) and pipes the frames into ffmpeg.
- `soundtrack.py`: the score and sound design, synthesised with numpy and scipy.
- `build.sh`: all of it, muxed into one MP4.

## Rendering

```sh
# once: playwright for node, numpy + scipy for python, and an ffmpeg with libx264
pip install numpy scipy

.github/launch/build.sh s3nd-launch.mp4
```

It takes a few minutes. To check a single moment without rendering the whole film:

```sh
node .github/launch/render.mjs still.jpg --stills 12.8,45.9   # writes still-12.80.jpg, still-45.90.jpg
node .github/launch/render.mjs part.mp4 --from 30 --to 38      # a silent excerpt
```

## On the website

The how-it-works page plays a lighter cut from `apps/website/public/film/`: 720p30 in WebM (VP9 + Opus)
with an MP4 (H.264 + AAC) fallback, and a poster from 13.5s. After a new render:

```sh
ffmpeg -i s3nd-launch.mp4 -vf scale=1280:720,fps=30 -c:v libvpx-vp9 -b:v 0 -crf 38 -c:a libopus -b:a 128k apps/website/public/film/s3nd-launch.webm
ffmpeg -i s3nd-launch.mp4 -vf scale=1280:720,fps=30 -c:v libx264 -preset veryslow -crf 25 -c:a aac -b:a 128k -movflags +faststart apps/website/public/film/s3nd-launch.mp4
ffmpeg -ss 13.5 -i s3nd-launch.mp4 -frames:v 1 -vf scale=1280:720 -q:v 3 apps/website/public/film/s3nd-launch-poster.jpg
```
