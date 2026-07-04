export type Layer = 'web3' | 'refi' | 'social' | 'cultural' | 'tech';

export interface Grant {
  id: string;
  name: string;
  organization: string | null;
  layer: string | null;
  layers: string[];
  chains: string[];
  funding_amount: string | null;
  currency: string | null;
  status: string | null;
  deadline: string | null;
  deadline_date: string | null;
  eligibility_summary: string | null;
  application_process: string | null;
  requirements: string[];
  url: string | null;
  source: string | null;
  fit_score: number | null;
  effort_level: string | null;
  verified: boolean;
  notes: string | null;
  tags: string[];
}

export interface Project {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  layers: string[];
  url: string | null;
  status: string | null;
}

export interface Match {
  id: string;
  grant_id: string;
  project_slug: string;
  reason: string | null;
  fit_score: number | null;
}

export interface Application {
  id: string;
  grant_id: string | null;
  project_slug: string | null;
  stage: string;
  owner: string | null;
  amount_requested: string | null;
  notes: string | null;
  submitted_at: string | null;
  decision_at: string | null;
}

export interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  organization: string | null;
  role: string | null;
  relationship: string | null;
  project_slug: string | null;
  grant_id: string | null;
  tags: string[];
  links: Record<string, string>;
  notes: string | null;
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Interaction {
  id: string;
  kind: 'note' | 'email' | 'call' | 'meeting' | 'dm' | 'ai_draft' | 'model';
  actor: string | null;
  model: string | null;
  direction: string | null;
  channel: string | null;
  summary: string;
  body: string | null;
  contact_id: string | null;
  grant_id: string | null;
  application_id: string | null;
  project_slug: string | null;
  occurred_at: string;
  created_at: string;
}

export const RELATIONSHIPS = [
  'funder',
  'program-officer',
  'partner',
  'advisor',
  'community',
  'press',
] as const;

export const INTERACTION_KINDS = [
  'note',
  'email',
  'call',
  'meeting',
  'dm',
  'ai_draft',
  'model',
] as const;

export const LAYERS: Layer[] = ['web3', 'refi', 'social', 'cultural', 'tech'];

export const LAYER_LABEL: Record<string, string> = {
  web3: 'Web3',
  refi: 'ReFi / Ecological',
  social: 'Social',
  cultural: 'Cultural',
  tech: 'Tech / OSS',
};

export const STAGES = [
  'discovered',
  'researching',
  'drafting',
  'submitted',
  'won',
  'rejected',
  'skipped',
] as const;
export type Stage = (typeof STAGES)[number];
