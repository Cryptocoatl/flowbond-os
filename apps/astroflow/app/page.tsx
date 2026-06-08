import { visibleProfiles, myFbid } from '../lib/astro/access';
import { serverClient } from '../lib/supabase-server';
import Constellation, { type GhostNode } from './components/Constellation';
import Landing from './components/Landing';

// AstroFlow home. Logged-out visitors get the landing experience; signed-in
// FlowBond identities land directly in their constellation (RLS-filtered),
// with their charted-but-unactivated connections orbiting as ghost stars.
export default async function Home() {
  const fbid = await myFbid();
  if (!fbid) return <Landing />;

  const sb = await serverClient();
  const [profiles, guestsRes] = await Promise.all([visibleProfiles(), sb.rpc('my_guests')]);
  const hasProfile = profiles.some((p) => p.fbid === fbid);
  const guests = (guestsRes.data ?? []) as GhostNode[];
  return <Constellation profiles={profiles} myFbid={fbid} hasProfile={hasProfile} guests={guests} />;
}
