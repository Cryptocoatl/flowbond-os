import Link from 'next/link';
import { serverClient } from '../../lib/supabase-server';
import { myFbid, visibleProfiles } from '../../lib/astro/access';
import DashboardClient from '../components/DashboardClient';
import BubbleField, { type Bubble } from '../components/BubbleField';

// Your AstroFlow control room: the living bubble constellation of everyone in
// your flow, collective charts (flow maps), who you allow to see your chart,
// incoming access requests, and friends. All RLS-backed.
export default async function Dashboard() {
  const fbid = await myFbid();
  if (!fbid) {
    return (
      <div className="max-w-md mx-auto p-6 mt-16 text-center text-[#ece9e0]">
        <h1 className="text-2xl font-serif mb-3">Your dashboard</h1>
        <p className="text-[#9698a8] mb-5">Sign in to see your collective charts and allowances.</p>
        <Link href="/auth/login?next=/dashboard" className="bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-lg px-5 py-2.5">
          Log in
        </Link>
      </div>
    );
  }

  const sb = await serverClient();
  const [maps, requests, allowances, friends, crews, audience, me, people] = await Promise.all([
    sb.rpc('my_flow_maps'),
    sb.rpc('my_incoming_requests'),
    sb.rpc('my_allowances'),
    sb.rpc('my_friends'),
    sb.rpc('my_crews'),
    sb.rpc('my_audience'),
    sb.from('profiles').select('handle, display_name, visibility').eq('fbid', fbid).maybeSingle(),
    visibleProfiles(),
  ]);

  // Everyone whose star you can see, you first — your active bubble map.
  const bubbles: Bubble[] = people
    .map((p) => ({
      handle: p.handle,
      name: p.displayName,
      color: p.avatarColor,
      sun: p.chart.bodies.Sun.sign,
      moon: p.chart.bodies.Moon.sign,
      rising: p.chart.asc?.sign ?? null,
      isMe: p.fbid === fbid,
    }))
    .sort((a, b) => Number(b.isMe) - Number(a.isMe));

  return (
    <>
      <div className="max-w-2xl mx-auto px-6 pt-6">
        <BubbleField people={bubbles} />
      </div>
      <DashboardClient
        me={me.data ?? null}
        maps={maps.data ?? []}
        requests={requests.data ?? []}
        allowances={allowances.data ?? []}
        friends={friends.data ?? []}
        crews={crews.data ?? []}
        audience={audience.data ?? []}
      />
    </>
  );
}
