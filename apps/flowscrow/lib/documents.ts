// The documents in the vault. Specifics filled from what's known; a few spots are
// marked EDITABLE so they can be tuned before signing.

export const PARTIES = {
  steph: { full: 'Estefanía Ferrera', short: 'Steph', role: 'Founder & principal builder' },
  russell: { full: 'Russell Herod', short: 'Russell', role: 'Early Co-founder — DANZ & FlowB' },
  deven: { full: 'Deven', short: 'Deven', role: 'Contributor' },
  entity: 'FlowBond / FlowBond Tech',
};

// View-only witnesses (each has a private code; never sign/download).
export const WITNESSES = ['Anup', 'Jackson', 'Jeff', 'Ryan', 'Roman'];

// A personal note shown to each person when they open the vault (keyed by person_key).
export const PERSONAL: Record<string, { title: string; paras: string[] }> = {
  steph: {
    title: 'This closing is yours, Estefanía',
    paras: [
      'This is your vault — you are the founder and sole owner of FlowBond. Verify with your cryptocoatl FBID to sign and release. Everything here is yours to issue.',
    ],
  },
  russell: {
    title: 'Russell — your note and your recognition are below',
    paras: [
      'Welcome, Russell. Your full note, your Early Co-founder recognition, and both documents are below. When you’re ready, verify with FBID and we sign together.',
    ],
  },
  roman: {
    title: 'Roman — you were there at the origin',
    paras: [
      'Roman, you’re my original early co-founder, and I’m putting that on the record where it belongs. You may not have had time to build a lot, but what you did mattered: the BLE and movement-tracking for the smart-watch integration, and standing with us at the very first DANZ event in Argentina — DanzConnect — with 100+ people in the room.',
      'You’re here as a witness to this closing with Russell. And once that signature is done, I want us to sit down — just you and me — and really talk about the possibilities and next steps for you on FlowBond. I think there’s something here for us; let’s find it together.',
    ],
  },
  anup: {
    title: 'Anup — thank you, truly',
    paras: [
      'Anup, thank you for the Harmonik support — it meant more than you know. You’re here as a witness to this closing, and I’m grateful to have you in the room for it.',
    ],
  },
  jackson: {
    title: 'Jackson — there’s a whole world for your land',
    paras: [
      'Jackson, your community building, your gardens, the honey — and so much more — are exactly the kind of real, rooted work I want to build with. There’s a whole world I’d love to integrate into your land, and I want to put FBID into the hands of your community so it’s truly theirs.',
      'You’re here as a witness to this closing, and I see you as a big part of where this goes next. Let’s keep dreaming it out loud.',
    ],
  },
  jeff: {
    title: 'Jeff — glad you’re here',
    paras: [
      'Jeff, thank you for standing as a witness to this. Your presence and trust mean a lot to me, and I’m grateful to have you alongside as this chapter closes and the next one opens.',
    ],
  },
  ryan: {
    title: 'Ryan — peace, and what’s ahead',
    paras: [
      'Ryan, there’s a real peace between us — the kind that’s both genuine friendship and clear, honest professional discernment — and I value it deeply. You’re here as a witness to this closing.',
      'And I’m genuinely excited about where we could go together: the vehicles on refirides.com, the modal integration, and whatever development that takes to make it real. Let’s explore it.',
    ],
  },
};

