import { getProfileByHandle } from '../../../lib/astro/access';
import { natalAspects } from '../../../lib/astro/aspects';
import { personLines } from '../../../lib/astro/interpret';
import { rankPlaces, LINE_MEANING } from '../../../lib/astro/astrocartography';
import { serverClient } from '../../../lib/supabase-server';
import ReadingPanel from '../../components/ReadingPanel';
import RequestAccess from '../../components/RequestAccess';
import type { EcosystemPlace } from '../../../lib/astro/types';

export default async function ChartPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const look = await getProfileByHandle(handle);

  if (look.status === 'not_found')
    return <Shell><p className="text-[#9698a8]">No FlowBond user <b>@{handle}</b>.</p></Shell>;
  if (look.status === 'forbidden')
    return (
      <Shell>
        <p className="text-[#9698a8] mb-4"><b>@{handle}</b> keeps their chart private.</p>
        <RequestAccess handle={handle} />
      </Shell>
    );

  const p = look.profile;
  const lines = personLines(p.chart);
  const aspects = natalAspects(p.chart).filter((a) => a.type !== 'quincunx').slice(0, 9);

  const sb = await serverClient();
  const { data: placeRows } = await sb.from('ecosystem_places').select('*');
  const places = (placeRows ?? []).map((r: any) => ({ id: r.id, name: r.name, kind: r.kind, lat: r.lat, lng: r.lng })) as EcosystemPlace[];
  const acg = rankPlaces(p.chart, places, 4).slice(0, 5);

  return (
    <Shell>
      <div className="flex items-center gap-3">
        <span className="w-4 h-4 rounded-full" style={{ background: p.avatarColor }} />
        <h1 className="text-3xl font-serif">{p.displayName}</h1>
        <span className="text-xs font-mono text-[#5b5e72]">@{p.handle} · {p.visibility}</span>
      </div>
      <p className="font-serif text-lg mt-2">
        {p.chart.bodies.Sun.sign} Sun · {p.chart.bodies.Moon.sign} Moon{p.chart.asc ? ` · ${p.chart.asc.sign} Rising` : ' · (no birth time)'}
      </p>

      <Section title="Placements">
        {lines.map((l) => <div key={l.planet} className="text-sm text-[#cfc8e8] py-0.5">{l.line}</div>)}
      </Section>

      <Section title="Natal aspects">
        {aspects.map((a, i) => (
          <div key={i} className="text-sm py-0.5">
            <span className={a.harmony > 0 ? 'text-[#7bd0c6]' : 'text-[#e8956a]'}>{a.glyph}</span>{' '}
            {a.p1} {a.type} {a.p2} <span className="text-[#5b5e72] font-mono text-xs">{a.orb}°</span>
          </div>
        ))}
      </Section>

      {acg.length > 0 && (
        <Section title="Astrocartography · ecosystem activations">
          {acg.map((r) => (
            <div key={r.place.id} className="text-sm py-1">
              <b className="text-[#e3c07a]">{r.place.name}</b>{' '}
              <span className="text-[#9698a8]">— {r.activations.slice(0, 2).map((a) => `${a.planet} ${a.kind} (${LINE_MEANING[a.kind]})`).join(', ')}</span>
            </div>
          ))}
          <p className="text-[10px] text-[#5b5e72] mt-2">Where your angular lines fall near FlowBond places — guidance for retreats, builds &amp; gatherings.</p>
        </Section>
      )}

      <ReadingPanel handles={[handle]} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="max-w-2xl mx-auto p-6 text-[#ece9e0]">{children}</div>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 pt-4 border-t border-white/5">
      <div className="text-[9px] uppercase tracking-[0.18em] text-[#b6abec] mb-3">{title}</div>
      {children}
    </div>
  );
}
