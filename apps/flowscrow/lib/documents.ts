// The two documents in the vault. Specifics filled from what's known; a few spots
// are marked EDITABLE so they can be tuned before signing.

export const PARTIES = {
  steph: { full: 'Steph Ferrera', short: 'Steph', role: 'Founder & principal builder' },
  russell: { full: 'Russell Herod', short: 'Russell', role: 'Contributor / Co-developer (DANZ · flowb)' },
  entity: 'FlowBond / FlowBond Tech',
};

// Part 1 — the framing message (why the wording, and what's offered instead).
export const MESSAGE = {
  to: 'Russell',
  paragraphs: [
    "Thank you for being direct about how you'd like your time on FlowBond recognized. You're right to raise it — your work mattered, and it deserves to be named clearly rather than left vague. I've thought about it carefully, and I want to be just as direct back, because I respect you enough not to be vague in return.",
    "What you proposed. You asked to be recognized as a co-founder / co-creator of FlowBond. *(EDITABLE — set to the exact credit Russell requested.)*",
    "Why I can't put my name to that wording. This isn't about whether I value you — I do. It's about what recognition actually is. A credit only means something if it maps to the real record, and the moment it's attached to my signature it becomes something I'm vouching for — to investors doing diligence, to partners, to anyone who later asks \"who built what.\" If I sign off on a description that's larger than what happened, I'm not doing you a favor; I'm creating a claim that doesn't hold up the first time someone checks, and that exposes both of us — you to an awkward correction down the line, me to a record I can't stand behind.",
    "So the gap isn't your value — it's the size of the label. I can't honestly claim the bigger one, and I don't think you'd actually want a credit that doesn't survive scrutiny. The numbers below are the same ones any investor sees; they're why the wording has to match the record.",
    "What I can do — and want to do. I've written a formal Acknowledgment of Contribution that credits exactly what you did, in your own right, that you can use anywhere — your CV, LinkedIn, future work. It's accurate, it's generous about the real impact you had, and it's something I'll proudly stand behind if anyone ever asks. That's worth more than a bigger word I'd have to walk back.",
    "It's in this vault alongside the separation agreement. Please read it — if a detail of your contribution is captured wrong or sells you short, tell me and I'll fix it. Once it reflects the truth we both recognize, I'd be glad to sign it with you.",
  ],
  signoff: 'With genuine respect and thanks,\nSteph Ferrera',
};

// Part 0 — the Separation & Transition Agreement (primary document).
// Drafted from the real facts (Exhibit 3 transfers, no-equity, mutual release).
// A working framework, NOT legal advice — review with counsel before executing.
export const AGREEMENT = {
  title: 'Separation & Transition Agreement',
  subtitle: 'FlowBond Tech · Steph Ferrera ⟷ Russell Herod',
  effective: '____________  *(EDITABLE — effective date)*',
  parties:
    'This Separation & Transition Agreement (the "Agreement") is entered into between Steph Ferrera, individually and on behalf of FlowBond / FlowBond Tech (the "Company"), and Russell Herod ("Contributor"). Steph Ferrera and Russell Herod are each a "Party" and together the "Parties."',
  recitals: [
    'Contributor provided time, skill and engineering effort to the Company — principally on the DANZ / flowb (FlowBondTech) workstream — during the period of his involvement.',
    'No equity, ownership, co-founder, partnership, or continuing-compensation agreement was ever entered into between the Parties.',
    'The Parties wish to formalize Contributor’s separation, transfer all access and Company assets cleanly to the Company, fully and finally resolve any claims, and record an accurate Acknowledgment of Contribution (attached as Exhibit 5).',
  ],
  clauses: [
    { h: '1 · Separation', b: 'Contributor’s involvement with the Company has ended. Contributor holds no title, office, role, authority, or responsibility with the Company, and will not represent himself as acting for or on behalf of the Company after the effective date.' },
    { h: '2 · Transition of access & assets (Exhibit 3)', b: 'Contributor will transfer to the Company sole ownership and control of all Company assets and remove himself from all Company accounts, per the Closing Tasks Schedule (Exhibit 3): (a) domains — flowbond.tech, danz.now, flowb.me, pee.network; (b) all repositories and credentials; (c) communication accounts (Telegram / Base / Farcaster) with owner/admin + recovery to the Company; (d) Web3 keys, delivered via a secure off-platform channel, with the Company confirming control in writing; (e) Company crypto balances moved to the Company wallet; (f) Mercury, Stripe, and Coinbase accounts; (g) infrastructure (Supabase, Vercel, Apple/Google, DNS, secrets); and (h) social de-identification. Each item is verified before the closing completes.' },
    { h: '3 · No equity or ownership', b: 'Contributor acknowledges he holds, and has held, no equity, ownership interest, option, token allocation, profit share, or other continuing claim in the Company or any of its products, and that none was ever granted or agreed. This Agreement is full and final.' },
    { h: '4 · Mutual release', b: 'Each Party releases and forever discharges the other from any and all claims, demands, and liabilities, known or unknown, arising from or relating to Contributor’s involvement with the Company up to the effective date, except for the obligations created by this Agreement itself.' },
    { h: '5 · Confidentiality & return of materials', b: 'Contributor will keep the Company’s non-public information confidential and will not retain, copy, or use any Company code, credentials, data, or materials after the transfers in Section 2 are complete.' },
    { h: '6 · Non-disparagement', b: 'Neither Party will make false or disparaging statements about the other. Both may describe Contributor’s actual contribution truthfully, consistent with the Acknowledgment in Exhibit 5.' },
    { h: '7 · Recognition', b: 'The Company will issue the Acknowledgment of Contribution (Exhibit 5), which Contributor may reference in his professional materials. It is released to Contributor once the closing conditions are met, and stands alongside — and does not alter — this Agreement.' },
    { h: '8 · Entire agreement · governing law · counterparts', b: 'This Agreement, with its Exhibits, is the entire agreement between the Parties and supersedes any prior understanding. It is governed by the laws of [____________ *(EDITABLE — jurisdiction)*], may be signed in counterparts, and electronic signatures are binding.' },
  ],
  exhibits: [
    'Exhibit 1 — Stock Power (executed, held in escrow)',
    'Exhibit 2 — Resignation (executed, held in escrow)',
    'Exhibit 3 — Closing Tasks Schedule (the transfers in Section 2)',
    'Exhibit 5 — Acknowledgment of Contribution (the letter)',
  ],
};

// Part 2 — the signable Acknowledgment of Contribution.
export const ACKNOWLEDGMENT = {
  title: 'Acknowledgment of Contribution',
  issuedBy: 'Steph Ferrera, on behalf of FlowBond / FlowBond Tech',
  recognitionOf: 'Russell Herod',
  role: 'Contributor / Co-developer — DANZ · flowb',
  period: '2025-09 → 2026  *(EDITABLE — confirm exact dates)*',
  scope: [
    'Co-built the DANZ / flowb (FlowBondTech) workstream — the move-to-earn stack and the early agent service.',
    'Contributed time, skill and engineering effort during the period above. *(EDITABLE — add or refine specific items.)*',
  ],
  acknowledgment:
    'Steph Ferrera and FlowBond gratefully recognize the time, skill, and effort Russell Herod brought to this work, and the positive impact of his contribution during the period above. Russell is free to reference this contribution and this acknowledgment in his professional materials.',
  scopeClarity:
    'This is an acknowledgment of contribution only. It does not constitute or imply co-founder status, ownership, equity, or any continuing claim, role, or compensation, and no such agreement was previously in place. It stands alongside, and does not alter, the separation agreement between the parties.',
};
