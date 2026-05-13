import type { HardwareSensorPayload } from '../types'

// Generates a realistic mock sensor payload for testing the ingest endpoint
// without real hardware.
export function generateMockPayload(
  deviceId = 'garden-pi-001',
  zoneId = 'zone-001',
): HardwareSensorPayload {
  const soilMoisture = 30 + Math.random() * 50
  const temperature = 18 + Math.random() * 18
  const humidity = 40 + Math.random() * 40

  return {
    device_id: deviceId,
    garden_zone_id: zoneId,
    readings: [
      { type: 'soil_moisture', value: Math.round(soilMoisture * 10) / 10, unit: '%' },
      { type: 'temperature', value: Math.round(temperature * 10) / 10, unit: '°C' },
      { type: 'humidity', value: Math.round(humidity * 10) / 10, unit: '%' },
    ],
    recorded_at: new Date().toISOString(),
    source: 'mock',
    meta: {
      firmware_version: '1.0.0-mock',
    },
  }
}

// POST mock data to the local ingest endpoint
export async function sendMockReading(
  baseUrl = 'http://localhost:3002',
  deviceId?: string,
  zoneId?: string,
): Promise<void> {
  const payload = generateMockPayload(deviceId, zoneId)

  const res = await fetch(`${baseUrl}/api/flowgarden/ingest/mock-sensor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Ingest failed: ${res.status} ${body}`)
  }

  const result = await res.json()
  console.log(`[FlowGarden Mock] Ingested ${result.data?.ingested ?? 0} readings`, payload)
}
