import { NextResponse } from 'next/server'
import { z } from 'zod'
import { store } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

const createZoneSchema = z.object({
  name: z.string().min(1).max(128),
  slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  locationNotes: z.string().optional(),
  widthM: z.number().positive().optional(),
  lengthM: z.number().positive().optional(),
  sunExposure: z.enum(['full_sun', 'partial_shade', 'full_shade']).optional(),
  soilType: z.enum(['loam', 'clay', 'sandy', 'hugelkultur', 'compost', 'mixed']).optional(),
  irrigationType: z.enum(['drip', 'sprinkler', 'hand', 'none']).optional(),
  notes: z.string().optional(),
})

export async function GET() {
  return NextResponse.json({ success: true, data: store.zones })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = createZoneSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 },
      )
    }

    const zone = {
      ...parsed.data,
      id: crypto.randomUUID(),
      photoUrls: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    store.zones.push(zone)
    return NextResponse.json({ success: true, data: zone }, { status: 201 })
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Invalid request' } },
      { status: 500 },
    )
  }
}
