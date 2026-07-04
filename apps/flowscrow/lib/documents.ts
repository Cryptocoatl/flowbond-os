// The documents in the vault. The Mutual Dissolution, Wind-Up and Release
// real, revised .docx (June 26 2026) — the exact text signed via DocuSign.

export const PARTIES = {
  steph: { full: 'Estefanía Ferrera', short: 'Steph', role: 'Founder & CEO, FlowBond Tech Inc.' },
  russell: { full: 'Russell Herod', short: 'Russell', role: 'Early Co-founder — DANZ & FlowB' },
  deven: { full: 'Deven', short: 'Deven', role: 'Contributor' },
  entity: 'FlowBond Tech Inc.',
};

// View-only witnesses (each has a private code; never sign/download).
export const WITNESSES = ['Anup', 'Jackson', 'Jeff', 'Ryan', 'Roman', 'Nia'];

// A personal note shown to each person when they open the vault (keyed by person_key).
export const PERSONAL: Record<string, { title: string; paras: string[] }> = {
  steph: {
    title: 'This closing is yours, Estefanía',
    paras: [
      'This is your vault — you are the founder and sole owner of FlowBond Tech Inc. Verify with your cryptocoatl FBID to sign and release. Everything here is yours to issue.',
    ],
  },
  russell: {
    title: 'Russell — your cover note and the agreement are below',
    paras: [
      'Welcome, Russell. The cover note (my email), the Mutual Dissolution, Wind-Up and Release Agreement, and your Early Co-founder recognition are all below. Read it, and when you’re ready, verify with FBID and we sign together.',
    ],
  },
  roman: {
    title: 'Roman — you were there at the origin',
    paras: [
      'Roman, you’re my original early co-founder, and I’m putting that on the record where it belongs. You may not have had time to build a lot, but what you did mattered: the BLE and movement-tracking for the smart-watch integration, and standing with us at the very first DANZ event in Argentina — DanzConnect — with 100+ people in the room.',
      'You’re here as a witness to this closing with Russell. And once that signature is done, I want us to sit down — just you and me — and talk about our next step: whether you want to step into active development in FlowBond, or what position feels right for you. I love you so, so, so much, and I want the future of this built with you in it.',
    ],
  },
  anup: {
    title: 'Anup — a stand of harmony in the chaos',
    paras: [
      'Anup, thank you for being a stand of harmony in all this chaos. I’m here to support any Harmonik needs you have, always. I love you — and I’d love for you to witness this, and to experience the tech I built for us to carry forward: real contracts and agreements for the community.',
    ],
  },
  jackson: {
    title: 'Jackson — there’s a whole world for your land',
    paras: [
      'Jackson, your community building, your gardens, the honey, the community astrologic mapping — and so much more — are exactly the kind of real, rooted work I want to build with. There’s a whole world I’d love to integrate into your land, and I want to put FBID into the hands of your community so it’s truly theirs.',
      'You’re here as a witness to this closing, and I see you as a big part of where this goes next. Let’s keep dreaming it out loud.',
    ],
  },
  jeff: {
    title: 'Jeff — advisor, and a real conversation ahead',
    paras: [
      'Jeff, you’ve been a great advisor and a real support through this whole process — thank you. I also want you to truly see FlowScrow, the escrow I built (this is it), and to have a serious conversation about how you flow into my world. You’re here as a witness to this closing.',
    ],
  },
  ryan: {
    title: 'Ryan — out of our fields, into what we build',
    paras: [
      'Ryan, we have a special relationship — and I want this situation to stay completely out of our fields, so it never touches what matters between us. What I care about is keeping our focus on what we can actually build together. You’re here as a witness to this closing, and I’m grateful for you.',
    ],
  },
  nia: {
    title: 'Nia — my goddess guardian',
    paras: [
      'Nia, my goddess guardian — my partner and my spiritual support through all of this. Having you witness this means everything to me; your presence blesses the whole closing. Thank you for holding the sacred while I hold the structure. I love you, deeply.',
    ],
  },
};

