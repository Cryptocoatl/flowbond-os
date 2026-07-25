// Explore is the front door. Server component: fetch live region + missions from
// the kai_ engine, then compose the dashboard. Streams; no client data-fetching.
import { brand } from '@/lib/brand';
import { getRegion, listMissions } from '@/lib/kai/data';
import { ExploreDashboard } from '@/components/kai/ExploreDashboard';

// Region state changes as proofs are validated — keep this fresh.
export const revalidate = 30;

export default async function Home() {
  const [region, missions] = await Promise.all([
    getRegion(brand.defaultRegionSlug),
    listMissions(),
  ]);
  return <ExploreDashboard region={region} missions={missions} />;
}