// Part 1 — the framing message (now resolved on "Early Co-founder").
export const MESSAGE = {
  to: 'Russell',
  paragraphs: [
    'Thank you for being direct about how you’d like your time on FlowBond recognized. You’re right to raise it — your work mattered, and it deserves to be named clearly rather than left vague.',
    'We found the honest name for it. You asked to be recognized as a co-founder. I won’t sign a claim that’s bigger than the record — but I also refuse to undersell what you actually did. So here’s where we land, and I’m genuinely glad about it: **Early Co-founder**, for your real, early contribution to DANZ and FlowB.',
    'Why this is the wording I’ll defend anywhere. It’s true, it’s generous, and it survives any diligence. “Early Co-founder” says plainly that you were there at the beginning and you built real things — without claiming an ownership stake that was never agreed. That protects both of us: you never have to walk back a word, and I can stand behind every part of it to investors, partners, or anyone who asks.',
    'And I’m naming Deven too. His contribution belongs on the record, and it is — acknowledged alongside yours in the documents in this vault.',
    'The standing and the numbers below are the same ones any investor sees. They’re not here to diminish you — they’re here so the recognition rests on the truth, which is the only kind of credit that lasts.',
    'Everything here is validated by cryptography and witnessed on the record, and it’s ready to sign. Read it — if a detail of your contribution is captured wrong or sells you short, tell me and I’ll fix it. Then let’s sign it together.',
  ],
  signoff: 'With genuine respect and thanks,\nEstefanía Ferrera',
};

// Russell's clear path to finalize, every step.
export const FINALIZE_STEPS = [
  { n: 1, key: 'fbid', title: 'Verify with FBID', detail: 'Tap “Verify with FBID,” enter cryptokoh@gmail.com, and open the magic link from your inbox. You’ll return here verified — that’s what unlocks signing and download. No password, ever.' },
  { n: 2, key: 'read', title: 'Read your recognition & the Agreement', detail: 'Read your note, your Early Co-founder recognition (DANZ & FlowB), and the full Separation Agreement. If any detail is wrong or sells you short, tell Estefanía before you sign — she’ll fix it.' },
  { n: 3, key: 'sign-agreement', title: 'Sign the Separation Agreement', detail: 'Once verified, press “Sign as Russell” on Document 1. Your signature is recorded with a cryptographic fingerprint and a timestamp on the audit trail.' },
  { n: 4, key: 'sign-ack', title: 'Sign the Acknowledgment (Exhibit 5)', detail: 'Sign Document 2 — your Early Co-founder Acknowledgment, yours to use on your CV, LinkedIn, anywhere.' },
  { n: 5, key: 'transfer', title: 'Hand over the transfers (Exhibit 3)', detail: 'Complete each handover so Estefanía can verify it: the domains (flowbond.tech, danz.now, flowb.me, pee.network); all repos & credentials; Telegram/Base/Farcaster; Web3 keys (secure channel, off-platform); company crypto to the Company wallet; Mercury; Stripe; Coinbase; Supabase/Vercel/Apple/Google/DNS/secrets; and social de-identification.' },
  { n: 6, key: 'done', title: 'Closing completes — and we talk next steps', detail: 'Estefanía verifies each transfer. When everything is confirmed and both documents are signed, the closing completes and your recognition is released. Then she’ll reach out about your possibilities on FlowBond.' },
];

export const GUIDE_FAQ = [
  { q: 'What do I do first?', a: 'Verify with FBID using cryptokoh@gmail.com (step 1). That single login unlocks signing and download.', keys: ['first', 'start', 'begin', 'fbid', 'login', 'verify'] },
  { q: 'Is this legally binding?', a: 'Yes — the electronic signatures are binding under the U.S. ESIGN Act and UETA. The document is sealed with a cryptographic fingerprint (Article 11), and binding execution can also run through DocuSign.', keys: ['binding', 'legal', 'valid', 'enforce', 'law'] },
  { q: 'Do I get equity?', a: '“Early Co-founder” is honorary recognition of your real early contribution to DANZ & FlowB. It confers no equity, ownership, or continuing claim (Article 4) — it’s a true title you can use anywhere, one that survives any scrutiny.', keys: ['equity', 'ownership', 'stake', 'shares', 'cofounder', 'co-founder', 'own'] },
  { q: 'Why no lawyer?', a: 'Counsel was offered and declined, so instead of any one advisor’s word the agreement stands on objective proof anyone can verify — a cryptographic fingerprint, an immutable audit trail, an on-chain anchor, and named witnesses (Article 11). It’s math, not opinion.', keys: ['lawyer', 'counsel', 'attorney', 'fake', 'mexican'] },
  { q: 'What are the transfers?', a: 'Step 5: hand over domains, repos & credentials, comms accounts, Web3 keys (secure channel), company crypto, Mercury, Stripe, Coinbase, infrastructure, and social de-identification. Estefanía verifies each before the closing completes.', keys: ['transfer', 'domain', 'repo', 'keys', 'crypto', 'mercury', 'stripe', 'coinbase', 'handover', 'exhibit', 'asset'] },
  { q: 'What happens after I sign?', a: 'Estefanía verifies the transfers; when everything’s confirmed, your recognition is released and she reaches out about next steps on FlowBond.', keys: ['after', 'next', 'then', 'finish', 'done', 'release', 'complete'] },
];

