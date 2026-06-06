import Link from 'next/link';
import { serverClient } from '../../lib/supabase-server';
import { myFbid } from '../../lib/astro/access';
import DashboardClient from '../components/DashboardClient';

// Your AstroFlow control room: collective charts (flow maps), who you allow to
// see your chart, incoming access requests, and friends. All RLS-backed.
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
  const [maps, requests, allowances, friends, crews, me] = await Promise.all([
    sb.rpc('my_flow_maps'),
    sb.rpc('my_incoming_requests'),
    sb.rpc('my_allowances'),
    sb.rpc('my_friends'),
    sb.rpc('my_crews'),
    sb.from('profiles').select('handle, display_name, visibility').eq('fbid', fbid).maybeSingle(),
  ]);

  return (
    <DashboardClient
      me={me.data ?? null}
      maps={maps.data ?? []}
      requests={requests.data ?? []}
      allowances={allowances.data ?? []}
      friends={friends.data ?? []}
      crews={crews.data ?? []}
    />
  );
}
