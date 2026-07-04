import { visibleProfiles, myFbid } from '../lib/astro/access';
import { serverClient } from '../lib/supabase-server';
import Constellation, { type GhostNode, type SavedMap } from './components/Constellation';
import Landing from './components/Landing';

// AstroFlow home. Logged-out visitors get the landing experience; signed-in
// FlowBond identities land directly in their constellation (RLS-filtered):
// their circle (friends gold-ringed), ghost stars awaiting activation, and
// their saved constellations to jump back into collectively.
export default async function Home() {
  const fbid = await myFbid();
  if (!fbid) return <Landing />;

  const sb = await serverClient();
  const [profiles, guestsRes, friendsRes, mapsRes] = await Promise.all([
    visibleProfiles(),
    sb.rpc('my_guests'),
    sb.rpc('my_friends'),
    sb.rpc('my_flow_maps'),
  ]);
  const hasProfile = profiles.some((p) => p.fbid === fbid);
  const guests = (guestsRes.data ?? []) as GhostNode[];

  // friends come back by handle — resolve to the fbids the circle is keyed on
  const friendHandles = new Set(((friendsRes.data ?? []) as any[]).map((f) => f.handle));
  const friendFbids = profiles.filter((p) => friendHandles.has(p.handle)).map((p) => p.fbid);

  const savedMaps: SavedMap[] = ((mapsRes.data ?? []) as any[]).map((m) => ({
    id: m.id,
    name: m.name,
    context: m.context,
    member_count: Array.isArray(m.members) ? m.members.length : 0,
  }));

  return (
    <Constellation
      profiles={profiles}
      myFbid={fbid}
      hasProfile={hasProfile}
      guests={guests}
      friendFbids={friendFbids}
      savedMaps={savedMaps}
    />
  );
}
