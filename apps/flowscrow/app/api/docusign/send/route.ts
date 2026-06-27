import { NextResponse } from 'next/server';
import { createEnvelope, isDocusignConfigured } from '@/lib/server/docusign';
import { AGREEMENT_DOCX_B64 } from '@/lib/agreementDocx';

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
