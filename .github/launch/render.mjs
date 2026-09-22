/*
 * Records the film frame by frame in headless Chromium and pipes the frames to
 * ffmpeg. Usage:
 *
 *   node render.mjs out.mp4 [--from 0] [--to 56] [--stills 12.5,30]
 *
 * With --stills it writes one PNG per listed second instead of a video.
 */

import { execFileSync, spawn } from 'node:child_process'
import { createReadStream, existsSync, statSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { extname, join, resolve } from 'node:path'

import { DURATION, FPS } from './timeline.mjs'

const root = resolve(import.meta.dirname, '../..')
const args = process.argv.slice(2)
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : fallback
}
const output = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--')) ?? 'frames.mp4'
const from = Number(option('from', 0))
const to = Number(option('to', DURATION))
const stills = option('stills')
const ffmpeg = process.env.FFMPEG ?? 'ffmpeg'

async function loadPlaywright() {
  try {
    return await import('playwright')
  } catch {
    const global = execFileSync('npm', ['root', '-g']).toString().trim()
    return createRequire(join(global, 'noop.js'))('playwright')
  }
}

const types = { '.html': 'text/html', '.mjs': 'text/javascript', '.woff2': 'font/woff2' }
const server = createServer((request, response) => {
  const path = join(root, decodeURIComponent(new URL(request.url, 'http://x').pathname))
  if (!path.startsWith(root) || !existsSync(path) || !statSync(path).isFile()) {
    response.writeHead(404).end()
    return
  }
  response.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' })
  createReadStream(path).pipe(response)
})
await new Promise((done) => server.listen(0, done))

const { chromium } = await loadPlaywright()
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
page.on('pageerror', (error) => console.error(error))
await page.goto(`http://localhost:${server.address().port}/.github/launch/index.html`)
await page.waitForFunction(() => window.ready === true)

if (stills) {
  for (const second of stills.split(',').map(Number)) {
    const data = await page.evaluate((i) => window.frame(i, 0.92), Math.round(second * FPS))
    const file = `${output.replace(/\.\w+$/, '')}-${second.toFixed(2)}.jpg`
    writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'))
    console.log(file)
  }
} else {
  const encoder = spawn(
    ffmpeg,
    ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', '-'].concat([
      '-c:v',
      'libx264',
      '-preset',
      'slow',
      '-crf',
      '16',
      '-pix_fmt',
      'yuv420p',
      output,
    ]),
    { stdio: ['pipe', 'inherit', 'inherit'] },
  )
  const first = Math.round(from * FPS)
  const last = Math.round(to * FPS)
  const started = Date.now()
  for (let i = first; i < last; i++) {
    const data = await page.evaluate((n) => window.frame(n), i)
    const chunk = Buffer.from(data.split(',')[1], 'base64')
    if (!encoder.stdin.write(chunk)) await new Promise((done) => encoder.stdin.once('drain', done))
    if (i % FPS === 0) console.log(`${(i / FPS).toFixed(0)}s · ${((Date.now() - started) / 1000).toFixed(0)}s elapsed`)
  }
  encoder.stdin.end()
  await new Promise((done) => encoder.on('close', done))
}

await browser.close()
server.close()
