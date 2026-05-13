import { NextResponse } from 'next/server'
import { store } from '@/lib/mock-data'
import type { GardenOverview } from '@flowbond/core'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { zones, plants, tasks, devices, sensorReadings } = store

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today.getTime() + 86400000)

  const tasksToday = tasks.filter(t => {
    if (!t.dueDate) return false
    return t.dueDate >= today && t.dueDate < tomorrow && t.status !== 'done'
  }).length

  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length
  const devicesOnline = devices.filter(d => d.status === 'online').length

  const latestReadings = sensorReadings
    .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())
    .slice(0, 5)
    .map(r => ({
      type: r.readingType,
      value: r.value,
      unit: r.unit,
      zoneId: r.zoneId,
      zoneName: zones.find(z => z.id === r.zoneId)?.name,
      recordedAt: r.recordedAt,
      source: r.source,
    }))

  const overview: GardenOverview = {
    totalZones: zones.length,
    totalPlants: plants.length,
    tasksToday,
    pendingTasks,
    devicesOnline,
    devicesTotal: devices.length,
    recentPhotos: [],
    latestReadings,
  }

  return NextResponse.json({ success: true, data: overview })
}
