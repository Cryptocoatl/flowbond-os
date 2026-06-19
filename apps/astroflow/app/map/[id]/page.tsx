import Link from 'next/link';
import { getT } from '../../../lib/i18n/server';
import { serverClient } from '../../../lib/supabase-server';
import ReadingPanel from '../../components/ReadingPanel';
import GuestTools from '../../components/GuestTools';
import CollectiveContext from '../../components/CollectiveContext';
import AddToConstellation from '../../components/AddToConstellation';
import CurrentsLens from '../../components/CurrentsLens';
import { buildCurrents } from '../../../lib/astro/currents';
import type { Chart } from '../../../lib/astro/types';

interface MapMember {
  fbid: string;
  handle: string | null;
  display_name: string | null;
  avatar_color: string | null;
}
interface MapGuest {
  id: string;
  display_name: string;
  avatar_color: string;
  birth_date: string;
  birth_place: string;
  chart: Chart;
  claimed: boolean;
  claim_code: string | null; // owner only
}

const ELEMENTS = ['Fire', 'Earth', 'Air', 'Water'] as const;
const EL_COLOR: Record<string, string> = {
  Fire: '#e8956a', Earth: '#a8c97f', Air: '#e3c07a', Water: '#7bd0c6',
};
const EL_GLYPH: Record<string, string> = { Fire: '🜂', Earth: '🜃', Air: '🜁', Water: '🜄' };

// The living collective chart — a crew of stellar beings, each rendering live
// from their own profile. Guests shine from owner-supplied birth data until
// they claim their personalized invite and take their real seat in the weave.
export default async function MapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getT();
  const sb = await serverClient();
  const { data: map } = await sb.rpc('get_flow_map', { map_id: id });

  if (!map)
    return (
      <Shell>
        <h1 className="text-2xl font-serif mb-2">{t('Collective chart not found')}</h1>
        <p className="text-[#9698a8]">{t('It may not exist, or you haven’t been woven into it yet.')}</p>
        <Link href="/dashboard" className="text-[#b6abec] underline text-sm mt-4 inline-block">{t('Back to dashboard')}</Link>
      </Shell>
    );

  const members = (map.members ?? []) as MapMember[];
  const guests = (map.guests ?? []) as MapGuest[];

  // Collective context (its saved purpose + intention) + am I the host?
  const [{ data: ctxRow }, { data: meFbid }] = await Promise.all([
    sb.from('flow_maps').select('purpose, intention, owner_fbid').eq('id', id).maybeSingle(),
    sb.rpc('current_fbid'),
  ]);
  const ctx = ctxRow as { purpose?: string | null; intention?: string | null; owner_fbid?: string } | null;
  const isOwner = !!meFbid && ctx?.owner_fbid === meFbid;

  // Member charts come through RLS — each viewer sees exactly what each
  // member's visibility + share level allows. Hidden members still appear by
  // name (generic info), just without their placements.
  const handles = members.map((m) => m.handle).filter(Boolean) as string[];
  const chartByHandle = new Map<string, Chart>();
  if (handles.length > 0) {
    const { data: rows } = await sb.from('profiles').select('handle, chart').in('handle', handles);
    for (const r of rows ?? []) chartByHandle.set(r.handle, r.chart as Chart);
  }

  const charts: Chart[] = [
    ...members.map((m) => (m.handle ? chartByHandle.get(m.handle) : undefined)).filter(Boolean) as Chart[],
    ...guests.map((g) => g.chart),
  ];
  const composite: Record<string, number> = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
  for (const c of charts) for (const el of ELEMENTS) composite[el] += c.elements?.[el] ?? 0;
  const total = Object.values(composite).reduce((a, b) => a + b, 0) || 1;
  const dominant = ELEMENTS.slice().sort((a, b) => composite[b] - composite[a])[0];

  // Per-current collective layout (each member projected into every tradition's
  // visual frame). Hidden members carry no chart and show as "hidden".
  const currents = buildCurrents([
    ...members.map((m) => ({
      name: m.display_name ?? t('Unknown'),
      color: m.avatar_color ?? '#9a8fe0',
      chart: m.handle ? chartByHandle.get(m.handle) : undefined,
    })),
    ...guests.map((g) => ({ name: g.display_name, color: g.avatar_color, chart: g.chart })),
  ]);

  return (
    <Shell>
      {/* cosmic backdrop */}
      <div
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          background:
            'radial-gradient(700px 420px at 75% -5%, rgba(154,143,224,0.14), transparent 65%), radial-gradient(560px 380px at 5% 105%, rgba(123,208,198,0.10), transparent 65%)',
          animation: 'af-aurora 12s ease-in-out infinite',
        }}
      />
      <Link href="/dashboard" className="text-xs text-[#5b5e72]">← {t('dashboard')}</Link>
      <p className="text-[11px] uppercase tracking-[0.3em] text-[#b6abec] mt-4 mb-2">{t('Collective chart')} · {map.context}</p>
      <h1
        className="text-5xl font-serif"
        style={{
          background: 'linear-gradient(100deg, #ece9e0 20%, #e3c07a 55%, #b6abec 90%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {map.name}
      </h1>
      <p className="text-xs text-[#5b5e72] mt-2">
        {map.owner_handle ? `${t('woven by')} @${map.owner_handle} · ` : ''}
        {charts.length} {charts.length === 1 ? t('chart shining') : t('charts shining')} · {t('{element}-leaning weave', { element: dominant })}
      </p>

      <CollectiveContext
        mapId={map.id}
        name={map.name}
        purpose={ctx?.purpose ?? null}
        intention={ctx?.intention ?? null}
        isOwner={isOwner}
      />

      {isOwner && (
        <AddToConstellation mapId={map.id} existingHandles={handles} />
      )}
      {charts.length >= 2 && (
        <Link
          href={`/atlas/${map.id}`}
          className="inline-flex items-center gap-2 mt-3 px-3.5 py-2 rounded-lg text-sm bg-[#11131f] border border-[#2c3350] text-[#cfc8e8] hover:border-[#3a4670] transition"
        >
          🌍 {t('View on the globe — where your lines cross')}
        </Link>
      )}

      <Section title={t('The weave — your crew of stars')}>
        <div className="grid sm:grid-cols-2 gap-3">
          {members.map((m) => {
            const chart = m.handle ? chartByHandle.get(m.handle) : undefined;
            return (
              <HeroCard
                key={m.fbid}
                name={m.display_name ?? t('Unknown')}
                color={m.avatar_color ?? '#9a8fe0'}
                chart={chart}
                href={m.handle ? `/chart/${m.handle}` : undefined}
                notShared={t('their sky is not shared with you')}
              />
            );
          })}
          {guests.map((g) => (
            <HeroCard
              key={g.id}
              name={g.display_name}
              color={g.avatar_color}
              chart={g.chart}
              badge={g.claimed ? t('claimed ✓') : t('summoned — not yet in the flow')}
              notShared={t('their sky is not shared with you')}
            />
          ))}
        </div>
      </Section>

      <Section title={t('Collective cosmic powers')}>
        <div className="flex h-3.5 rounded-full overflow-hidden border border-[#242a3b]">
          {ELEMENTS.map((el) => (
            <div
              key={el}
              style={{
                width: `${(composite[el] / total) * 100}%`,
                background: `linear-gradient(180deg, ${EL_COLOR[el]}, ${EL_COLOR[el]}99)`,
                boxShadow: el === dominant ? `0 0 12px ${EL_COLOR[el]}88` : undefined,
              }}
            />
          ))}
        </div>
        <div className="flex gap-5 mt-2.5 text-xs text-[#9698a8] flex-wrap">
          {ELEMENTS.map((el) => (
            <span key={el}>
              <span style={{ color: EL_COLOR[el] }}>{EL_GLYPH[el]}</span> {el}{' '}
              <b style={{ color: EL_COLOR[el] }}>{composite[el]}</b>
            </span>
          ))}
        </div>
      </Section>

      {currents.count >= 1 && (
        <Section title={t('Read through a current')}>
          <p className="text-xs text-[#9698a8] -mt-1 mb-3">
            {t('See the whole crew through one tradition at a time — pick a current to lay everyone out in its frame.')}
          </p>
          <CurrentsLens data={currents} />
        </Section>
      )}

      {map.is_owner && (
        <Section title={t('Summon someone into the weave')}>
          <GuestTools
            mapId={map.id}
            guests={guests.map((g) => ({
              id: g.id, display_name: g.display_name, claimed: g.claimed, claim_code: g.claim_code,
            }))}
          />
        </Section>
      )}

      {charts.length >= 2 ? (
        <ReadingPanel mapId={map.id} pair={false} />
      ) : (
        <p className="text-sm text-[#5b5e72] mt-8">
          {t('The collective reading opens once at least two charts shine here for you.')}
        </p>
      )}
    </Shell>
  );
}

