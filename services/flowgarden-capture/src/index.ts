import 'dotenv/config'
import { join, resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { copyFileSync } from 'fs'
import { buildRtspUrl, captureFrame, snapshotFilename, latestFilename } from './tapo.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── Config ──────────────────────────────────────────────────────────────────

const TAPO_IP = process.env.TAPO_IP ?? ''
const TAPO_USER = process.env.TAPO_USER ?? ''
const TAPO_PASS = process.env.TAPO_PASS ?? ''
const TAPO_STREAM = (process.env.TAPO_STREAM ?? 'stream1') as 'stream1' | 'stream2'

const FLOWGARDEN_API_URL = process.env.FLOWGARDEN_API_URL ?? 'http://localhost:3002'
const DEVICE_ID = process.env.DEVICE_ID ?? 'cam-lake-castle-back'
const ZONE_ID = process.env.ZONE_ID ?? 'zone-lake-castle-back'

const INTERVAL = Number(process.env.CAPTURE_INTERVAL_SECONDS ?? 300) * 1000

const SNAPSHOT_DIR = process.env.SNAPSHOT_DIR
  ? resolve(process.env.SNAPSHOT_DIR)
  : resolve(__dirname, '../../flowgarden/public/captures')

// ─── Core capture loop ───────────────────────────────────────────────────────

async function capture() {
  if (!TAPO_IP || !TAPO_USER || !TAPO_PASS) {
    console.error('[FlowGarden Capture] Missing TAPO_IP / TAPO_USER / TAPO_PASS in .env')
    process.exit(1)
  }

  const rtspUrl = buildRtspUrl({ ip: TAPO_IP, user: TAPO_USER, pass: TAPO_PASS, stream: TAPO_STREAM })

  const filename = snapshotFilename(DEVICE_ID)
  const latestName = latestFilename(DEVICE_ID)
  const outputPath = join(SNAPSHOT_DIR, filename)
  const latestPath = join(SNAPSHOT_DIR, latestName)

  console.log(`[${new Date().toISOString()}] Capturing frame from ${TAPO_IP}...`)

  try {
    captureFrame(rtspUrl, outputPath)

    // Keep a "latest" copy so the dashboard always shows the freshest frame
    copyFileSync(outputPath, latestPath)

    const imageUrl = `/captures/${latestName}`

    await postCapture(imageUrl, filename)

    console.log(`[${new Date().toISOString()}] OK — saved ${filename}`)
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Capture failed:`, err instanceof Error ? err.message : err)
  }
}

async function postCapture(imageUrl: string, filename: string) {
  const payload = {
    deviceId: DEVICE_ID,
    zoneId: ZONE_ID,
    imageUrl,
    capturedAt: new Date().toISOString(),
    source: 'raspberry_pi',
    metadata: { filename, camera_ip: TAPO_IP, stream: TAPO_STREAM },
  }

  try {
    const res = await fetch(`${FLOWGARDEN_API_URL}/api/flowgarden/camera-captures`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      console.warn(`[FlowGarden Capture] API responded ${res.status}`)
    }
  } catch (err) {
    console.warn(`[FlowGarden Capture] Could not reach API:`, err instanceof Error ? err.message : err)
  }
}

// ─── Start ───────────────────────────────────────────────────────────────────

console.log(`[FlowGarden Capture] Starting`)
console.log(`  Camera   : ${TAPO_IP} (${TAPO_STREAM})`)
console.log(`  Device ID: ${DEVICE_ID}`)
console.log(`  Zone     : ${ZONE_ID}`)
console.log(`  Saves to : ${SNAPSHOT_DIR}`)
console.log(`  Interval : ${INTERVAL / 1000}s`)
console.log()

// Capture immediately on start, then on interval
capture()
const timer = setInterval(capture, INTERVAL)

process.on('SIGINT', () => {
  clearInterval(timer)
  console.log('\n[FlowGarden Capture] Stopped.')
  process.exit(0)
})
