import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { refiridesQuote, refiridesCreate, type GeoPoint } from '@/lib/refirides';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/sani/pickup  — dispatch a cubeta (full-bucket) collection.
 *
 * Body: { node_id, buckets, dropoff_label?, dropoff_address }
 *
 * Runs as the authenticated team member (cookie session) so the `sani` RPCs
 * enforce the 'logistics' grant in Postgres. Records the pickup, then routes it
 * through RefiRides (quote → create) and attaches the job. If RefiRides or a
 * location is missing, the pickup is still recorded as 'requested'.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const nodeId: string | undefined = body?.node_id;
  const buckets = Math.max(1, Number(body?.buckets) || 1);
  const dropoffLabel: string | null = body?.dropoff_label ?? null;
  const dropoffAddress: string | null = body?.dropoff_address ?? null;
  if (!nodeId) return NextResponse.json({ error: 'node_id required' }, { status: 400 });

  const cookieStore = await cookies();
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: 'sani' },
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            /* read-only */
          }
        },
      },
    },
  );

  // 1) record the pickup (RPC enforces logistics access via the user's JWT)
  const { data: created, error: e1 } = await sb.rpc('create_pickup', {
    p_node_id: nodeId,
    p_buckets: buckets,
    p_dropoff_label: dropoffLabel,
    p_dropoff_address: dropoffAddress,
  });
  if (e1) {
    const status = e1.code === '42501' ? 403 : 400;
    return NextResponse.json({ error: e1.message }, { status });
  }
  const c = created as {
    pickup_id: string; node_name: string; node_address: string | null;
    node_lat: number | null; node_lng: number | null; buckets: number;
  };

  const haveLocation = Boolean(c.node_address) || c.node_lat != null;
  if (!haveLocation || !dropoffAddress) {
    const { data: list } = await sb.rpc('list_pickups');
    return NextResponse.json({
      ok: true, dispatched: false,
      reason: !haveLocation ? 'node_missing_location' : 'dropoff_required',
      pickups: list,
    });
  }

  // 2) route through RefiRides: quote (geocode) → create (persist job)
  try {
    const pickup: GeoPoint = {
      address: c.node_address ?? undefined,
      lat: c.node_lat ?? undefined,
      lng: c.node_lng ?? undefined,
    };
    const dropoff: GeoPoint = { address: dropoffAddress };
    const q = await refiridesQuote(pickup, dropoff);
    const job = await refiridesCreate({
      pickup: q?.points?.pickup ?? pickup,
      dropoff: q?.points?.dropoff ?? dropoff,
      quote: q?.quote,
      provider: q?.provider,
      manifest: { kind: 'sani_cubetas', buckets: c.buckets, node: c.node_name, dropoff: dropoffLabel },
    });
    const { data: list } = await sb.rpc('set_pickup_refirides', {
      p_id: c.pickup_id,
      p_job_id: String(job?.id ?? job?.job?.external_id ?? ''),
      p_external_id: job?.job?.external_id ?? null,
      p_quote: (q?.quote as object) ?? null,
      p_status: 'scheduled',
    });
    return NextResponse.json({ ok: true, dispatched: true, job: job?.job, pickups: list });
  } catch (err) {
    // dispatch failed — the pickup stays 'requested' so it isn't lost
    const { data: list } = await sb.rpc('list_pickups');
    return NextResponse.json({
      ok: true, dispatched: false, reason: String((err as Error)?.message ?? err), pickups: list,
    });
  }
}
