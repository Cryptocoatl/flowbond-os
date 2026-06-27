// The documents in the vault. The Separation & Asset Transfer Agreement is the
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
      'Welcome, Russell. The cover note (my email), the revised Separation & Asset Transfer Agreement, and your Early Co-founder recognition are all below. Read it, and when you’re ready, verify with FBID and we sign together.',
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
    'Thank you for the detailed response. I’ve taken your points seriously and revised the agreement accordingly. The updated version is the one in this vault, ready to read and sign.',
    'What I incorporated from your markup: scope limited to FlowBond / DANZ / FlowB only, with Harmonik Habitats expressly excluded; the agreement is executed and delivered by both of us *before* any transfer occurs (Section 4); broad asset categories replaced with a precise, Company-only list in Exhibit A that doesn’t reach your personal assets; the personal language regarding counsel and nationality removed; mutual non-disparagement and mutual no-reference / no-endorsement clauses; no ongoing work obligation beyond the listed Closing deliverables; and Cryptocoatl recognized as mine and not part of any transfer.',
    'On recognition (Section 2), the language reflects your contributions to the initial infrastructure of the DANZ and FlowB workstreams, stated without any disparagement. That’s the characterization I can stand behind, and I’m open to your review of the exact wording.',
    'Wallet seeds and private keys are intentionally kept out of the document and delivered through a secure channel, as before.',
    'And I want to name the spirit of this plainly: it isn’t about fighting. It’s about facts and actions, and being transparent with each other. The health of a community starts in healthy personal relationships — so I want to close this cleanly and purely, with respect intact on both sides.',
    'Looking ahead: FBID — the identity powering this vault — will be a free API anyone can integrate into their own websites. I’d be especially happy to see it used for public goods and genuine social-regeneration projects. If that calls you, there’s room to build.',
    'Please review. I’d like to close this cleanly and promptly.',
  ],
  signoff: 'With love,\nStep by Steph',
};

// Russell's clear path to finalize, every step.
export const FINALIZE_STEPS = [
  { n: 1, key: 'fbid', title: 'Verify with FBID', detail: 'Tap “Verify with FBID,” log in with cryptokoh@gmail.com, and you’ll return here verified — that’s what unlocks signing. No password, ever.' },
  { n: 2, key: 'read', title: 'Read the cover note & the Agreement', detail: 'Read the cover note and the full Co-Founder Separation & Asset Transfer Agreement, including Exhibit A. If any detail is wrong, tell Estefanía before you sign — she’s open to your review of the wording.' },
  { n: 3, key: 'sign-agreement', title: 'Sign the Agreement (DocuSign)', detail: 'Once verified, sign the Agreement. The agreement is executed and delivered by both Parties before any transfer occurs (Section 4) — your transfer obligations only arise after full execution.' },
  { n: 4, key: 'sign-ack', title: 'Receive your Early Co-founder recognition', detail: 'Section 2 recognizes you as an early co-founder of DANZ and FlowB, without disparagement — yours to reference anywhere. The Acknowledgment letter (Document 2) restates it for your records.' },
  { n: 5, key: 'transfer', title: 'Complete the Exhibit A transfers (at Closing)', detail: 'Only the Company-only items in Exhibit A: domains (flowbond.tech, danz.now) to your Namecheap “stepbysteph”; Mercury, Stripe, Coinbase; FlowBond Tech GitHub repos; Telegram/Base/Farcaster; FlowBond social profiles. Wallet seeds & keys via secure channel only. Nothing personal, nothing outside scope.' },
  { n: 6, key: 'done', title: 'Closing completes', detail: 'When both signatures are in and the Exhibit A items are delivered and verified, the closing completes and the mutual release takes effect. Then we talk about what’s next.' },
];

