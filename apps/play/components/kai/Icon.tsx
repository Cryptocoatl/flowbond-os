// =============================================================================
// Icon — one stroke-based SVG set (24x24, currentColor). Lucide-flavoured so we
// can swap to `lucide-react` later without touching call sites. Server-safe.
// =============================================================================
import type { SVGProps } from 'react';

export type IconName =
  | 'home' | 'explore' | 'map' | 'missions' | 'communities' | 'events'
  | 'marketplace' | 'library' | 'profile'
  | 'tree' | 'water' | 'leaf' | 'bird' | 'people' | 'co2' | 'spark' | 'compass'
  | 'search' | 'plus' | 'chevron-right' | 'arrow-right'
  | 'sun' | 'moon' | 'wind' | 'temp' | 'shield' | 'star' | 'flame' | 'cube' | 'bell';

const P: Record<IconName, string> = {
  home: 'M3 10.5 12 4l9 6.5M5 9.5V20h14V9.5',
  explore: 'M12 12 9 15l-6 6 6-6 3-3 6-6-6 6Zm0 0 3-3 6-6-6 6-3 3Z',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14',
  missions: 'M5 4h11l3 3v13H5V4Zm3 6 2 2 4-4',
  communities: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm10 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20a6 6 0 0 1 12 0M13 20a6 6 0 0 1 9-4',
  events: 'M4 6h16v14H4V6Zm0 4h16M8 3v4m8-4v4',
  marketplace: 'M4 8h16l-1 12H5L4 8Zm4 0a4 4 0 0 1 8 0',
  library: 'M5 4h4v16H5V4Zm5 0h4v16h-4V4Zm6 1 3 .8-2.6 15L14 20',
  profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
  tree: 'M12 22v-6m0 0a5 5 0 0 0 5-5c0-1.5-.8-2.6-1.5-3.2A4 4 0 0 0 12 3a4 4 0 0 0-3.5 4.8C7.8 8.4 7 9.5 7 11a5 5 0 0 0 5 5Z',
  water: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z',
  leaf: 'M4 20C4 11 11 4 20 4c0 9-7 16-16 16Zm4-4 8-8',
  bird: 'M16 7a1 1 0 1 0 0-.01M3 20c4-1 6-4 6-8 0-3 2-6 6-6 3 0 6 1 6 1l-3 3 2 1-4 2M9 12l-5 8',
  people: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7 0a3 3 0 1 0 0-6M3 20a6 6 0 0 1 12 0m3-4a6 6 0 0 1 3 4',
  co2: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-3-9a3 3 0 0 1 6 0m-6 0a3 3 0 0 0 6 0',
  spark: 'M12 3v4m0 10v4m9-9h-4M7 12H3m14.5-6.5-2.8 2.8m-6.4 6.4-2.8 2.8m0-12 2.8 2.8m6.4 6.4 2.8 2.8',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm3.5-12.5-2 5-5 2 2-5 5-2Z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm7 3-4-4',
  plus: 'M12 5v14M5 12h14',
  'chevron-right': 'm9 6 6 6-6 6',
  'arrow-right': 'M5 12h14m-6-6 6 6-6 6',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-14v2m0 18v-2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10 1.4 1.4m0-13.2-1.4 1.4M7 17l-1.4 1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z',
  wind: 'M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h9',
  temp: 'M12 14V5a2 2 0 0 0-4 0v9a4 4 0 1 0 4 0Z',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z',
  star: 'm12 3 2.6 5.5 6 .8-4.4 4.2 1.1 6L12 16.8 6.7 19.5l1.1-6L3.4 9.3l6-.8L12 3Z',
  flame: 'M12 22a6 6 0 0 0 6-6c0-4-4-5-4-9-3 1-6 4-6 8a2.5 2.5 0 0 1-2-2c-1 1.5-2 3-2 5a6 6 0 0 0 8 6Z',
  cube: 'M12 3 21 8v8l-9 5-9-5V8l9-5Zm0 0v18m9-13-9 5-9-5',
  bell: 'M18 9a6 6 0 1 0-12 0c0 6-2 8-2 8h16s-2-2-2-8ZM10 21a2 2 0 0 0 4 0',
};

export function Icon({
  name,
  size = 18,
  ...props
}: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d={P[name]} />
    </svg>
  );
}
