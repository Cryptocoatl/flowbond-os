import 'server-only';
import { authClient } from './supabase/server';
import type {
  Anchor,
  Deal,
  FlowDocument,
  FlowEvent,
  Party,
  PartyRole,
  Task,
} from './types';

export interface DealBundle {
  deal: Deal;
  parties: Party[];
  documents: FlowDocument[];
  tasks: Task[];
  events: FlowEvent[];
  anchors: Anchor[];
  /** Roles the current session holds in this deal. */
  myRoles: PartyRole[];
}

/**
 * Resolve the deal the current user is a party to (this pilot is single-deal).
 * Calls flowscrow_claim_party() first so a first-time login is linked to its
 * seeded party slot by email, then reads everything through RLS — a user only
 * ever sees their own deal.
 */
export async function getMyDeal(): Promise<DealBundle | null> {
  const sb = await authClient();

  // Link this login to its party slot (idempotent). Returns the caller's parties.
  const { data: mine } = await sb.rpc('flowscrow_claim_party');
  const myParties = (mine ?? []) as Party[];
  if (myParties.length === 0) return null;

  const dealId = myParties[0].deal_id;
  const myRoles = myParties.map((p) => p.role);

  const [dealRes, partiesRes, docsRes, tasksRes, eventsRes, anchorsRes] = await Promise.all([
    sb.from('flowscrow_deals').select('*').eq('id', dealId).maybeSingle(),
    sb.from('flowscrow_parties').select('*').eq('deal_id', dealId),
    sb.from('flowscrow_documents').select('*').eq('deal_id', dealId),
    sb.from('flowscrow_tasks').select('*').eq('deal_id', dealId).order('sort_order'),
    sb
      .from('flowscrow_events')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false }),
    sb.from('flowscrow_anchors').select('*').eq('deal_id', dealId).order('created_at'),
  ]);

  if (!dealRes.data) return null;

  return {
    deal: dealRes.data as Deal,
    parties: (partiesRes.data ?? []) as Party[],
    documents: (docsRes.data ?? []) as FlowDocument[],
    tasks: (tasksRes.data ?? []) as Task[],
    events: (eventsRes.data ?? []) as FlowEvent[],
    anchors: (anchorsRes.data ?? []) as Anchor[],
    myRoles,
  };
}

/** True when every Phase-B task is confirmed (the transfer requirement of the gate). */
export function allPhaseBConfirmed(tasks: Task[]): boolean {
  const b = tasks.filter((t) => t.phase === 'B');
  return b.length > 0 && b.every((t) => t.status === 'confirmed');
}

/** The gate: closed until all Phase-B confirmed AND counsel approved. */
export function gateOpen(bundle: Pick<DealBundle, 'deal' | 'tasks'>): boolean {
  return allPhaseBConfirmed(bundle.tasks) && bundle.deal.counsel_approved;
}