// Part 0 — the full, official Separation & Transition Agreement (primary document).
// Complete framework, NOT legal advice — review with counsel. Crypto-validated.
export const AGREEMENT = {
  title: 'Separation & Transition Agreement',
  subtitle: 'FlowBond / FlowBond Tech',
  effective: 'the date of last electronic signature',
  parties:
    'This Separation & Transition Agreement (the “Agreement”) is made and entered into as of the Effective Date by and between Estefanía Ferrera, an individual, in her personal capacity and on behalf of FlowBond / FlowBond Tech, a Texas C corporation, and its products and affiliates (collectively, the “Company”), and Russell Herod, an individual, recognized herein as an Early Co-founder of the DANZ and FlowB workstreams (the “Contributor”). The Company and the Contributor are each a “Party” and together the “Parties.”',
  recitals: [
    'WHEREAS, the Company operates the FlowBond ecosystem, which was founded, owned, and principally built by Estefanía Ferrera;',
    'WHEREAS, the Contributor made a real, early contribution to the Company, principally on the DANZ and FlowB (FlowBondTech) workstreams, and the Company recognizes him as an “Early Co-founder” of those workstreams in honorary and historical acknowledgment of that contribution;',
    'WHEREAS, the Company further recognizes Roman as an original Early Co-founder, and acknowledges the contribution of Deven, each as recorded in the Acknowledgment (Exhibit 5);',
    'WHEREAS, notwithstanding such recognition, no equity, ownership interest, option, token allocation, partnership, joint venture, or continuing-compensation arrangement was ever granted to or agreed with the Contributor or any other contributor;',
    'WHEREAS, the Parties wish to formalize the conclusion of the Contributor’s involvement, effect the orderly and verified transfer of all Company access and assets, fully and finally resolve all claims between them, and record an accurate Acknowledgment of Contribution (Exhibit 5);',
    'WHEREAS, the Company offered to involve its legal counsel to ensure fairness to both Parties, and the Contributor declined that counsel; the Parties therefore adopt the objective, independently-verifiable methods of validation set forth in Article 11, attested by the witnesses named in the execution block;',
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
        '2.1  The Contributor’s active involvement with the Company is concluded. As of the Effective Date the Contributor holds no title, office, operational role, authority, mandate, or responsibility with the Company, save the honorary recognition in Article 4.',
        '2.2  The Contributor shall not, after the Effective Date, hold himself out as an owner, officer, employee, partner, or agent of the Company, or bind the Company in any way. He may truthfully describe himself as an Early Co-founder of the DANZ and FlowB workstreams, consistent with Article 4 and Exhibit 5.',
      ],
    },
    {
      n: '3', t: 'Transition of Access and Assets (Exhibit 3)',
      paras: [
        '3.1  The Contributor shall transfer to the Company sole ownership and control of all Company Assets and irrevocably remove himself from all Company accounts, in accordance with the Closing Tasks Schedule (Exhibit 3), including, without limitation:',
        '(a) Domains — flowbond.tech, danz.now, flowb.me, and pee.network — placed under the Company’s registrar control with the Contributor removed as registrant/contact;',
        '(b) Repositories and credentials — all source-code repositories, API keys, and secrets, with the Company granted full ownership/admin and the Contributor removed;',
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
      n: '4', t: 'Honorary Recognition; No Equity or Ownership',
      paras: [
        '4.1  The Company recognizes the Contributor as an “Early Co-founder” of the DANZ and FlowB workstreams, in honorary and historical recognition of his real, early contribution. This is a title of acknowledgment, freely usable by the Contributor in his professional materials.',
        '4.2  Such recognition does not constitute or confer any equity, ownership interest, share, option, warrant, token allocation, profit or revenue interest, voting or control right, or any continuing claim, role, compensation, or liability. The Contributor holds, and has at all times held, none of the foregoing, and none was ever granted, promised, or agreed.',
        '4.3  The Company remains solely owned and controlled by Estefanía Ferrera.',
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
        '6.1  In consideration of the covenants herein, the Company shall issue the Acknowledgment of Contribution (Exhibit 5), accurately recognizing the Contributor as an Early Co-founder of DANZ and FlowB, recognizing Roman as an original Early Co-founder, and acknowledging the contribution of Deven.',
        '6.2  The Acknowledgment is released to the Contributor upon the Closing and the Company’s approval, stands alongside this Agreement, and does not alter it.',
      ],
    },
    {
      n: '7', t: 'Mutual General Release of Claims',
      paras: [
        '7.1  Each Party, on behalf of itself and its heirs, successors, and assigns, hereby fully and forever releases and discharges the other Party from any and all claims, demands, causes of action, obligations, damages, and liabilities of any kind, whether known or unknown, suspected or unsuspected, arising from or relating to the Contributor’s involvement and the relationship between the Parties up to the Effective Date.',
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
        '9.2  Both Parties may describe the Contributor’s actual contribution and his Early Co-founder recognition truthfully and consistently with Exhibit 5. Nothing herein prevents either Party from making truthful statements or from responding to lawful process.',
      ],
    },
    {
      n: '10', t: 'Independent Counsel; Record Regarding Counsel',
      paras: [
        '10.1  Each Party has had a full and fair opportunity to consult independent legal counsel of their own choosing before executing this Agreement and enters into it knowingly and voluntarily.',
        '10.2  The Company offered to involve its legal counsel to ensure fairness to both Parties. The Contributor declined to engage the Company’s counsel and characterized that counsel as “fake” by reason of that counsel’s Mexican nationality. This fact is recorded here for the avoidance of doubt.',
        '10.3  The Company affirms, without qualification, the legitimacy, competence, and good standing of its counsel and of Mexican legal professionals generally. Nationality bears no relation to legal validity or professional standing, and the Company does not accept any characterization to the contrary.',
        '10.4  Because the Contributor declined the Company’s counsel, the Parties establish the integrity and standing of this Agreement through the objective, independently-verifiable technological methods set forth in Article 11 and attested by the witnesses named below — methods that depend on no single advisor and are open to verification by any counsel the Contributor may choose, of any nationality.',
      ],
    },
    {
      n: '11', t: 'Method of Validation (Cryptographic and On-Chain)',
      paras: [
        '11.1  Cryptographic fingerprint. The canonical text of this Agreement is reduced to a unique cryptographic fingerprint (a keccak-256 hash), shown with this document. Altering a single character changes the fingerprint, making any tampering immediately detectable by anyone, anywhere.',
        '11.2  Immutable audit trail. Every material action — opening, reading, witnessing, and signing — is written to an append-only audit log that cannot be edited or deleted, each entry bearing a trusted timestamp.',
        '11.3  On-chain anchor. The fingerprint may be anchored to the Base (Ethereum Layer-2) public blockchain as a tamper-evident, time-stamped proof of existence that no Party controls and that anyone may independently verify, permanently.',
        '11.4  Electronic signatures. Electronic signatures captured through this system, and via DocuSign, are valid and binding to the fullest extent permitted by applicable electronic-signature law, including the U.S. ESIGN Act and the Uniform Electronic Transactions Act (UETA) and equivalent provisions.',
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
        '13.1  This Agreement is governed by, and construed in accordance with, the laws of the State of Texas, United States (where the Company is incorporated as a C corporation), without regard to conflict-of-laws rules.',
        '13.2  The Parties shall first attempt to resolve any dispute in good faith. Any unresolved dispute shall be submitted to the courts or arbitral forum of the governing jurisdiction, and the cryptographic, on-chain, and witnessed records described in Article 11 shall be admissible as evidence of the document’s integrity and the Parties’ actions.',
      ],
    },
    {
      n: '14', t: 'Electronic Signature; Witnesses; Counterparts',
      paras: [
        '14.1  This Agreement may be executed electronically and in counterparts, each of which is an original and all of which together constitute one instrument.',
        '14.2  The persons named in the execution block as Witnesses attest, on a view-only basis, that they have observed this Agreement and its cryptographic fingerprint; they are not Parties and assume no obligation or liability.',
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
    'Exhibit 5 — Acknowledgment of Contribution (Early Co-founder; Deven)',
  ],
};

// Part 2 — the signable Acknowledgment of Contribution (now Early Co-founder + Deven).
export const ACKNOWLEDGMENT = {
  title: 'Acknowledgment of Contribution',
  issuedBy: 'Estefanía Ferrera, on behalf of FlowBond / FlowBond Tech',
  recognitionOf: 'Russell Herod',
  role: 'Early Co-founder — DANZ & FlowB',
  period: 'August 13, 2025 → March 30, 2026',
  scope: [
    'Recognized as an Early Co-founder of the DANZ and FlowB (FlowBondTech) workstreams, for his real, early contribution at the start of that work.',
    'Contributed time, skill and engineering effort — including the move-to-earn (DANZ) stack and the early FlowB agent service. *(EDITABLE — add or refine specific items.)*',
  ],
  acknowledgment:
    'Estefanía Ferrera and FlowBond gratefully recognize Russell Herod as an Early Co-founder of the DANZ and FlowB workstreams, and the time, skill, and effort he brought to that work. Russell is free to reference this Early Co-founder recognition in his professional materials.',
  // Further recognitions — Roman (original Early Co-founder) and Deven.
  also: [
    {
      name: 'Roman',
      role: 'Original Early Co-founder',
      text:
        'The Company recognizes Roman as an original Early Co-founder of FlowBond / DANZ. Roman contributed early work on BLE and movement-tracking for smart-watch integration, and supported the first DANZ event in Argentina — DanzConnect (100+ attendees). *(EDITABLE — refine dates/scope.)* Roman is free to reference this recognition in his professional materials.',
    },
    {
      name: 'Deven',
      role: 'Contributor · September 3, 2025 → November 3, 2025 *(EDITABLE — confirm start day)*',
      text:
        'The Company also gratefully acknowledges the contribution of Deven to FlowBond during September 3, 2025 – November 3, 2025. *(EDITABLE — add Deven’s specific contribution.)* Deven is free to reference this acknowledgment in his professional materials.',
    },
  ],
  scopeClarity:
    'This is an acknowledgment of contribution and honorary recognition only. The “Early Co-founder” recognition does not constitute or imply equity, ownership, options, tokens, control, or any continuing claim, role, or compensation, and no such agreement was ever in place. It stands alongside, and does not alter, the Separation Agreement between the parties.',
};

// "Where we stand today" — the transparent factual standing.
export const STANDING = [
  { k: 'Recognition — Russell', v: 'Early Co-founder (honorary) · DANZ & FlowB', tone: 'good' as const },
  { k: 'Recognition — Deven', v: 'Contributor — acknowledged', tone: 'good' as const },
  { k: 'Equity / ownership held by Contributor', v: '0% — none, never granted', tone: 'fact' as const },
  { k: 'Company ownership & control', v: '100% Estefanía Ferrera', tone: 'fact' as const },
  { k: 'Asset & access transfers (Exhibit 3)', v: 'Pending — verified item-by-item through Closing', tone: 'pending' as const },
  { k: 'Mutual release of claims', v: 'Offered — effective upon signature', tone: 'pending' as const },
  { k: 'Company counsel', v: 'Offered by Company; declined by Contributor', tone: 'fact' as const },
  { k: 'Validation', v: 'keccak256 fingerprint + on-chain anchor + audit trail + witnesses', tone: 'good' as const },
];
