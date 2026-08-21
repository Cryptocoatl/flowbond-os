// =============================================================================
// Region film — which footage stands behind a region until it has its own.
//
// This map exists because the naming convention (`/videos/<slug>.mp4`) was
// silently pointing the front door at the wrong file: `valle-espejo.mp4` and
// `living-world.mp4` are slow pans over a DESIGN MOCK-UP — a rendered picture
// of a product UI — and that mock-up was what played behind the hero of
// play.flowbond.life and what illustrated "Places to discover". `discovery.mp4`
// is the actual cinematic reel (jungle, ruins, the cosmos) and was unused.
//
// Point a region at its own film here the moment one exists.
// =============================================================================
export interface RegionFilm {
  mp4: string;
  poster: string;
}

const FILMS: Record<string, RegionFilm> = {
  'valle-espejo': { mp4: '/videos/discovery.mp4', poster: '/videos/discovery-poster.jpg' },
};

export function regionFilm(slug: string): RegionFilm {
  return FILMS[slug] ?? { mp4: `/videos/${slug}.mp4`, poster: `/videos/${slug}.jpg` };
}