// Part 1 — the cover note (the email to Russell), shown before the agreement.
export const MESSAGE = {
  to: 'Russell',
  paragraphs: [
    'Russell — Thank you for the openness in where we landed. Dissolving the company together is the cleanest and kindest way to close this chapter. This agreement covers it: we voluntarily dissolve FlowBond Tech Inc. and wind it down properly; the FlowBond and DANZ domains, code, and names come to Estefanía to carry forward; you commit not to use the FlowBond or DANZ names going forward; and we give each other a full mutual release and close the accounts. Keys and seeds stay out of the document and are handled securely. The FlowScrow checklist below shows the order of steps so nothing is left hanging. — Estefanía',
  ],
  signoff: '',
};

// Russell's clear path to finalize, every step.
export const FINALIZE_STEPS = [
  { n: 1, key: 'fbid', title: 'Verify with FBID', detail: 'Tap “Verify with FBID,” log in with cryptokoh@gmail.com, and you’ll return here verified — that’s what unlocks signing. No password, ever.' },
  { n: 2, key: 'read', title: 'Read the cover note & the Agreement', detail: 'Read the cover note and the full Mutual Dissolution, Wind-Up and Release Agreement, including Exhibits 1–3. If any detail is wrong, tell Estefanía before you sign — she’s open to your review of the wording.' },
  { n: 3, key: 'sign-agreement', title: 'Sign the Agreement (DocuSign)', detail: 'Once verified, sign the Agreement — this also serves as your Consent to Voluntary Dissolution (Exhibit 1) and resignation. It’s executed and delivered by both Parties before any transfer, resignation, or Dissolution filing occurs (Section 5) — your obligations only arise after full execution.' },
  { n: 4, key: 'sign-ack', title: 'Receive your Early Co-founder recognition', detail: 'Your recognition as an early co-founder of DANZ and FlowB lives in the separate Acknowledgment of Contribution (Document 2), stated without disparagement — yours to reference anywhere, unaffected by the Dissolution.' },
  { n: 5, key: 'transfer', title: 'Complete the Exhibit 2 transfers (Phase B)', detail: 'Only the Company-only items in Exhibit 2: domains (flowbond.tech, danz.now, flowb.me, pee.network) to Estefanía’s Namecheap “stepbysteph”; Mercury, Stripe, Coinbase; the former FlowBond Tech GitHub org; Telegram/Base/Farcaster; FlowBond social profiles. Wallet seeds & keys via secure channel only. Nothing personal, nothing outside scope.' },
  { n: 6, key: 'done', title: 'Dissolution filings complete (Phase C)', detail: 'Final federal and Texas franchise tax returns filed, Certificate of Account Status obtained from the Comptroller, then the Certificate of Termination filed with the Texas Secretary of State. Once that’s confirmed, the Dissolution and the mutual release take effect and escrow releases — tracked openly for you and every witness the whole way.' },
];

export const GUIDE_FAQ = [
  { q: 'What do I do first?', a: 'Verify with FBID using cryptokoh@gmail.com (step 1). That single login unlocks signing.', keys: ['first', 'start', 'begin', 'fbid', 'login', 'verify'] },
  { q: 'Is this legally binding?', a: 'Yes — Section 19 allows electronic signature, binding under the U.S. ESIGN Act and UETA; it’s governed by Texas law (Section 18, Travis County venue). DocuSign executes it, and a cryptographic fingerprint seals the exact text.', keys: ['binding', 'legal', 'valid', 'enforce', 'law', 'texas'] },
  { q: 'Is the company actually closing?', a: 'Yes. This is a real Dissolution: FlowBond Tech Inc. files final tax returns, obtains a Texas Comptroller Certificate of Account Status, then files a Certificate of Termination with the Texas Secretary of State (Exhibit 3, Phase C). The Company ceases to exist once that’s filed.', keys: ['dissolve', 'dissolution', 'close', 'terminate', 'termination', 'wind up', 'wind-up', 'company'] },
  { q: 'Do I have to transfer before signing?', a: 'No. Section 5 is explicit: the agreement is executed and delivered by both Parties before any transfer, resignation, or Dissolution filing occurs. Your obligations only arise after full execution.', keys: ['before', 'transfer first', 'condition', 'execute', 'order', 'sequencing'] },
  { q: 'What exactly transfers?', a: 'Only the Company-only items in Exhibit 2: the FlowBond/DANZ/FlowB domains, Mercury/Stripe/Coinbase, the former FlowBond Tech GitHub org, and the FlowBond comms/social accounts — plus the Brand itself (Section 4). Nothing personal, nothing outside scope — Harmonik is expressly excluded, and cryptocoatl / FlowBond HQ are already Estefanía’s.', keys: ['transfer', 'domain', 'repo', 'keys', 'crypto', 'mercury', 'stripe', 'coinbase', 'exhibit', 'asset', 'harmonik', 'cryptocoatl', 'personal', 'brand'] },
  { q: 'What about wallet keys?', a: 'Seed phrases and private keys are never written in the agreement — they’re delivered only through a secure channel, as before (Section 12).', keys: ['wallet', 'seed', 'private key', 'secure'] },
  { q: 'What happens after I sign?', a: 'It’s held signed in escrow; Phase B transfers complete and Estefanía verifies each; then Phase C — the actual Dissolution filings — complete in sequence; then the mutual release takes effect and escrow releases.', keys: ['after', 'next', 'then', 'finish', 'done', 'release', 'complete', 'escrow'] },
];

