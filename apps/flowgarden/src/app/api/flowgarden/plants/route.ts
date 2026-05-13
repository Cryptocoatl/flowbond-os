import { NextResponse } from 'next/server'
import { z } from 'zod'
import { store } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

const createPlantSchema = z.object({
  zoneId: z.string().optional(),
  name: z.string().min(1).max(128),
  variety: z.string().optional(),
  type: z.enum(['vegetable', 'herb', 'flower', 'fruit', 'tree', 'companion', 'cover_crop', 'other']),
  status: z.enum(['seed', 'sprout', 'seedling', 'growing', 'flowering', 'fruiting', 'harvested', 'dead']).optional(),
  plantedDate: z.string().datetime().optional(),
  quantity: z.number().int().positive().optional(),
  notes: z.string().optional(),
})

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const zoneId = searchParams.get('zoneId')

  const plants = zoneId
    ? store.plants.filter(p => p.zoneId === zoneId)
    : store.plants

  return NextResponse.json({ success: true, data: plants })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = createPlantSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 },
      )
    }

    const { plantedDate, ...rest } = parsed.data
    const plant = {
      ...rest,
      id: crypto.randomUUID(),
      status: rest.status ?? 'seed' as const,
      quantity: rest.quantity ?? 1,
      plantedDate: plantedDate ? new Date(plantedDate) : undefined,
      photoUrls: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    store.plants.push(plant)
    return NextResponse.json({ success: true, data: plant }, { status: 201 })
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Invalid request' } },
      { status: 500 },
    )
  }
}
