import Link from 'next/link';
import { serverClient } from '../../../lib/supabase-server';
import { astrocartography } from '../../../lib/astro/astrocartography';
import {
  linesToGeoJSON, crossings, crossingsToGeoJSON, spotsToGeoJSON, strongestSpot,
  QUALITY_COLOR, type PersonChart,
} from '../../../lib/astro/acg-geo';
import type { Chart } from '../../../lib/astro/types';
import AcgMap from '../../components/AcgMap';

interface MapMember { fbid: string; handle: string | null; display_name: string | null; avatar_color: string | null }
interface MapGuest { id: string; display_name: string; avatar_color: string; chart: Chart }

// A distinct, legible-on-dark palette so each soul's lines read apart.
const PALETTE = ['#e3c07a', '#7bd0c6', '#caa6f0', '#e8956a', '#8fb8e0', '#a8c97f', '#e87ba6', '#79d0e8'];
const firstName = (s: string | null) => (s || 'Someone').trim().split(/\s+/)[0];

// The multiplayer Atlas — a collective's charts overlaid on the globe, with the
// power spots where their lines cross lit up. "Where your Venus meets their
// Jupiter" stops being a sentence and becomes a glowing point on the earth.
export default async function CollectiveAtlas({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await serverClient();
  const { data: map } = await sb.rpc('get_flow_map', { map_id: id });

  if (!map)
    return (
      <Shell>
        <h1 className="text-2xl font-serif mb-2">Collective Atlas not found</h1>
        <p className="text-[#9698a8]">It may not exist, or you haven&apos;t been woven into it yet.</p>
        <Link href="/dashboard" className="text-[#b6abec] underline text-sm mt-4 inline-block">Back to dashboard</Link>
      </Shell>
    );

  const members = (map.members ?? []) as MapMember[];
  const guests = (map.guests ?? []) as MapGuest[];

  // Member charts arrive through RLS — each viewer sees only what each member's
  // share level permits; hidden members simply contribute no lines.
  const handles = members.map((m) => m.handle).filter(Boolean) as string[];
  const chartByHandle = new Map<string, Chart>();
  if (handles.length > 0) {
    const { data: rows } = await sb.from('profiles').select('handle, chart').in('handle', handles);
    for (const r of rows ?? []) chartByHandle.set(r.handle, r.chart as Chart);
  }

  const people: PersonChart[] = [];
  let ci = 0;
  for (const m of members) {
    const chart = m.handle ? chartByHandle.get(m.handle) : undefined;
    if (!chart) continue;
    people.push({ name: firstName(m.display_name), color: PALETTE[ci++ % PALETTE.length], chart });
  }
  for (const g of guests) {
    if (!g.chart) continue;
    people.push({ name: firstName(g.display_name), color: PALETTE[ci++ % PALETTE.length], chart: g.chart });
  }

  if (people.length < 2)
    return (
      <Shell>
        <Link href={`/map/${id}`} className="text-xs text-[#5b5e72]">← {map.name}</Link>
        <h1 className="text-2xl font-serif mt-3 mb-2">{map.name} · Atlas</h1>
        <p className="text-[#9698a8]">
          Power spots appear once at least two charts shine here for you. Invite more souls into the weave, or
          ask them for a deeper share.
        </p>
      </Shell>
    );

  const layers = people.map((p, i) => ({
    id: `p${i}`,
    geojson: linesToGeoJSON(p.name, astrocartography(p.chart), p.color),
  }));
  const spots = crossings(people);

  // One pin per person: their strongest power spot, tinted in their colour.
  const powerSpots = people
    .map((p) => { const s = strongestSpot(p.chart); return s ? { ...s, who: p.name, color: p.color } : null; })
    .filter(Boolean) as Array<ReturnType<typeof strongestSpot> & { who: string; color: string }>;
  const places = powerSpots.length ? spotsToGeoJSON(powerSpots as any) : undefined;

  const focus: [number, number] | undefined = spots[0] ? [spots[0].lng, spots[0].lat] : undefined;

  return (
    <Shell wide>
      <Backdrop />
      <Link href={`/map/${id}`} className="text-xs text-[#5b5e72]">← {map.name}</Link>
      <p className="text-[11px] uppercase tracking-[0.3em] text-[#b6abec] mt-3 mb-1">Collective Atlas · {map.context}</p>
      <h1
        className="text-4xl font-serif"
        style={{ background: 'linear-gradient(100deg,#ece9e0 20%,#e3c07a 55%,#b6abec 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
      >
        {map.name}
      </h1>
      <p className="text-sm text-[#9698a8] mt-2 mb-5 max-w-2xl">
        {people.length} charts overlaid on the earth. The glowing points are <b className="text-[#cfc8e8]">crossings</b> —
        where one person&apos;s line meets another&apos;s. Tap one to see whose energies meet there, and let it guide
        where this crew gathers, builds, or retreats.
      </p>

      <AcgMap
        layers={layers}
        crossings={crossingsToGeoJSON(spots)}
        places={places}
        legend={people.map((p) => ({ label: p.name, color: p.color }))}
        crossingKey={[
          { label: 'harmonious', color: QUALITY_COLOR.harmonious },
          { label: 'intense', color: QUALITY_COLOR.intense },
          { label: 'mixed', color: QUALITY_COLOR.mixed },
        ]}
        focus={focus}
      />

      {spots.length > 0 && (
        <div className="mt-7 pt-5 border-t border-white/5">
          <div className="text-[9px] uppercase tracking-[0.18em] text-[#b6abec] mb-3">Strongest power spots</div>
          <div className="grid sm:grid-cols-2 gap-2">
            {spots.slice(0, 8).map((c, i) => (
              <div key={i} className="text-sm py-1 flex items-start gap-2">
                <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: QUALITY_COLOR[c.quality], boxShadow: `0 0 6px ${QUALITY_COLOR[c.quality]}` }} />
                <span className="text-[#cfc8e8]">{c.title}<br />
                  <span className="text-[10px] text-[#5b5e72] font-mono">{c.lat.toFixed(1)}°, {c.lng.toFixed(1)}° · {c.quality}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return <div className={`${wide ? 'max-w-5xl' : 'max-w-2xl'} mx-auto p-6 text-[#ece9e0]`}>{children}</div>;
}
function Backdrop() {
  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{ background: 'radial-gradient(700px 420px at 75% -5%, rgba(154,143,224,0.14), transparent 65%), radial-gradient(560px 380px at 5% 105%, rgba(123,208,198,0.10), transparent 65%)' }}
    />
  );
}
