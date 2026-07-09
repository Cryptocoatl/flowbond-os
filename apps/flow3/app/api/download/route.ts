import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Same-origin proxy so the browser can pull a finished render off the Shotstack
// CDN without CORS issues — required to save the video into the phone's gallery
// (navigator.share needs the actual file bytes) or force a clean file download.
// Locked to Shotstack-hosted URLs to avoid being an open proxy.
function allowed(host: string): boolean {
  return /(^|\.)shotstack\.io$/i.test(host) || /shotstack/i.test(host); // shotstack.io + shotstack-*-output S3 buckets
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url');
  if (!raw) return new NextResponse('missing url', { status: 400 });

  let u: URL;
  try { u = new URL(raw); } catch { return new NextResponse('bad url', { status: 400 }); }
  if (u.protocol !== 'https:' || !allowed(u.hostname)) {
    return new NextResponse('host not allowed', { status: 403 });
  }

  const upstream = await fetch(u.toString());
  if (!upstream.ok || !upstream.body) return new NextResponse('fetch failed', { status: 502 });

  const ct = upstream.headers.get('content-type') || 'video/mp4';
  return new NextResponse(upstream.body, {
    headers: {
      'Content-Type': ct,
      'Content-Disposition': 'attachment; filename="flowstudio.mp4"',
      'Cache-Control': 'no-store',
    },
  });
}
