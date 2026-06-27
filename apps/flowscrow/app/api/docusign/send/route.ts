import { NextResponse } from 'next/server';
import { createEnvelope, isDocusignConfigured } from '@/lib/server/docusign';
import { AGREEMENT_DOCX_B64 } from '@/lib/agreementDocx';
import { authClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Send the real Co-Founder Separation & Asset Transfer Agreement (.docx) for
// signature: Estefanía first (/sig1/), then Russell (/sig2/). The .docx carries
// the anchors, so DocuSign places each tab exactly on the right signature line.
// Held signed in escrow until the Exhibit A closing deliverables are verified.
const SIGNERS = [
  { email: 'cryptocoatl101@gmail.com', name: 'Estefanía Ferrera', recipientId: '1', routingOrder: 1 },
  { email: 'cryptokoh@gmail.com', name: 'Russell Herod', recipientId: '2', routingOrder: 2 },
];

export async function POST() {
  // Safety gate: only an FBID-verified signer (their login email matches a signer)
  // may ever create an envelope. No anonymous sends.
  const sb = await authClient();
  const { data: isSigner } = await sb.rpc('flowscrow_is_signer');
  if (isSigner !== true) {
    return NextResponse.json({ error: 'FBID-verified signer required' }, { status: 403 });
  }
  if (!isDocusignConfigured()) {
    return NextResponse.json(
      { error: 'not configured — DocuSign env vars missing (integration key / private key)' },
      { status: 503 },
    );
  }
  try {
    const envelopeId = await createEnvelope({
      emailSubject: 'FlowBond Tech — Co-Founder Separation & Asset Transfer Agreement (signature required)',
      documentBase64: AGREEMENT_DOCX_B64,
      documentName: 'Co-Founder Separation and Asset Transfer Agreement',
      fileExtension: 'docx',
      recipients: SIGNERS,
      status: 'sent',
    });
    return NextResponse.json({ ok: true, envelopeId });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
