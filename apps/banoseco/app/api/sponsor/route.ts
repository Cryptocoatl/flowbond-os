import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const RESEND_KEY = process.env.RESEND_API_KEY;
const TO = process.env.BANOSECO_SPONSOR_INBOX ?? 'hola@reciprociudad.lat';
const FROM = process.env.BANOSECO_SPONSOR_FROM ?? 'BAÑOSECO <noreply@reciprociudad.lat>';

// Sponsor lead-gen — no commerce. Emails the network via Resend if configured;
// otherwise accepts the lead so the form never blocks (logged for follow-up).
// TODO(infra): set RESEND_API_KEY + a verified sender, or swap to a
// service_inquiries table insert if the network prefers a CRM.
export async function POST(req: NextRequest) {
  let body: { name?: string; org?: string; email?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 });
  }

  const name = (body.name ?? '').trim();
  const email = (body.email ?? '').trim();
  if (!name || !email) {
    return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 });
  }

  const subject = `Adopta un nodo · ${name}${body.org ? ` (${body.org})` : ''}`;
  const text = [
    `Nombre: ${name}`,
    `Organización: ${body.org ?? '—'}`,
    `Correo: ${email}`,
    `Mensaje: ${body.message ?? '—'}`,
  ].join('\n');

  if (!RESEND_KEY) {
    // No mailer configured yet — accept the lead so the UX works in the pilot.
    console.log('[banoseco sponsor lead]', text);
    return NextResponse.json({ ok: true, queued: false });
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${RESEND_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to: [TO], reply_to: email, subject, text }),
    });
    if (!res.ok) throw new Error(await res.text());
    return NextResponse.json({ ok: true, queued: true });
  } catch (e) {
    console.error('[banoseco sponsor] resend failed', e);
    return NextResponse.json({ ok: false, error: 'send_failed' }, { status: 502 });
  }
}
