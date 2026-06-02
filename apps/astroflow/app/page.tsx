import { visibleProfiles, myFbid } from '../lib/astro/access';
import Constellation from './components/Constellation';
import Landing from './components/Landing';

// AstroFlow home. Logged-out visitors get the landing experience; signed-in
// FlowBond identities land directly in their constellation (RLS-filtered).
export default async function Home() {
  const fbid = await myFbid();
  if (!fbid) return <Landing />;

  const profiles = await visibleProfiles();
  const hasProfile = profiles.some((p) => p.fbid === fbid);
  return <Constellation profiles={profiles} myFbid={fbid} hasProfile={hasProfile} />;
}
