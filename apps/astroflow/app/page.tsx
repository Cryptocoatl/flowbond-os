import { visibleProfiles, myFbid } from '../lib/astro/access';
import Constellation from './components/Constellation';

// AstroFlow home — the constellation. Everything shown here is RLS-filtered by
// astroflow.visible_profiles(): you only ever receive charts you're allowed to see.
export default async function Home() {
  const [profiles, fbid] = await Promise.all([visibleProfiles(), myFbid()]);
  const hasProfile = !!fbid && profiles.some((p) => p.fbid === fbid);

  return <Constellation profiles={profiles} myFbid={fbid} hasProfile={hasProfile} />;
}
