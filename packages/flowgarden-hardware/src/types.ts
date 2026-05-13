import type { ReadingType, ReadingSource } from '@flowbond/core'

// ─── Inbound payload from Raspberry Pi ──────────────────────────────────────

export interface HardwareSensorPayload {
  device_id: string
  garden_zone_id?: string
  readings: HardwareReading[]
  recorded_at: string
  source: ReadingSource
  // Optional: firmware version, battery level, etc.
  meta?: {
    firmware_version?: string
    battery_pct?: number
    rssi_dbm?: number
    uptime_seconds?: number
  }
}

export interface HardwareReading {
  type: ReadingType
  value: number
  unit: string
  // Optional: sensor-specific raw ADC value for calibration
  raw?: number
}

// ─── Camera payload ──────────────────────────────────────────────────────────

export interface HardwareCameraPayload {
  device_id: string
  garden_zone_id?: string
  image_base64?: string
  image_url?: string
  captured_at: string
  source: ReadingSource
  meta?: {
    resolution?: string
    format?: string
  }
}

// ─── Device heartbeat ────────────────────────────────────────────────────────

export interface HardwareHeartbeat {
  device_id: string
  status: 'online' | 'warning' | 'error'
  timestamp: string
  meta?: Record<string, unknown>
}

// ─── Example payloads (for documentation / testing) ─────────────────────────

export const EXAMPLE_SENSOR_PAYLOAD: HardwareSensorPayload = {
  device_id: 'garden-pi-001',
  garden_zone_id: 'zone-001',
  readings: [
    { type: 'soil_moisture', value: 42, unit: '%' },
    { type: 'temperature', value: 26.5, unit: '°C' },
    { type: 'humidity', value: 62, unit: '%' },
  ],
  recorded_at: new Date().toISOString(),
  source: 'raspberry_pi',
  meta: {
    firmware_version: '1.0.0',
    battery_pct: 88,
    uptime_seconds: 86400,
  },
}

export const EXAMPLE_CAMERA_PAYLOAD: HardwareCameraPayload = {
  device_id: 'garden-cam-001',
  garden_zone_id: 'zone-001',
  image_url: 'https://your-storage.com/garden/2024-01-01-main-bed.jpg',
  captured_at: new Date().toISOString(),
  source: 'raspberry_pi',
  meta: {
    resolution: '1920x1080',
    format: 'jpeg',
  },
}
