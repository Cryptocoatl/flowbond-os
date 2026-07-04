// Row shapes for the flowscrow_* tables (mirrors the migration).

export type DealStatus =
  | 'draft'
  | 'signed_pending_transfers'
  | 'cleared'
  | 'released'
  | 'anchored';

export type PartyRole = 'initiator' | 'counterparty' | 'counsel';
export type TaskPhase = 'A' | 'B' | 'C';
export type TaskStatus = 'pending' | 'submitted' | 'confirmed';
export type DocKind = 'agreement' | 'courtesy_letter';
export type DocStatus =
  | 'created'
  | 'sent'
  | 'delivered'
  | 'completed'
  | 'declined'
  | 'voided';

export interface Deal {
  id: string;
  title: string;
  status: DealStatus;
  effective_date: string | null;
  counsel_approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface Party {
  id: string;
  deal_id: string;
  flowbond_user_id: string | null;
  role: PartyRole;
  display_name: string | null;
  email: string | null;
  fbid: string | null;
  wallet_address: string | null;
  docusign_recipient_id: string | null;
}

export interface FlowDocument {
  id: string;
  deal_id: string;
  kind: DocKind;
  docusign_envelope_id: string | null;
  status: DocStatus;
  sha256: string | null;
  released: boolean;
  released_at: string | null;
}

export interface Task {
  id: string;
  deal_id: string;
  code: string;
  phase: TaskPhase;
  sort_order: number;
  title: string;
  responsible_role: PartyRole | 'all';
  verifier_role: PartyRole | 'both';
  responsible_label: string | null;
  verifier_label: string | null;
  deliverable: string | null;
  acceptance_criteria: string | null;
  status: TaskStatus;
  submitted_by: string | null;
  submitted_at: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
}

export interface FlowEvent {
  id: string;
  deal_id: string;
  actor_fbid: string | null;
  actor_party_id: string | null;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface Anchor {
  id: string;
  deal_id: string;
  chain: string;
  tx_hash: string | null;
  package_hash: string | null;
  anchored_by: string | null;
  created_at: string;
}
