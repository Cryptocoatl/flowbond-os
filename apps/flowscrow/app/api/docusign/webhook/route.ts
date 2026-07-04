import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { dbAdmin } from '@/lib/supabase/server';
import { verifyConnectHmac } from '@/lib/server/docusign';

export const dynamic = 'force-dynamic';

// DocuSign Connect webhook. Verifies the HMAC, then updates the matching
// flowscrow_documents row (status + sha256 of the completed PDF). This is the
// only server-trusted (service-role) writer of document status. "Release" remains
// a separate, app-level access flip done by counsel — never here.
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig =
    req.headers.get('x-docusign-signature-1') ??
    req.headers.get('x-authorization-digest');
  if (!verifyConnectHmac(raw, sig)) {
    return NextResponse.json({ error: 'bad signature' }, { status: 401 });
  }

  let payload: DocusignConnectPayload;
  try {
    payload = JSON.parse(raw) as DocusignConnectPayload;
  } catch {
    return NextResponse.json({ error: 'bad payload' }, { status: 400 });
  }

  const envelopeId = payload?.data?.envelopeId ?? payload?.envelopeId;
  const rawStatus = (payload?.data?.envelopeSummary?.status ?? payload?.status ?? '').toLowerCase();
  if (!envelopeId) return NextResponse.json({ ok: true, skipped: 'no envelopeId' });

  const status = mapStatus(rawStatus);

  // Compute sha256 over the completed document bytes when Connect includes them.
  let sha256: string | null = null;
  const docBytes =
    payload?.data?.envelopeSummary?.envelopeDocuments?.[0]?.PDFBytes ??
    payload?.documentPdfs?.[0]?.PDFBytes ??
    null;
  if (docBytes) {
    sha256 = crypto.createHash('sha256').update(Buffer.from(docBytes, 'base64')).digest('hex');
  }

  const admin = dbAdmin();
  const update: Record<string, unknown> = { status };
  if (sha256) update.sha256 = sha256;

  await admin.from('flowscrow_documents').update(update).eq('docusign_envelope_id', envelopeId);

  return NextResponse.json({ ok: true });
}

function mapStatus(s: string): string {
  if (['sent', 'delivered', 'completed', 'declined', 'voided'].includes(s)) return s;
  if (s === 'created') return 'created';
  return 'sent';
}

interface DocusignConnectPayload {
  status?: string;
  envelopeId?: string;
  documentPdfs?: Array<{ PDFBytes?: string }>;
  data?: {
    envelopeId?: string;
    status?: string;
    envelopeSummary?: {
      status?: string;
      envelopeDocuments?: Array<{ PDFBytes?: string }>;
    };
  };
}
