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
