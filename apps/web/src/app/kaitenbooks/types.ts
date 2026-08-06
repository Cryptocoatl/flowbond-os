/** The shape of canon as the app receives it from `kaiten_open`. */

export interface CanonBook {
  id: string
  title: string
  subtitle: string
  arc: string
  unit_type: string
  unit_count: number
  title_status?: string
}

export interface CanonPart {
  book: string
  n: number
  name: string
  alt_name?: string
  units: string[]
  conflict?: string
}

export interface CanonUnit {
  id: string
  book: string
  n: number
  label: string
  title: string
  subtitle?: string
  status: string
  conflict?: string
  role?: string
  flag?: string
}

export interface CanonDecision {
  id: string
  blocks: string
  q: string
}

export interface Canon {
  project: string
  updated: string
  $schema_version: string
  formula: { expression: string; gloss: string }
  books: CanonBook[]
  parts: CanonPart[]
  units: CanonUnit[]
  resonances: [string, string][]
  decisions: CanonDecision[]
  _pipeline?: {
    voices: Record<string, { book: string; text: string }>
    threads: { name: string; units: string[] }[]
    stages: { n: number; name: string; output: string; status: string }[]
  }
}

export type Progress = 'seed' | 'drafted' | 'reviewed' | 'final'

export interface Draft {
  body: string
  status: Progress
  words: number
  updated_at: string
}

export interface OpenPayload {
  ok: boolean
  reason?: string
  me?: { user_id: string; role: 'author' | 'steward'; label: string | null }
  canon?: Canon
  canon_version?: string
  drafts?: Record<string, Draft>
  notes?: Record<string, string>
}

export const ACCENT: Record<string, string> = {
  B1: 'var(--brass)',
  B2: 'var(--albedo)',
  B3: 'var(--cinnabar)',
}
