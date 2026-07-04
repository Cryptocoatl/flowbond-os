import Link from 'next/link';
import { serverClient } from '../../lib/supabase-server';
import { myFbid } from '../../lib/astro/access';
import { astrocartography } from '../../lib/astro/astrocartography';
import { linesToGeoJSON, spotsToGeoJSON, strongestSpot, PLANET_COLOR, PLANET_GLYPH } from '../../lib/astro/acg-geo';
import type { Chart } from '../../lib/astro/types';
import AcgMap from '../components/AcgMap';

const PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const firstName = (s: string) => (s || 'You').trim().split(/\s+/)[0];

// Your Atlas — where your sky touches the earth. Every planet draws four lines
// across the globe; standing on one turns that planet's volume up in your life.
export default async function AtlasPage() {
  const me = await myFbid();
  if (!me)
    return (
      <Shell>
        <h1 className="text-2xl font-serif mb-2">Your Atlas</h1>
        <p className="text-[#9698a8] mb-5">Sign in to see where your stars fall across the earth.</p>
        <Link href="/auth/login?next=/atlas" className="bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-lg px-5 py-2.5">
          Sign in
        </Link>
      </Shell>
    );

  const sb = await serverClient();
  const { data: prof } = await sb
    .from('profiles')
    .select('handle, display_name, chart')
    .eq('fbid', me)
    .maybeSingle();

  if (!prof?.chart)
    return (
      <Shell>
        <h1 className="text-2xl font-serif mb-2">Your Atlas</h1>
        <p className="text-[#9698a8] mb-5">Create your chart first, then your power lines will appear on the globe.</p>
        <Link href="/profile/new" className="bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-lg px-5 py-2.5">
          Create your chart
        </Link>
      </Shell>
    );

  const chart = prof.chart as Chart;
  const name = firstName(prof.display_name);
  const lines = astrocartography(chart);
  const geojson = linesToGeoJSON(name, lines); // planet-coloured

  // The one pin: your single strongest power spot (tightest benefic line × city).
  const spot = strongestSpot(chart);
  const places = spot ? spotsToGeoJSON([spot]) : undefined;

  const legend = PLANETS.map((p) => ({ label: `${PLANET_GLYPH[p]} ${p}`, color: PLANET_COLOR[p] }));

  // ease toward the Sun's MC meridian — your line of public power
  const sunMc = lines.find((l) => l.planet === 'Sun' && l.kind === 'MC');
  const focus: [number, number] | undefined = sunMc?.lng != null ? [sunMc.lng, 25] : undefined;

  return (
    <Shell wide>
      <Backdrop />
      <p className="text-[11px] uppercase tracking-[0.3em] text-[#b6abec] mb-1">Astrocartography</p>
      <h1
        className="text-4xl font-serif"
        style={{ background: 'linear-gradient(100deg,#ece9e0 20%,#e3c07a 55%,#b6abec 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
      >
        Your Atlas
      </h1>
      <p className="text-sm text-[#9698a8] mt-2 mb-5 max-w-2xl">
        Every planet in your chart traces four lines across the earth. Stand on one and that
        planet&apos;s energy turns up — <b className="text-[#cfc8e8]">MC</b> for calling, <b className="text-[#cfc8e8]">IC</b> for
        home, <b className="text-[#cfc8e8]">AC</b> for vitality, <b className="text-[#cfc8e8]">DC</b> for connection. Tap any line to read it
        and see the cities it runs through, filter by planet, angle or a theme (Love, Career, Home…), and zoom into any
        region of the world.
      </p>

      <AcgMap
        layers={[{ id: 'me', geojson }]}
        places={places}
        legend={legend}
        focus={spot ? [spot.lng, spot.lat] : focus}
      />

      <p className="text-xs text-[#5b5e72] mt-4">
        Want to see where your lines cross a friend&apos;s? Open a collective&apos;s Atlas from its{' '}
        <Link href="/dashboard" className="text-[#b6abec] underline">flow map</Link> — that&apos;s where the power spots light up.
      </p>
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