// A stellar-hero card: identity star, big three, and the four elements as
// cosmic power bars — your in-game character sheet, computed from the sky.
function HeroCard({ name, color, chart, href, badge, notShared }: {
  name: string; color: string; chart?: Chart; href?: string; badge?: string; notShared: string;
}) {
  const maxEl = chart ? Math.max(1, ...ELEMENTS.map((el) => chart.elements?.[el] ?? 0)) : 1;
  const inner = (
    <div
      className={`relative rounded-2xl p-4 bg-[#11131f]/90 border transition hover:-translate-y-0.5 ${badge ? 'border-dashed border-[#3a4158]' : 'border-[#242a3b]'}`}
      style={{ boxShadow: `0 0 22px -12px ${color}` }}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="w-3 h-3 rounded-full shrink-0"
          style={{ background: color, boxShadow: `0 0 10px 2px ${color}aa`, animation: 'af-twinkle 3.5s ease-in-out infinite' }}
        />
        <span className="font-serif text-lg">{name}</span>
        {badge && (
          <span className="text-[9px] uppercase tracking-wide text-[#8fb8e0] ml-auto text-right">{badge}</span>
        )}
      </div>
      {chart ? (
        <>
          <div className="text-xs text-[#cfc8e8] mt-1.5">
            {chart.bodies.Sun.sign} ☉ · {chart.bodies.Moon.sign} ☾{chart.asc ? ` · ${chart.asc.sign} ↑` : ''}
          </div>
          <div className="mt-3 space-y-1.5">
            {ELEMENTS.map((el) => {
              const v = chart.elements?.[el] ?? 0;
              return (
                <div key={el} className="flex items-center gap-2">
                  <span className="w-3 text-[10px]" style={{ color: EL_COLOR[el] }}>{EL_GLYPH[el]}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-[#0a0b14] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(v / maxEl) * 100}%`, background: EL_COLOR[el], opacity: 0.85 }}
                    />
                  </div>
                  <span className="w-3 text-[10px] text-[#5b5e72] text-right">{v}</span>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="text-xs text-[#5b5e72] mt-1.5">{notShared}</div>
      )}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="max-w-2xl mx-auto p-6 text-[#ece9e0]">{children}</div>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-7 pt-5 border-t border-white/5">
      <div className="text-[9px] uppercase tracking-[0.18em] text-[#b6abec] mb-3">{title}</div>
      {children}
    </div>
  );
}