// Part 0 — the real Mutual Dissolution, Wind-Up and Release Agreement (the .docx,
// supplied 2026-07-04). `body` is the exact document text; lines that are headings
// are detected at render. This supersedes the earlier Separation & Asset Transfer
// Agreement draft — FlowBond Tech Inc. is being formally dissolved, not just
// separated from Russell.
export const AGREEMENT = {
  title: 'Mutual Dissolution, Wind-Up and Release Agreement',
  subtitle: 'FlowBond Tech Inc. — a Texas corporation',
  effective: 'June 26, 2026',
  docx: true,
  body: [
    'This Mutual Dissolution, Wind-Up and Release Agreement (the “Agreement”) is made as of June 26, 2026 (the “Effective Date”), by and between Estefanía Ferrera, Founder and Chief Executive Officer (“Estefanía”), and Russell Alan Herod, also known as koH Russell Herod (“Russell”), being the founders and shareholders of FlowBond Tech Inc. Each is a “Party” and together the “Parties.”',
    'Recitals',
    'A. FlowBond Tech Inc. (the “Company”) is a Texas for-profit corporation (SOS File No. 806178572; EIN 39-3913669; formed August 20, 2025; principal office 5900 Balcones Drive #15266, Austin, TX 78731).',
    'B. The Parties have jointly and voluntarily decided to dissolve and wind up the Company and to separate cleanly and permanently.',
    'C. As part of the wind-up, the Parties wish to transfer certain assets to Estefanía, confirm the disposition of the FlowBond and DANZ Brand, close the Company’s accounts, and grant mutual releases.',
    'D. Harmonik Habitats and all matters outside the Company and the FlowBond / DANZ / FlowB workstreams (the “Scope”) are expressly excluded.',
    'NOW, THEREFORE, in consideration of the mutual covenants and releases below, and intending to be legally bound, the Parties agree as follows:',
    '1. Definitions',
    '“Brand” means the names, trademarks, service marks, logos, trade dress, domain-associated identity, and all associated goodwill of “FlowBond” and “DANZ,” and any confusingly similar name or mark.',
    '“Domains” means flowbond.tech, danz.now, flowb.me, pee.network, and any other domain within the Scope held by or for the Company or Russell.',
    '“Company Assets” means the Domains, the Brand, all Company code, repositories, and product intellectual property, and the accounts listed in Exhibit 2.',
    '“Closing” means the point at which this Agreement has been executed and delivered by both Parties.',
    '“Dissolution” means the voluntary termination of the Company under the Texas Business Organizations Code, completed by filing a Certificate of Termination with the Texas Secretary of State following tax clearance.',
    '2. Consent to Voluntary Dissolution and Wind-Up',
    '•  Each Party, in its capacity as shareholder and director, consents to and authorizes the voluntary Dissolution of the Company.',
    '•  The Parties shall cooperate to wind up the Company, including: settling or providing for the Company’s known liabilities; filing final federal and Texas franchise tax returns; obtaining a Certificate of Account Status (tax clearance) from the Texas Comptroller; and filing the Certificate of Termination with the Texas Secretary of State.',
    '•  Russell shall resign from all positions with the Company — director, officer, employee, contractor, authorized signatory, and agent — effective at Closing, and confirms he has no claim for compensation, fees, or reimbursement.',
    '3. Transfer of Assets to Estefanía',
    '•  As part of the wind-up, and effective at Closing, the Company and Russell transfer and assign to Estefanía all right, title, and interest in and to: (i) the Domains; (ii) all Company code, repositories, and product intellectual property; and (iii) the Brand (as further provided in Section 4).',
    '•  The Domains shall be transferred to Estefanía’s Namecheap account “stepbysteph,” including auth/EPP codes and full DNS control.',
    '•  The GitHub user “cryptocoatl” and the GitHub organization “FlowBond HQ” are Estefanía’s and are not subject to this Agreement. The former “FlowBond Tech” GitHub organization shall be transferred to Estefanía; to the extent any portion is not transferred, it shall be archived and clearly marked as deprecated, non-living code that is not part of the live FlowBond ecosystem, and Russell shall not represent it as active or as associated with the Brand.',
    '•  The financial accounts listed in Exhibit 2 (Mercury, Stripe, Coinbase) shall be closed or transferred as Estefanía directs, and Russell shall be removed from each.',
    '4. FlowBond and DANZ Brand',
    '•  Russell irrevocably waives, assigns, and transfers to Estefanía any and all right, title, and interest he holds in the Brand, including all associated goodwill and any trademark or service-mark rights.',
    '•  Russell covenants, perpetually and in every jurisdiction, that he will not use, adopt, register, apply to register, or claim any right in “FlowBond” or “DANZ” or any confusingly similar name or mark.',
    '•  Russell acknowledges and agrees that Estefanía may freely use, develop, license, and register the Brand (including with the USPTO and IMPI) without any further consent from, payment to, or claim by Russell.',
    '•  This Section survives the Dissolution and termination of the Company indefinitely.',
    '5. Sequencing; Execution Before Transfer',
    'This Agreement must be executed and delivered by both Parties before any transfer, resignation, account change, or Dissolution filing occurs. The order of Closing steps is set out in Exhibit 3 (FlowScrow Closing & Escrow Plan): the Parties execute first; asset transfers and the Brand waiver are completed and verified next; and the Dissolution filings and account closures are completed last. Russell’s obligations arise only upon full execution and delivery of this Agreement.',
    '6. No Ongoing Work Obligation',
    'Neither Party owes the other any work, service, or support beyond the discrete Closing steps in Exhibit 3. Any additional scope would be agreed only in a separate signed writing specifying scope and compensation.',
    '7. Mutual Release',
    'Effective at Closing, each Party, on behalf of itself and its successors and assigns, irrevocably releases and discharges the other from any and all claims, demands, and liabilities arising out of or relating to the Company or the Scope and arising on or before the Closing. Russell specifically releases any claim to the Company, its assets, the Domains, and the Brand, and any claim against Estefanía relating to the Company. This release excludes (a) any claim arising from a breach of this Agreement and (b) any matter outside the Scope, including Harmonik Habitats.',
    '8. Representations and Warranties',
    '•  Each Party represents that it has full authority to enter into and perform this Agreement and that this Agreement is binding upon it.',
    '•  Russell represents that he has disclosed all Company liabilities, obligations, and third-party claims known to him; that he has not incurred any undisclosed liability or obligation binding the Company; and that he holds no claim to the Company’s assets or the Brand other than as released and assigned here.',
    '•  Each Party enters into this Agreement voluntarily and after having had the opportunity to review it.',
    '9. Indemnification',
    'Russell shall indemnify, defend, and hold Estefanía harmless from and against any loss, liability, cost, or expense (including reasonable legal fees) arising out of (a) his breach of this Agreement; (b) his breach of the Brand covenant in Section 4; or (c) any undisclosed liability or obligation he created that binds the Company.',
    '10. Mutual Non-Disparagement; No-Reference',
    'Neither Party shall make any defamatory, disparaging, or materially misleading statement about the other, nor represent the other as a reference, endorser, advisor, or supporter, nor use the other’s name, likeness, or association for promotional purposes, without prior written consent.',
    '11. Confidentiality',
    'Each Party shall keep confidential the non-public terms of this Agreement and any non-public information of the other obtained within the Scope, except as required by law or as reasonably necessary to enforce this Agreement or complete the Dissolution filings.',
    '12. Wallet Seeds and Keys',
    'Any wallet seed phrases or private keys required to complete a transfer are delivered only through a secure channel agreed by the Parties and are never recorded in this Agreement or its exhibits.',
    '13. Further Assurances',
    'Each Party shall, upon reasonable request, execute the resolutions, transfer forms, registrar authorizations, tax filings, and termination documents reasonably necessary to give effect to the transfers and the Dissolution.',
    '14. Notices',
    'Notices shall be in writing and delivered by email, deemed given on confirmed delivery. Estefanía: stepbystephbtm@gmail.com. Russell: cryptokoh@gmail.com.',
    '15. Entire Agreement',
    'This Agreement, with its exhibits, is the entire agreement between the Parties regarding the Scope and the Dissolution, and supersedes all prior drafts, discussions, and understandings, whether written or oral.',
    '16. Amendment; Waiver',
    'This Agreement may be amended only by a writing signed by both Parties. No waiver is effective unless in writing, and no single waiver is a continuing waiver.',
    '17. Severability',
    'If any provision is held unenforceable, the remainder continues in full force, and the provision is modified to the minimum extent necessary to be enforceable while preserving the Parties’ intent.',
    '18. Governing Law; Venue',
    'This Agreement is governed by the laws of the State of Texas, without regard to conflict-of-laws principles. The Parties submit to the exclusive jurisdiction of the state and federal courts located in Travis County, Texas.',
    '19. Counterparts; Electronic Signature',
    'This Agreement may be executed in counterparts, including by electronic signature, each an original and together one instrument.',
    'IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date.',
    'Exhibit 1 — Consent to Voluntary Dissolution',
    'The undersigned, being all of the shareholders and directors of FlowBond Tech Inc., a Texas corporation, hereby consent to and authorize the voluntary dissolution and winding up of the Company under the Texas Business Organizations Code, the settlement or provision for its liabilities, the distribution of its remaining assets as provided in the Agreement of even date, and the filing of a Certificate of Termination with the Texas Secretary of State following tax clearance from the Texas Comptroller.',
    'Exhibit 2 — Domain & Account Schedule',
    'Domains (transfer to Namecheap “stepbysteph” + auth/EPP codes)',
    '•  flowbond.tech',
    '•  danz.now',
    '•  flowb.me',
    '•  pee.network',
    '•  Any other Scope domain held by Russell — [list]',
    'GitHub',
    '•  User “cryptocoatl” — Estefanía’s; no action.',
    '•  Organization “FlowBond HQ” — Estefanía’s (live ecosystem); no action.',
    '•  Former organization “FlowBond Tech” — transfer to Estefanía; otherwise archive and clearly mark as deprecated / non-living code, disclaimed from the live ecosystem.',
    'Financial Accounts (Russell removed; close or transfer as Estefanía directs)',
    '•  Mercury',
    '•  Stripe',
    '•  Coinbase',
    'Web3 / Communication / Social (transfer or de-identify; seeds & keys via secure channel only)',
    '•  Telegram, Base App, Farcaster',
    '•  Social profiles — [list handles: X, Instagram, TikTok, LinkedIn]',
    'Exhibit 3 — FlowScrow Closing & Escrow Plan',
    'A conditional, phased close. Each phase completes only after the prior phase is verified. Witnesses follow each phase transparently through the FlowScrow record; the mutual release (Section 7) and any escrowed items release only when Phase B is fully verified and Phase C filings are confirmed.',
    'Phase A — Execution (into escrow)',
    '☐  Both Parties execute this Agreement (electronic signature).',
    '☐  Russell signs the Consent to Dissolution (Exhibit 1) and resignation.',
    '☐  Russell signs the Brand waiver/assignment (Section 4).',
    '☐  Witnesses recorded; FlowScrow tracking opened.',
    'Phase B — Transfers & Covenants (verified by Estefanía; visible to witnesses)',
    '☐  Domains (flowbond.tech, danz.now, flowb.me, pee.network) transferred to “stepbysteph”; auth/EPP codes delivered; DNS confirmed.',
    '☐  Former FlowBond Tech GitHub org transferred to Estefanía (or archived + marked non-living).',
    '☐  Mercury — Russell removed; Estefanía sole admin/owner.',
    '☐  Stripe — ownership to Estefanía; Russell removed.',
    '☐  Coinbase — Russell removed; keys transferred via secure channel.',
    '☐  Telegram / Base App / Farcaster / social profiles transferred or de-identified.',
    '☐  Estefanía confirms all Phase B items complete.',
    'Phase C — Dissolution & Clearing',
    '☐  Final federal (Form 1120) and Texas final franchise tax reports filed.',
    '☐  Certificate of Account Status (tax clearance) obtained from Texas Comptroller.',
    '☐  Certificate of Termination filed with Texas Secretary of State.',
    '☐  All remaining Company bank/financial accounts closed.',
    '☐  Dissolution effective; mutual release effective; witnesses attest completion; escrow releases.',
    'Note: Texas requires the Comptroller’s tax-clearance certificate before the Secretary of State will accept the Certificate of Termination. Phase C is a sequence of filings, not a single signature.',
  ],
};