export const GUIDE_FAQ = [
  { q: 'What do I do first?', a: 'Verify with FBID using cryptokoh@gmail.com (step 1). That single login unlocks signing.', keys: ['first', 'start', 'begin', 'fbid', 'login', 'verify'] },
  { q: 'Is this legally binding?', a: 'Yes — Section 19 allows electronic signature, binding under the U.S. ESIGN Act and UETA; it’s governed by Texas law (Section 18). DocuSign executes it, and a cryptographic fingerprint seals the exact text.', keys: ['binding', 'legal', 'valid', 'enforce', 'law', 'texas'] },
  { q: 'Do I have to transfer before signing?', a: 'No. Section 4 is explicit: the agreement is executed and delivered by both Parties before any transfer occurs. Your transfer obligations only arise after full execution.', keys: ['before', 'transfer first', 'condition', 'execute', 'order'] },
  { q: 'What exactly transfers?', a: 'Only the Company-only items in Exhibit A: the FlowBond/DANZ/FlowB domains, Mercury/Stripe/Coinbase, the FlowBond Tech GitHub repos, and the FlowBond comms/social accounts. Nothing personal, nothing outside scope — Harmonik and Cryptocoatl are expressly excluded.', keys: ['transfer', 'domain', 'repo', 'keys', 'crypto', 'mercury', 'stripe', 'coinbase', 'exhibit', 'asset', 'harmonik', 'cryptocoatl', 'personal'] },
  { q: 'What about wallet keys?', a: 'Seed phrases and private keys are never written in the agreement — they’re delivered only through a secure channel, as before.', keys: ['wallet', 'seed', 'private key', 'secure'] },
  { q: 'What happens after I sign?', a: 'It’s held signed in escrow; you complete the Exhibit A deliverables; Estefanía verifies each; then the mutual release takes effect and the closing completes.', keys: ['after', 'next', 'then', 'finish', 'done', 'release', 'complete', 'escrow'] },
];

