import { execSync } from 'child_process'
import { mkdirSync, existsSync } from 'fs'
import { join, resolve } from 'path'
import ffmpegPath from 'ffmpeg-static'

export interface TapoConfig {
  ip: string
  user: string
  pass: string
  stream?: 'stream1' | 'stream2'
}

export function buildRtspUrl(config: TapoConfig): string {
  const stream = config.stream ?? 'stream1'
  return `rtsp://${encodeURIComponent(config.user)}:${encodeURIComponent(config.pass)}@${config.ip}:554/${stream}`
}

export function captureFrame(rtspUrl: string, outputPath: string): void {
  const dir = resolve(outputPath, '..')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  const binary = ffmpegPath as string
  if (!binary) throw new Error('ffmpeg-static binary not found')

  // -rtsp_transport tcp: more reliable than UDP for home networks
  // -vframes 1: single frame
  // -q:v 2: high quality JPEG (1=best, 31=worst)
  // -timeout 10000000: 10 second connect timeout (microseconds)
  const cmd = [
    `"${binary}"`,
    `-rtsp_transport tcp`,
    `-timeout 10000000`,
    `-i "${rtspUrl}"`,
    `-vframes 1`,
    `-q:v 2`,
    `"${outputPath}"`,
    `-y`,
    `-loglevel error`,
  ].join(' ')

  execSync(cmd, { timeout: 15000 })
}

export function snapshotFilename(deviceId: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return `${deviceId}_${ts}.jpg`
}

export function latestFilename(deviceId: string): string {
  return `${deviceId}_latest.jpg`
}
