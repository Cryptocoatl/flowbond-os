// /play — the playable 3D Kai World. Server-fetches live region + missions, then
// hands off to the WebGL client. This is the game surface (web · phone · VR).
import { brand } from '@/lib/brand';
import { getRegion } from '@/lib/kai/data';
import { GameLoader } from '@/components/game/GameLoader';

export const revalidate = 30;

export default async function PlayPage() {
  // Live region drives the home world's vitality tint; the seven-worlds mission
  // content is authored client-side in lib/kai/worlds.ts.
  const region = await getRegion(brand.defaultRegionSlug);
  return <GameLoader region={region} />;
}
