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

// Part 0 — the full, official Separation & Transition Agreement (primary document).
// Drafted from the real facts. A complete framework, NOT legal advice — review
// with counsel before executing. Validated by cryptographic + on-chain means.
export const AGREEMENT = {
  title: 'Separation & Transition Agreement',
  subtitle: 'FlowBond / FlowBond Tech',
  effective: '____________  *(EDITABLE — effective date)*',
  parties:
    'This Separation & Transition Agreement (the “Agreement”) is made and entered into as of the Effective Date by and between Steph Ferrera, an individual, in her personal capacity and on behalf of FlowBond / FlowBond Tech and its products and affiliates (collectively, the “Company”), and Russell Herod, an individual (the “Contributor”). The Company and the Contributor are each a “Party” and together the “Parties.”',
  recitals: [
    'WHEREAS, the Company operates the FlowBond ecosystem, which was founded, owned, and principally built by Steph Ferrera;',
    'WHEREAS, the Contributor provided time, skill, and engineering effort to the Company, principally on the DANZ / flowb (FlowBondTech) workstream, during the period of his involvement (the “Engagement”);',
    'WHEREAS, no equity, ownership interest, option, token allocation, co-founder status, partnership, joint venture, or continuing-compensation arrangement was ever granted to or agreed with the Contributor;',
    'WHEREAS, the Parties wish to formalize the conclusion of the Engagement, effect the orderly and verified transfer of all Company access and assets, fully and finally resolve all claims between them, and record an accurate Acknowledgment of Contribution (Exhibit 5);',
    'WHEREAS, the Company offered to involve its legal counsel to ensure fairness to both Parties, and the Contributor declined that counsel; the Parties therefore adopt the objective, independently-verifiable methods of validation set forth in Article 11;',
    'NOW, THEREFORE, in consideration of the mutual covenants and promises herein, and for other good and valuable consideration, the receipt and sufficiency of which are acknowledged, the Parties agree as follows:',
  ],
  articles: [
    {
      n: '1', t: 'Definitions',
      paras: [
        '“Company Assets” means all domains, repositories, source code, credentials, keys, accounts, wallets, balances, infrastructure, data, brand and social assets used in or relating to the Company, including those listed in Exhibit 3.',
        '“Closing” means the point at which every item in Exhibit 3 has been completed and independently verified through the FlowScrow conditional-release system.',
        '“Effective Date” means the date this Agreement is last signed by a Party.',
      ],
    },
    {
      n: '2', t: 'Separation',
      paras: [
        '2.1  The Engagement is concluded. As of the Effective Date the Contributor holds no title, office, role, authority, mandate, or responsibility with the Company.',
        '2.2  The Contributor shall not, after the Effective Date, represent, hold himself out as, or act as a founder, co-founder, owner, officer, employee, partner, or agent of the Company, or bind the Company in any way.',
      ],
    },
    {
      n: '3', t: 'Transition of Access and Assets (Exhibit 3)',
      paras: [
        '3.1  The Contributor shall transfer to the Company sole ownership and control of all Company Assets and irrevocably remove himself from all Company accounts, in accordance with the Closing Tasks Schedule (Exhibit 3), including, without limitation:',
        '(a) Domains — flowbond.tech, danz.now, flowb.me, and pee.network — placed under the Company’s registrar control with the Contributor removed as registrant/contact;',
        '(b) Repositories and credentials — all source code repositories, API keys, and secrets, with the Company granted full ownership/admin and the Contributor removed;',
        '(c) Communication accounts — Telegram, Base, and Farcaster — owner/admin and recovery transferred to the Company and the Contributor removed;',
        '(d) Web3 keys — delivered to the Company via a secure off-platform channel, with the Company confirming control in writing; no key material is stored in this system;',
        '(e) Company crypto — all balances moved to the Company’s wallet, matching pre-verified amounts;',
        '(f) Financial accounts — Mercury, Stripe, and Coinbase — with the Company as sole owner/representative and the Contributor and his cards removed;',
        '(g) Infrastructure — Supabase, Vercel, Apple/Google, DNS, and secrets transferred to the Company; and',
        '(h) Social de-identification — profiles no longer present the Contributor as operating the Company.',
        '3.2  Each item is independently verified by the receiving Party before the Closing completes. The Contributor shall execute any further documents reasonably necessary to perfect the transfers.',
      ],
    },
    {
      n: '4', t: 'No Equity, Ownership, or Co-Founder Status',
      paras: [
        '4.1  The Contributor acknowledges and agrees that he holds, and has at all times held, no equity, ownership interest, share, option, warrant, token allocation, profit interest, revenue share, or other proprietary or continuing claim in the Company or any of its products, and that none was ever granted, promised, or agreed.',
        '4.2  The Contributor was not a founder or co-founder of the Company. This Agreement is full, final, and complete as to the Parties’ respective interests.',
      ],
    },
    {
      n: '5', t: 'Intellectual Property',
      paras: [
        '5.1  To the extent the Contributor contributed any work product, code, or materials to the Company, he hereby irrevocably assigns to the Company all right, title, and interest, including all intellectual-property rights, in and to such work product, and waives any moral rights therein.',
        '5.2  The Contributor retains no license to, and shall not use, the Company’s intellectual property after the Closing, except as expressly permitted by the Acknowledgment (Exhibit 5).',
      ],
    },
    {
      n: '6', t: 'Consideration and Recognition',
      paras: [
        '6.1  In consideration of the covenants herein, the Company shall issue to the Contributor the Acknowledgment of Contribution (Exhibit 5), accurately recognizing his actual contribution, which he may reference in his professional materials.',
        '6.2  The Acknowledgment is released to the Contributor upon the Closing and the Company’s approval, stands alongside this Agreement, and does not alter it.',
      ],
    },
    {
      n: '7', t: 'Mutual General Release of Claims',
      paras: [
        '7.1  Each Party, on behalf of itself and its heirs, successors, and assigns, hereby fully and forever releases and discharges the other Party from any and all claims, demands, causes of action, obligations, damages, and liabilities of any kind, whether known or unknown, suspected or unsuspected, arising from or relating to the Engagement and the relationship between the Parties up to the Effective Date.',
        '7.2  This release does not extend to the obligations created by this Agreement itself. Each Party knowingly and voluntarily waives any statutory or common-law protection that would otherwise limit a release of unknown claims.',
      ],
    },
    {
      n: '8', t: 'Confidentiality and Return of Materials',
      paras: [
        '8.1  The Contributor shall hold the Company’s non-public information in strict confidence and shall not use or disclose it.',
        '8.2  The Contributor shall not retain, copy, or use any Company code, credentials, data, or materials after completion of the transfers in Article 3, and shall destroy or return any remaining copies.',
        '8.3  The terms of this Agreement are confidential, save as required to enforce it or by law.',
      ],
    },
    {
      n: '9', t: 'Non-Disparagement; Truthful Description',
      paras: [
        '9.1  Neither Party shall make any false or disparaging statement about the other.',
        '9.2  Both Parties may describe the Contributor’s actual contribution truthfully and consistently with Exhibit 5. Nothing herein prevents either Party from making truthful statements or from responding to lawful process.',
      ],
    },
    {
      n: '10', t: 'Independent Counsel; Record Regarding Counsel',
      paras: [
        '10.1  Each Party has had a full and fair opportunity to consult independent legal counsel of their own choosing before executing this Agreement and enters into it knowingly and voluntarily.',
        '10.2  The Company offered to involve its legal counsel to ensure fairness to both Parties. The Contributor declined to engage the Company’s counsel and characterized that counsel as “fake” by reason of that counsel’s Mexican nationality. This fact is recorded here for the avoidance of doubt.',
        '10.3  The Company affirms, without qualification, the legitimacy, competence, and good standing of its counsel and of Mexican legal professionals generally. Nationality bears no relation to legal validity or professional standing, and the Company does not accept any characterization to the contrary.',
        '10.4  Because the Contributor declined the Company’s counsel, the Parties establish the integrity and standing of this Agreement through the objective, independently-verifiable technological methods set forth in Article 11 — methods that depend on no single advisor and are open to verification by any counsel the Contributor may choose, of any nationality.',
      ],
    },
    {
      n: '11', t: 'Method of Validation (Cryptographic and On-Chain)',
      paras: [
        '11.1  Cryptographic fingerprint. The canonical text of this Agreement is reduced to a unique cryptographic fingerprint (a keccak-256 hash), shown with this document. Altering a single character changes the fingerprint, making any tampering immediately detectable by anyone, anywhere.',
        '11.2  Immutable audit trail. Every material action — opening, reading, and signing — is written to an append-only audit log that cannot be edited or deleted, each entry bearing a trusted timestamp.',
        '11.3  On-chain anchor. The fingerprint may be anchored to the Base (Ethereum Layer-2) public blockchain as a tamper-evident, time-stamped proof of existence that no Party controls and that anyone may independently verify, permanently.',
        '11.4  Electronic signatures. Electronic signatures captured through this system are valid and binding to the fullest extent permitted by applicable electronic-signature law, including the U.S. ESIGN Act and the Uniform Electronic Transactions Act (UETA) and equivalent provisions. Binding execution may additionally be completed via DocuSign and confirmed by counsel.',
        '11.5  Neutrality. The foregoing methods are mathematics and public infrastructure — neutral, free of bias, and verifiable by any person of any nationality. They are not, and cannot be, “fake.”',
      ],
    },
    {
      n: '12', t: 'Representations and Warranties',
      paras: [
        '12.1  Each Party represents that it has full authority to enter into this Agreement and that doing so does not breach any other obligation.',
        '12.2  The Contributor represents that he has disclosed all Company Assets and access in his possession or control and has not retained any undisclosed copy, credential, or claim.',
      ],
    },
    {
      n: '13', t: 'Governing Law; Dispute Resolution',
      paras: [
        '13.1  This Agreement is governed by, and construed in accordance with, the laws of [____________ *(EDITABLE — jurisdiction)*], without regard to conflict-of-laws rules.',
        '13.2  The Parties shall first attempt to resolve any dispute in good faith. Any unresolved dispute shall be submitted to the courts or arbitral forum of the governing jurisdiction, and the cryptographic and on-chain records described in Article 11 shall be admissible as evidence of the document’s integrity and the Parties’ actions.',
      ],
    },
    {
      n: '14', t: 'Electronic Signature; Counterparts',
      paras: [
        '14.1  This Agreement may be executed electronically and in counterparts, each of which is an original and all of which together constitute one instrument.',
        '14.2  An electronic or digital signature shall have the same force and effect as a handwritten signature.',
      ],
    },
    {
      n: '15', t: 'Miscellaneous',
      paras: [
        '15.1  Entire Agreement. This Agreement and its Exhibits constitute the entire agreement between the Parties and supersede all prior understandings, written or oral.',
        '15.2  Amendment. No amendment is effective unless in writing and signed (including electronically) by both Parties.',
        '15.3  Severability. If any provision is held unenforceable, the remainder continues in full force.',
        '15.4  No Waiver. No waiver of any provision is a waiver of any other or any subsequent breach.',
      ],
    },
  ],
  exhibits: [
    'Exhibit 1 — Stock Power (executed, held in escrow)',
    'Exhibit 2 — Resignation (executed, held in escrow)',
    'Exhibit 3 — Closing Tasks Schedule (the verified transfers in Article 3)',
    'Exhibit 5 — Acknowledgment of Contribution (the letter)',
  ],
};

// "Where we stand today" — the transparent factual standing.
export const STANDING = [
  { k: 'Equity / ownership held by Contributor', v: '0% — none', tone: 'fact' as const },
  { k: 'Founder / co-founder status', v: 'None — never granted or agreed', tone: 'fact' as const },
  { k: 'Contribution', v: 'DANZ / flowb workstream — documented & acknowledged', tone: 'good' as const },
  { k: 'Asset & access transfers (Exhibit 3)', v: 'Pending — verified item-by-item through Closing', tone: 'pending' as const },
  { k: 'Mutual release of claims', v: 'Offered — effective upon signature', tone: 'pending' as const },
  { k: 'Recognition (Acknowledgment letter)', v: 'Issued — ready to sign', tone: 'good' as const },
  { k: 'Company counsel', v: 'Offered by Company; declined by Contributor', tone: 'fact' as const },
  { k: 'Validation method', v: 'Cryptographic fingerprint + on-chain anchor + audit trail', tone: 'good' as const },
];

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