// Part 2 — the Acknowledgment of Contribution (Document 2), restating Section 2.
export const ACKNOWLEDGMENT = {
  title: 'Acknowledgment of Contribution',
  issuedBy: 'Estefanía Ferrera, on behalf of FlowBond Tech Inc.',
  recognitionOf: 'Russell Herod',
  role: 'Early Co-founder — DANZ & FlowB',
  period: 'August 13, 2025 → March 30, 2026',
  scope: [
    'Recognized as an early co-founder who contributed to the initial infrastructure of the DANZ and FlowB workstreams.',
    'This restates the recognition in Section 2 of the Agreement, stated without any disparagement.',
  ],
  acknowledgment:
    'Estefanía Ferrera and FlowBond Tech Inc. recognize Russell Herod as an early co-founder of the DANZ and FlowB workstreams, and the contribution he made to their initial infrastructure. Russell is free to reference this recognition in his professional materials.',
  also: [
    {
      name: 'Roman',
      role: 'Original Early Co-founder',
      text:
        'The Company recognizes Roman as an original Early Co-founder of FlowBond / DANZ — early work on BLE and movement-tracking for smart-watch integration, and support of the first DANZ event in Argentina, DanzConnect (100+ attendees).',
    },
    {
      name: 'Deven',
      role: 'Contributor · September 3 – November 3, 2025 *(EDITABLE)*',
      text: 'The Company also gratefully acknowledges the contribution of Deven to FlowBond.',
    },
  ],
  scopeClarity:
    'This acknowledgment restates the recognition in Section 2 and does not alter the Agreement. It confers no equity, ownership, or continuing claim beyond the terms of the Agreement.',
};

