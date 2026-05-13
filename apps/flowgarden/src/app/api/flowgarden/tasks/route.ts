import { NextResponse } from 'next/server'
import { z } from 'zod'
import { store } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

const createTaskSchema = z.object({
  zoneId: z.string().optional(),
  plantId: z.string().optional(),
  title: z.string().min(1).max(256),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().datetime().optional(),
  rewardPoints: z.number().int().min(0).optional(),
  proofRequired: z.boolean().optional(),
})

const updateTaskSchema = z.object({
  id: z.string(),
  status: z.enum(['pending', 'in_progress', 'done', 'skipped']).optional(),
  proofPhotoUrl: z.string().url().optional(),
})

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const zoneId = searchParams.get('zoneId')

  let tasks = [...store.tasks]
  if (status) tasks = tasks.filter(t => t.status === status)
  if (zoneId) tasks = tasks.filter(t => t.zoneId === zoneId)

  tasks.sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  return NextResponse.json({ success: true, data: tasks })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Handle status update
    if ('id' in body && 'status' in body) {
      const parsed = updateTaskSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
          { status: 400 },
        )
      }
      const idx = store.tasks.findIndex(t => t.id === parsed.data.id)
      if (idx === -1) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } },
          { status: 404 },
        )
      }
      store.tasks[idx] = {
        ...store.tasks[idx],
        ...parsed.data,
        completedAt: parsed.data.status === 'done' ? new Date() : store.tasks[idx].completedAt,
        updatedAt: new Date(),
      }
      return NextResponse.json({ success: true, data: store.tasks[idx] })
    }

    const parsed = createTaskSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 },
      )
    }

    const { dueDate, ...rest } = parsed.data
    const task = {
      ...rest,
      id: crypto.randomUUID(),
      status: 'pending' as const,
      priority: rest.priority ?? 'medium' as const,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      rewardPoints: rest.rewardPoints ?? 0,
      proofRequired: rest.proofRequired ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    store.tasks.push(task)
    return NextResponse.json({ success: true, data: task }, { status: 201 })
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Invalid request' } },
      { status: 500 },
    )
  }
}
