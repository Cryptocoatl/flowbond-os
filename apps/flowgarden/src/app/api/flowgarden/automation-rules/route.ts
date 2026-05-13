import { NextResponse } from 'next/server'
import { z } from 'zod'
import { store } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

const createRuleSchema = z.object({
  name: z.string().min(1).max(256),
  triggerType: z.enum(['soil_moisture_below', 'schedule', 'weather_condition', 'manual']),
  condition: z.record(z.unknown()),
  actionType: z.enum(['notify', 'create_task', 'open_valve', 'close_valve', 'ai_review']),
  actionConfig: z.record(z.unknown()),
  enabled: z.boolean().default(true),
})

export async function GET() {
  return NextResponse.json({ success: true, data: store.automationRules })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = createRuleSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 },
      )
    }

    const rule = {
      ...parsed.data,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    store.automationRules.push(rule)
    return NextResponse.json({ success: true, data: rule }, { status: 201 })
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Invalid request' } },
      { status: 500 },
    )
  }
}
