#!/usr/bin/env bash
# Renders the launch film: frames from scene.mjs, sound from soundtrack.py,
# muxed into one MP4. Needs node with playwright, python3 with numpy and
# scipy, and ffmpeg on PATH (or FFMPEG pointing at one).
set -euo pipefail
cd "$(dirname "$0")"

out=${1:-s3nd-launch.mp4}
ffmpeg=${FFMPEG:-ffmpeg}
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

python3 soundtrack.py "$work/soundtrack.wav"
FFMPEG=$ffmpeg node render.mjs "$work/picture.mp4"
"$ffmpeg" -y -loglevel error -i "$work/picture.mp4" -i "$work/soundtrack.wav" \
  -c:v copy -c:a aac -b:a 256k -movflags +faststart -shortest "$out"
echo "$out"
