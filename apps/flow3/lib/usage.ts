// Server helper: price an operation, check the user can afford it, then charge
// FlowCredits AFTER the provider succeeds and log the real cost to the usage
// ledger. Charging post-success avoids refund/race complexity — a failed
// provider call costs the user nothing.
import type { SupabaseClient } from '@supabase/supabase-js';
import { creditsFor, type Operation } from './pricing';

export interface Quote { credits: number; rawUsd: number; affordable: boolean; balance: number }

/** Price the op and confirm the user's balance covers it (read-only). */
export async function quote(
  supabase: SupabaseClient,
  op: Operation,
  units: number,
): Promise<Quote> {
  const { credits, rawUsd } = creditsFor(op, units);
  const { data: balance } = await supabase.rpc('fc_balance');
  const bal = (balance as number) ?? 0;
  return { credits, rawUsd, affordable: bal >= credits, balance: bal };
}

/** Charge after the provider succeeded + write the usage ledger row. */
export async function chargeAndLog(
  supabase: SupabaseClient,
  userId: string,
  args: {
    op: Operation;
    units: number;
    credits: number;
    rawUsd: number;
    provider: string;
    model: string;
    creationId?: string;
    meta?: Record<string, unknown>;
  },
): Promise<{ balance: number | null }> {
  const { data: balance, error } = await supabase.rpc('fc_spend', {
    p_amount: args.credits,
    p_reason: `flowstudio:${args.op}`,
    p_app_slug: 'flow3',
    p_ref_id: args.creationId ?? null,
  });

  await supabase.from('flowstudio_api_usage').insert({
    user_id: userId,
    creation_id: args.creationId ?? null,
    provider: args.provider,
    model: args.model,
    operation: args.op,
    units: args.units,
    raw_cost_usd: args.rawUsd,
    credits_charged: args.credits,
    status: error ? 'failed' : 'ok',
    meta: args.meta ?? {},
  });

  return { balance: (balance as number) ?? null };
}
