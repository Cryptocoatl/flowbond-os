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