// Part 0 — the real Co-Founder Separation & Asset Transfer Agreement (the .docx).
// `body` is the exact document text; lines that are headings are detected at render.
export const AGREEMENT = {
  title: 'Co-Founder Separation and Asset Transfer Agreement',
  subtitle: 'FlowBond Tech Inc. — DANZ — FlowB',
  effective: 'June 26, 2026',
  docx: true,
  body: [
    'This Co-Founder Separation and Asset Transfer Agreement (the “Agreement”) is made and entered into as of June 26, 2026 (the “Effective Date”), by and between Estefanía Ferrera, Founder and Chief Executive Officer of FlowBond Tech Inc. (“Estefanía”), and Russell Alan Herod, also known as koH Russell Herod (“Russell”). Estefanía and Russell are each a “Party” and together the “Parties.”',
    'Recitals',
    'A. The Parties have collaborated in connection with FlowBond Tech Inc. and the DANZ and FlowB workstreams.',
    'B. The Parties wish to effect a clean, complete, and amicable separation of Russell from the Company and the Scope, on the terms set out in this Agreement.',
    'C. This Agreement is limited to the Scope. Harmonik Habitats and all matters unrelated to the Scope are expressly excluded and are not affected by this Agreement.',
    'D. The GitHub organization “Cryptocoatl” is owned and controlled by Estefanía and is not subject to transfer under this Agreement.',
    'NOW, THEREFORE, in consideration of the mutual covenants and releases below, and intending to be legally bound, the Parties agree as follows:',
    '1. Definitions',
    '“Company” means FlowBond Tech Inc. “Scope” means the Company and the DANZ and FlowB workstreams, and excludes all other ventures, assets, and matters. “Company Assets” means the assets identified in Exhibit A, being the assets within the Scope that are owned by or held for the benefit of the Company and that are in Russell’s possession or under his control. “Closing” means the point at which this Agreement has been executed and delivered by both Parties, as described in Section 4.',
    '2. Recognition of Role',
    'The Company and Estefanía recognize Russell as an early co-founder who contributed to the initial infrastructure of the DANZ and FlowB workstreams. Nothing in this Agreement shall be construed as disparaging or diminishing Russell’s contributions to those workstreams.',
    '3. Ownership and Transfer of Interest',
    'Effective upon Closing, Russell transfers, assigns, and conveys to Estefanía all shares and any other equity, ownership, or membership interest he holds in the Company, together with all of his right, title, and interest in and to the Company and the Scope. Prior to Closing, this Section operates as a forward commitment to transfer, and not as a representation that any such transfer has already occurred or that either Party presently holds a particular ownership percentage.',
    '4. Condition Precedent; Execution Before Transfer',
    'This Agreement, including the recognition in Section 2, must be executed and delivered by both Parties before any transfer, assignment, or delivery of assets contemplated by this Agreement occurs. Russell’s transfer and delivery obligations under Sections 3 and 5 arise only upon, and are expressly conditioned on, full execution and delivery of this Agreement by both Parties. Closing occurs at the moment of such full execution and delivery.',
    '5. Transfer of Company Assets',
    'At Closing, Russell shall transfer, assign, or deliver to Estefanía (or to the Company, as Estefanía directs) only the Company Assets expressly identified in Exhibit A. Russell shall execute such registrar transfer forms, account-transfer requests, access grants, and similar instruments as are reasonably necessary to complete the transfers listed in Exhibit A. Russell shall transfer the Company Assets free of any lien, pledge, or encumbrance created by him, and shall not retain copies of credentials to the transferred accounts after Closing. For the avoidance of doubt, no asset, account, repository, credential, domain, or interest that is not listed in Exhibit A is subject to transfer under this Agreement.',
    '6. Excluded Assets and Matters',
    'The following are expressly excluded from this Agreement and from any transfer obligation: (a) Harmonik Habitats; (b) the GitHub organization “Cryptocoatl,” which is owned and controlled by Estefanía; (c) Russell’s personal assets and accounts that do not belong to or were not created for the Company; and (d) any venture, asset, or matter outside the Scope.',
    '7. No Ongoing Work Obligation',
    'Russell has no obligation to perform any work, service, or support beyond the discrete Closing deliverables expressly listed in Exhibit A. Any additional scope of work or support shall be agreed only in a separate signed writing specifying scope and compensation, and is not required by this Agreement.',
    '8. Mutual Non-Disparagement; No Misleading Statements',
    'Neither Party shall make, publish, or cause to be made any defamatory, disparaging, or materially misleading statement about the other Party, in any medium, concerning the Scope or the subject matter of this Agreement.',
    '9. Mutual No-Reference; No-Endorsement',
    'Neither Party shall represent the other as a reference, endorser, advisor, or supporter, nor use the other’s name, likeness, or association for promotional purposes, without that Party’s prior written consent.',
    '10. Mutual Release',
    'Effective at Closing, each Party, on behalf of itself and its successors and assigns, irrevocably releases and discharges the other Party from any and all claims, demands, and liabilities arising out of or relating to the Scope and arising on or before the Closing, excluding (a) any claim arising from a breach of this Agreement and (b) any matter outside the Scope, including Harmonik Habitats.',
    '11. Representations',
    'Each Party represents that it has full authority to enter into and perform this Agreement and that this Agreement is binding upon it. Russell represents that, to his knowledge, he has the right to transfer the Company Assets listed in Exhibit A and is not aware of any third-party right that would prevent their transfer. Each Party acknowledges that it enters into this Agreement voluntarily and after having had the opportunity to review it.',
    '12. Confidentiality',
    'Each Party shall keep confidential the non-public terms of this Agreement and any non-public information of the other Party obtained within the Scope, except as required by law or as reasonably necessary to enforce this Agreement.',
    '13. Further Assurances',
    'Each Party shall, upon reasonable request, execute such further documents and take such further actions as are reasonably necessary to give effect to the transfers listed in Exhibit A.',
    '14. Notices',
    'Any notice under this Agreement shall be in writing and delivered by email and shall be deemed given on confirmed delivery. Estefanía’s notice address is stepbystephbtm@gmail.com. Russell’s notice address is cryptokoh@gmail.com.',
    '15. Entire Agreement',
    'This Agreement, together with Exhibit A, constitutes the entire agreement between the Parties regarding the Scope and supersedes all prior drafts, discussions, and understandings on that subject, whether written or oral.',
    '16. Amendment; Waiver',
    'This Agreement may be amended only by a writing signed by both Parties. No waiver of any provision is effective unless in writing, and no single waiver constitutes a continuing waiver.',
    '17. Severability',
    'If any provision of this Agreement is held unenforceable, the remaining provisions shall continue in full force, and the unenforceable provision shall be modified to the minimum extent necessary to make it enforceable while preserving the Parties’ intent.',
    '18. Governing Law',
    'This Agreement shall be governed by and construed under the laws of the State of Texas, without regard to its conflict-of-laws principles. The Parties submit to the exclusive jurisdiction of the state and federal courts located in Travis County, Texas.',
    '19. Counterparts; Electronic Signature',
    'This Agreement may be executed in counterparts, including by electronic signature, each of which is deemed an original and all of which together constitute one and the same instrument.',
    'IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date.',
    'Exhibit A — Company Assets / Closing Deliverables',
    'The following are the specific Company Assets Russell will transfer or deliver at Closing. Wallet seed phrases and private keys are delivered only through a secure channel and are never recorded in this Agreement.',
    'Domains',
    'flowbond.tech — registrar transfer to Estefanía’s Namecheap account “stepbysteph,” including auth/EPP codes and full DNS control. danz.now — same. Any other FlowBond / DANZ / FlowB domain held by Russell — transferred to the same account.',
    'Payment & Financial Accounts (FlowBond-linked)',
    'Mercury — Russell removed; Estefanía as sole owner/administrator. Stripe — ownership/administration transferred to Estefanía; Russell removed. Coinbase — Russell removed; ownership and keys transferred to Estefanía (keys via secure channel only).',
    'Repositories',
    'All repositories under the FlowBond Tech GitHub organization — transfer of ownership/admin to Estefanía. (The Cryptocoatl organization is already owned by Estefanía and is not transferred under this Agreement.)',
    'Web3, Communication & Social Accounts (FlowBond-linked)',
    'Telegram, Base App, and Farcaster (FlowBond / DANZ / FlowB) — transfer of ownership/admin and credentials to Estefanía; any associated wallet seeds or keys delivered via secure channel only. FlowBond / DANZ / FlowB social profiles held by Russell — transfer or de-identification.',
    'Catch-All (Company property only)',
    'Any other asset, account, credential, or interest that belongs to or was created for the Company within the Scope and that is in Russell’s possession or control — transferred or returned to Estefanía at Closing. This Exhibit A is limited to Company property within the Scope. It does not reach Russell’s personal assets, Harmonik Habitats, or anything outside the Scope.',
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
  { k: 'Recognition — Russell', v: 'Early Co-founder · DANZ & FlowB (Section 2)', tone: 'good' as const },
  { k: 'Scope', v: 'FlowBond / DANZ / FlowB only', tone: 'fact' as const },
  { k: 'Excluded', v: 'Harmonik Habitats + Cryptocoatl + personal assets', tone: 'fact' as const },
  { k: 'Order', v: 'Both sign first — transfers only after (Section 4)', tone: 'good' as const },
  { k: 'Transfers', v: 'Only the Company-only list in Exhibit A', tone: 'pending' as const },
  { k: 'Mutual release', v: 'Effective at Closing', tone: 'pending' as const },
  { k: 'Governing law', v: 'Texas · Travis County', tone: 'fact' as const },
  { k: 'Execution', v: 'DocuSign + cryptographic seal + witnesses', tone: 'good' as const },
];
