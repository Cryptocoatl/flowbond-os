// SERVER-ONLY. Never import this from a client component: everything a client
// module imports is shipped in the public JS bundle, where Russell (or anyone
// with the URL) could read it with devtools regardless of what React renders.
// Reached only through /api/evidence, which verifies the caller is Estefania.

// ── Private exhibit. Estefanía only: never rendered for Russell or the
// witnesses. This is the contemporaneous record of what was published under the
// Brand while the Dissolution sat unsigned — kept so the facts survive the
// wind-up, not to argue with. Do not add it to Russell's surface without a
// deliberate decision: showing a counterparty an evidence file is what turns a
// signature into a lawsuit.
export const EVIDENCE = {
  title: 'The record of what was',
  lead:
    'Private to Estefanía. Two contemporaneous captures of what was live under the FlowBond and DANZ names, kept with their dates so the scope that was being published is preserved independently of any site that can be edited or taken down.',
  // The captures are deliberately NOT published to the web. Everything under
  // public/ on this stack is served by the Workers ASSETS binding before the
  // Worker runs, so a file there cannot be gated by a code or a session — an
  // "evidence" URL would be readable by anyone who guessed it. The files stay
  // in ~/.claudia/handoff/evidence/ and only their SHA-256 lives here, which is
  // what makes the record tamper-evident anyway: the hash proves the file you
  // hold today is the file that was captured on the date below.
  clips: [
    {
      file: 'ORIGINAL-danznow-2026-07-29.MOV',
      sha256: 'acd12d01856dba8526b6364ae554bbdcce00a8799e2328253fbbbfc9b71aa113',
      label: 'danz.now',
      captured: 'July 29, 2026',
      shows:
        'The DANZ.NOW site as it stood: Discover / For Dancers / For Hosts / Token / Device, a “DANZ Austin” community event, “$DANZ tokens for your activity and event participation,” and host-side monetisation and analytics.',
    },
    {
      file: 'ORIGINAL-flowbondtech-2026-08-11.MP4',
      sha256: '0db9bb4755db17398b2080b874667c60a7f3064cc6666e24d6da1c4460b808a3',
      label: 'flowbond.tech',
      captured: 'August 11, 2026 · 12:55',
      shows:
        'The FlowBond Tech site still live today: “Fingerprint. Connections. Technology.” — a tokenized ecosystem combining biometric tracking, AI-powered matchmaking and movement-to-earn, with company shares referenced through “$FlowBond,” and a revenue split of 45% device sales & subscriptions, 25% premium memberships, 20% white-label licensing, 10% event platform commission.',
    },
  ],
  vaultPath: '~/.claudia/handoff/evidence/',

  // The DocuSign envelope history, captured 2026-08-11 16:09. This is the single
  // most useful document in the file: it shows the dissolution was not sprung on
  // anyone. It was formally DECLINED once and left unsigned once before the
  // envelope that is outstanding now.
  //
  // Dates are read m/d/y. Under d/m/y the June and April rows would both land in
  // October — the future — so m/d/y is the only reading consistent with a capture
  // taken on 2026-08-11.
  envelopesCapture: {
    file: 'ORIGINAL-docusign-history-2026-08-11.PNG',
    sha256: '0d138afc75510e662fbcd54902ace1fc94ab1573a6dd60293b4706310ecf42bd',
    captured: 'August 11, 2026 · 16:09',
  },
  envelopes: [
    {
      date: '2026-04-10',
      name: 'Founders Separation.pdf',
      from: 'Estefanía Ferrera',
      status: 'Declined',
      tone: 'stop' as const,
      note: 'Formally declined. Not ignored — refused, on DocuSign’s own record.',
    },
    {
      date: '2026-06-10',
      name: 'FlowBond_Separation_Agreement',
      from: 'Estefanía Ferrera',
      status: 'Waiting for others',
      tone: 'stop' as const,
      note: 'Sent and never signed. Still outstanding two months later.',
    },
    {
      date: '2026-07-09',
      name: 'Mutual Dissolution, Wind-Up and Release',
      from: 'Estefanía Ferrera',
      status: 'Signed by Estefanía in the vault',
      tone: 'good' as const,
      note: 'FBID-verified and sealed. Her side has been complete since this date.',
    },
    {
      date: '2026-08-11',
      name: 'Mutual-Dissolution-Agreement-FlowBond-Tech',
      from: 'Estefanía Ferrera',
      status: 'Waiting for others',
      tone: 'pending' as const,
      note: 'Sent 16:08. The current envelope, due end of day Wednesday, August 12.',
    },
  ],
  envelopesNote:
    'Three separate instruments over four months: declined in April, unsigned since June, outstanding now. Alongside a vault opened by every witness and never once by him, this is a documented pattern of non-execution rather than a disagreement over terms — which is exactly what counsel needs if Wednesday passes. Note also the Mutual NDA from the incoming partner, completed 2026-08-06: that side is moving while this one is not.',
  // Verified against the live registry and response headers on 2026-08-11.
  domains: [
    { d: 'danz.now', v: 'Recovered. Serves “DANZ — Move Humanity” from Estefanía’s Cloudflare Worker.', tone: 'good' as const },
    { d: 'flowbond.tech', v: 'Registered at Namecheap on Cloudflare nameservers, expires 2026-09-03 — but still SERVED FROM NETLIFY. The old site is live under the Brand.', tone: 'stop' as const },
    { d: 'flowb.me', v: 'The domain Russell kept and asked $36 for. Namecheap, NS1 nameservers, expires 2027-02-14 — still served from Netlify.', tone: 'stop' as const },
    { d: 'pee.network', v: 'Transferred before expiry and renewed by Estefanía; held in her account.', tone: 'good' as const },
  ],
  note:
    'The domains were transferred roughly a week before they were due to expire and were renewed by Estefanía, who holds them. Holding the registration is not the same as controlling what is served: flowbond.tech and flowb.me still resolve to Netlify deployments outside her accounts. flowbond.tech runs on Cloudflare nameservers, so its DNS can be repointed without Russell — flowb.me cannot, and is the one still fully outside her reach.',
};

