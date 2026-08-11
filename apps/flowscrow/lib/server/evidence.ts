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

