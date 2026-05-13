import { NextResponse } from 'next/server'
import { z } from 'zod'
import { store } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

const createEntrySchema = z.object({
  zoneId: z.string().optional(),
  title: z.string().optional(),
  content: z.string().min(1),
  entryDate: z.string().datetime().optional(),
  weatherCondition: z.string().optional(),
  temperatureC: z.number().optional(),
  humidityPct: z.number().min(0).max(100).optional(),
  watered: z.boolean().optional(),
  compostAdded: z.boolean().optional(),
  pestsObserved: z.boolean().optional(),
  pestNotes: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export async function GET() {
  const sorted = [...store.journal].sort(
    (a, b) => b.entryDate.getTime() - a.entryDate.getTime(),
  )
  return NextResponse.json({ success: true, data: sorted })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = createEntrySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 },
      )
    }

    const { entryDate, ...rest } = parsed.data
    const entry = {
      ...rest,
      id: crypto.randomUUID(),
      entryDate: entryDate ? new Date(entryDate) : new Date(),
      watered: rest.watered ?? false,
      compostAdded: rest.compostAdded ?? false,
      pestsObserved: rest.pestsObserved ?? false,
      photoUrls: [],
      tags: rest.tags ?? [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    store.journal.push(entry)
    return NextResponse.json({ success: true, data: entry }, { status: 201 })
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Invalid request' } },
      { status: 500 },
    )
  }
}
