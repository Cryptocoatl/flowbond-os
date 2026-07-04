import { NextRequest, NextResponse } from 'next/server';
import { computeChart } from '../../../../lib/astro/chart';
import { personLines } from '../../../../lib/astro/interpret';
import type { BirthData } from '../../../../lib/astro/types';

// One-time chart: compute from natal data and return it — NOTHING is stored.
// No profile, no guest, no row anywhere; the chart exists only in this
// response. To bring the person into the flow, create their activation link
// (a solo guest) — they stay out of the flow until they claim their FBID.
export async function POST(req: NextRequest) {
  try {
    const { birth } = (await req.json()) as { birth: BirthData };
    if (!birth?.date || !birth?.tz || !Number.isFinite(birth.lat) || !Number.isFinite(birth.lng))
      return NextResponse.json({ error: 'Need date, place and timezone.' }, { status: 400 });
    const chart = computeChart(birth);
    return NextResponse.json({ chart, lines: personLines(chart).map((l) => l.line) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'compute failed' }, { status: 500 });
  }
}
