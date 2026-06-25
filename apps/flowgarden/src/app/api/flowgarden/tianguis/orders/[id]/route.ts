import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { releaseEscrow, voidEscrow, escrowEnabled } from '@/lib/flowscrow'

export const dynamic = 'force-dynamic'

const ORDER_COLS =
  'id, product_id, garden_id, producer_user_id, buyer_user_id, status, fulfillment, delivery_status, total_cents, currency, escrow_id, escrow_status, created_at'

// PATCH — update order status. Producer: confirm/fulfill/cancel. Buyer: cancel.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { status } = await request.json()
  const valid = ['pending', 'confirmed', 'fulfilled', 'canceled']
  if (!valid.includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order } = await (admin as any)
    .from('flowgarden_tianguis_orders')
    .select('id, producer_user_id, buyer_user_id, escrow_id')
    .eq('id', id)
    .maybeSingle()

  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isProducer = order.producer_user_id === user.id
  const isBuyer = order.buyer_user_id === user.id
  if (!isProducer && !isBuyer) return NextResponse.json({ error: 'Not your order' }, { status: 403 })
  // Buyers may only cancel; producers may set any status.
  if (!isProducer && status !== 'canceled') {
    return NextResponse.json({ error: 'Only the producer can update this' }, { status: 403 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('flowgarden_tianguis_orders')
    .update({ status })
    .eq('id', id)
    .select(ORDER_COLS)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // --- FlowScrow escrow transition (non-fatal) -------------------------------
  // 'fulfilled' (delivery/handoff confirmed) releases the hold to the producer;
  // 'canceled' voids it back to the buyer. No-op if escrow was never opened.
  let result = data
  if (escrowEnabled() && order.escrow_id && (status === 'fulfilled' || status === 'canceled')) {
    const hold = status === 'fulfilled'
      ? await releaseEscrow({ reference: id, escrow_id: order.escrow_id, reason: 'order fulfilled' })
      : await voidEscrow({ reference: id, escrow_id: order.escrow_id, reason: 'order canceled' })
    if (hold) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: updated } = await (admin as any)
        .from('flowgarden_tianguis_orders')
        .update({ escrow_status: hold.status || (status === 'fulfilled' ? 'released' : 'voided') })
        .eq('id', id)
        .select(ORDER_COLS)
        .single()
      if (updated) result = updated
    }
  }

  return NextResponse.json({ data: result })
}