// "Where we stand today" — the transparent factual standing (per the real agreement).
export const STANDING = [
  { k: 'What this is', v: 'Formal Dissolution of FlowBond Tech Inc.', tone: 'fact' as const },
  { k: 'Recognition — Russell', v: 'Early Co-founder · DANZ & FlowB (Acknowledgment, Document 2)', tone: 'good' as const },
  { k: 'Scope', v: 'FlowBond / DANZ / FlowB only', tone: 'fact' as const },
  { k: 'Excluded', v: 'Harmonik Habitats + cryptocoatl + FlowBond HQ + personal assets', tone: 'fact' as const },
  { k: 'Order', v: 'Both sign first — transfers, then Dissolution filings (Section 5)', tone: 'good' as const },
  { k: 'Transfers', v: 'Only the Company-only list in Exhibit 2 (Phase B)', tone: 'pending' as const },
  { k: 'Dissolution filings', v: 'Tax clearance → Certificate of Termination (Exhibit 3, Phase C)', tone: 'pending' as const },
  { k: 'Mutual release', v: 'Effective at Closing', tone: 'pending' as const },
  { k: 'Governing law', v: 'Texas · Travis County', tone: 'fact' as const },
  { k: 'Execution', v: 'DocuSign + cryptographic seal + witnesses', tone: 'good' as const },
];
