import { NextResponse } from 'next/server';
import { dbAdmin } from '@/lib/supabase/server';
import { createEnvelope, isDocusignConfigured } from '@/lib/server/docusign';
import { AGREEMENT, WITNESSES } from '@/lib/documents';
import type { Party } from '@/lib/types';

export const dynamic = 'force-dynamic';

const DEAL_TITLE = 'FlowBond Tech / Russell Herod — Separation & Closing';

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// The agreement as a DocuSign-ingestible HTML document, with /sig1/ (Company) and
// /sig2/ (Contributor) anchor strings where each signature tab is placed.
function agreementHtml(): string {
  const g = AGREEMENT;
  const recitals = g.recitals.map((r) => `<p>${esc(r)}</p>`).join('');
  const articles = g.articles
    .map(
      (a) =>
        `<h3>ARTICLE ${a.n} — ${esc(a.t)}</h3>` +
        a.paras.map((p) => `<p>${esc(p.replace(/\*/g, ''))}</p>`).join(''),
    )
    .join('');
  const exhibits = g.exhibits.map((e) => `<li>${esc(e)}</li>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Georgia,serif;color:#111;line-height:1.5;font-size:12pt;margin:48px}
    h1{font-size:18pt;margin:0} h2{font-size:11pt;color:#555;margin:4px 0 16px}
    h3{font-size:12pt;margin:18px 0 4px} p{margin:8px 0} ul{margin:6px 0 6px 18px}
    .sig{margin-top:36px;display:flex;justify-content:space-between}
    .wit{margin-top:20px;font-size:10pt;color:#444}
  </style></head><body>
    <h1>${esc(g.title)}</h1><h2>${esc(g.subtitle)} — Effective Date: ${esc(g.effective.replace(/\*/g, ''))}</h2>
    <p>${esc(g.parties)}</p>
    <h3>RECITALS</h3>${recitals}
    ${articles}
    <h3>EXHIBITS</h3><ul>${exhibits}</ul>
    <p>IN WITNESS WHEREOF, the Parties execute this Agreement as of the Effective Date.</p>
    <div class="sig">
      <div>Estefanía Ferrera (Company)<br/>/sig1/<br/>Date: ________</div>
      <div>Russell Herod (Early Co-founder)<br/>/sig2/<br/>Date: ________</div>
    </div>
    <p class="wit"><b>Witnesses (view-only):</b> ${WITNESSES.map(esc).join(', ')}</p>
  </body></html>`;
}

export async function POST() {
  if (!isDocusignConfigured()) {
    return NextResponse.json(
      { error: 'not configured — set DOCUSIGN_* env vars (integration key, RSA key, account & user GUID)' },
      { status: 503 },
    );
  }
  const admin = dbAdmin();
  const { data: deal } = await admin.from('flowscrow_deals').select('id').eq('title', DEAL_TITLE).maybeSingle();
  if (!deal) return NextResponse.json({ error: 'deal not found' }, { status: 404 });

  const { data: partyRows } = await admin.from('flowscrow_parties').select('*').eq('deal_id', deal.id);
  const parties = (partyRows ?? []) as Party[];
  const initiator = parties.find((p) => p.role === 'initiator');
  const counter = parties.find((p) => p.role === 'counterparty');

  const signers = [initiator, counter]
    .filter((p): p is Party => !!p && !!p.email && !p.email.includes('PLACEHOLDER'))
    .map((p, i) => ({ email: p.email!, name: p.display_name ?? p.email!, recipientId: String(i + 1), routingOrder: i + 1 }));

  if (signers.length < 2) {
    return NextResponse.json(
      { error: 'set real emails for Estefanía and Russell on the deal first (counterparty email is a placeholder)' },
      { status: 400 },
    );
  }

  let envelopeId: string;
  try {
    envelopeId = await createEnvelope({
      emailSubject: 'FlowBond — Separation & Transition Agreement (signature required)',
      documentBase64: Buffer.from(agreementHtml()).toString('base64'),
      documentName: 'Separation & Transition Agreement',
      fileExtension: 'html',
      recipients: signers,
      status: 'sent',
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }

  await admin
    .from('flowscrow_documents')
    .update({ docusign_envelope_id: envelopeId, status: 'sent' })
    .eq('deal_id', deal.id)
    .eq('kind', 'agreement');

  return NextResponse.json({ ok: true, envelopeId });
}
