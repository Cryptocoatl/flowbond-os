import { NextResponse, type NextRequest } from 'next/server';
import { authClient, dbAdmin } from '@/lib/supabase/server';
import { createEnvelope, isDocusignConfigured } from '@/lib/server/docusign';
import type { Party } from '@/lib/types';

// Create a DocuSign envelope for a deal document.
//   kind 'agreement'       → recipients: initiator + counterparty
//   kind 'courtesy_letter' → recipient:  initiator (Ferrera) only
// Caller must be a party to the deal (RLS gates the party read). Server stores the
// returned envelope id on the document row via the service-role client.
export async function POST(req: NextRequest) {
  if (!isDocusignConfigured()) {
    return NextResponse.json({ error: 'docusign_not_configured' }, { status: 503 });
  }

  const { dealId, kind, documentBase64 } = await req.json().catch(() => ({}));
  if (!dealId || !kind || !documentBase64) {
    return NextResponse.json(
      { error: 'dealId, kind, documentBase64 required' },
      { status: 400 },
    );
  }
  if (kind !== 'agreement' && kind !== 'courtesy_letter') {
    return NextResponse.json({ error: 'invalid kind' }, { status: 400 });
  }

  // RLS ensures only a party to this deal can read the parties.
  const sb = await authClient();
  const { data: partiesData, error: pErr } = await sb
    .from('flowscrow_parties')
    .select('*')
    .eq('deal_id', dealId);
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });
  const parties = (partiesData ?? []) as Party[];
  if (parties.length === 0) {
    return NextResponse.json({ error: 'not a party to this deal' }, { status: 403 });
  }

  const initiator = parties.find((p) => p.role === 'initiator');
  const counterparty = parties.find((p) => p.role === 'counterparty');

  const recipients =
    kind === 'agreement'
      ? [initiator, counterparty]
      : [initiator]; // courtesy letter: Ferrera only

  const signers = recipients
    .filter((p): p is Party => !!p && !!p.email)
    .map((p, i) => ({
      email: p.email!,
      name: p.display_name ?? p.email!,
      recipientId: String(i + 1),
      routingOrder: i + 1,
    }));

  if (signers.length === 0) {
    return NextResponse.json({ error: 'no recipients with email' }, { status: 400 });
  }

  let envelopeId: string;
  try {
    envelopeId = await createEnvelope({
      emailSubject:
        kind === 'agreement'
          ? 'FlowBond Tech — Separation Agreement (signature required)'
          : 'FlowBond Tech — Courtesy Letter (signature required)',
      documentBase64,
      documentName: kind === 'agreement' ? 'Separation Agreement' : 'Courtesy Letter',
      recipients: signers,
      status: 'sent',
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }

  // Persist envelope id + recipient ids (server-trusted write).
  const admin = dbAdmin();
  await admin
    .from('flowscrow_documents')
    .update({ docusign_envelope_id: envelopeId, status: 'sent' })
    .eq('deal_id', dealId)
    .eq('kind', kind);

  // Map recipient ids back onto party rows for later embedded-signing views.
  for (const s of signers) {
    const party = recipients.find((p) => p && p.email === s.email);
    if (party) {
      await admin
        .from('flowscrow_parties')
        .update({ docusign_recipient_id: s.recipientId })
        .eq('id', party.id);
    }
  }

  return NextResponse.json({ ok: true, envelopeId });
}
