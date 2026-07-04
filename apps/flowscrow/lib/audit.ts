// Real figures from the live FlowBond org audit (flowbondhq-audit.vercel.app,
// generated from the GitHub org API 2026-06-24) + this monorepo's own git facts.
// Shown to ground the recognition conversation in the actual record.

export const REALITY_STATS = [
  { value: '~43', label: 'Live projects', sub: 'on the Vercel flowbond team' },
  { value: '~19', label: 'Custom domains', sub: 'live, non-vercel.app' },
  { value: '143', label: 'Commits (main monorepo)', sub: '142 by Steph · 1 other' },
  { value: '15', label: 'Apps · 11 packages', sub: 'in flowbond-os (Turborepo)' },
  { value: '~10 mo', label: 'Build window', sub: '2025-09 (DANZ) → 2026-06' },
  { value: '≈ 1', label: 'Bus factor', sub: 'one principal builder, AI-augmented' },
];

export const VALUE_BANDS = [
  { label: 'Cost to build (realistic)', value: '$200k – $700k', note: '~30–55 person-months across ~43 projects, mostly solo + AI.' },
  { label: 'Agency rebuild quote', value: '$1.2M – $3M', note: 'What a shop would charge to re-deliver 40+ Next.js + Supabase apps.' },
  { label: 'Realizable asset value today', value: '$150k – $500k', note: 'A few real products + ~19 live domains + the identity thesis. Mostly pre-revenue.' },
  { label: 'Conditional 24-mo EV', value: '$3M – $12M', note: 'If the top 6 assets wire payments and find early traction. Not a forecast.' },
];

// What the proposed credit implies vs. what the record actually shows.
export const RECORD_ROWS = [
  {
    implies: '"Co-founder / co-creator of FlowBond"',
    shows:
      'Co-builder on the DANZ / flowb (FlowBondTech) workstream — one part of a ~43-project build that predates and continues beyond it.',
  },
  {
    implies: '"Built the core platform"',
    shows:
      'Contributed to DANZ / flowb specifically. The broader FlowBond stack — Layer-0 identity, ClaudIA, cities, commerce, ventures — is separate; 142 of 143 commits in the main monorepo are Steph’s.',
  },
  {
    implies: '"Ongoing ownership stake"',
    shows:
      'Engaged as a co-builder / contributor. No equity or ownership agreement was ever in place.',
  },
];

// The proprietary, monetizable rails the audit identifies (the moat).
export const RAILS = [
  { name: 'FBID', what: 'Layer-0 identity — one ID, all chains', ready: '55%' },
  { name: 'ClaudIA', what: 'Zero-knowledge AI steward', ready: '50%' },
  { name: 'FlowShare', what: 'No-custody payout splits', ready: '55%' },
  { name: 'FlowScrow', what: 'Conditional-release escrow (this app)', ready: '45%' },
  { name: 'FlowCredits', what: 'Usage-credit ledger (live)', ready: '65%' },
  { name: 'ORIGO', what: 'Proof-of-Human registry', ready: '60%' },
  { name: 'Raíz', what: 'Translation rail', ready: '50%' },
  { name: 'FlowGardian', what: 'Security layer (AES-256)', ready: '30%' },
];

// Full-stack technology, grouped by layer.
export const STACK = [
  { layer: 'Frontend', items: ['Next.js 15 (App Router)', 'React 19', 'TypeScript', 'Tailwind CSS', 'Three.js · react-three-fiber (WebGL)'] },
  { layer: 'Backend & data', items: ['Supabase Postgres', 'Row-Level Security', 'SECURITY DEFINER RPCs', 'Supabase Auth · Storage · Edge Functions', 'Turborepo monorepo'] },
  { layer: 'Identity & ZK', items: ['FBID — FlowBond Layer 0', '@noble client-side crypto', 'zero-knowledge / blind relay', 'ICP vetKeys'] },
  { layer: 'Money & on-chain', items: ['viem + wagmi', 'Base L2', 'EAS attestations', 'SIWE wallet signatures', 'Stripe Connect · Mercado Pago', 'FlowCredits ledger'] },
  { layer: 'Signing & docs', items: ['DocuSign eSignature (JWT grant)', 'keccak256 proof-of-existence anchor'] },
  { layer: 'AI & media', items: ['Anthropic Claude', 'Higgsfield (generative media)', 'Coinbase AgentKit', 'ffmpeg pipelines'] },
  { layer: 'Infra & security', items: ['Vercel (43 projects)', 'SOPS-encrypted secrets', 'AES-256 (FlowGardian)', 'GitHub org (FlowBond-HQ)'] },
];
