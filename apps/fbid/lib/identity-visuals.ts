// Deterministic gradient avatar seeded by the FBID id — a unique "identity avatar".
// Shared by DashboardClient (header) and AppLauncher (ring center).
export function avatarGradient(seed: string) {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 360
  const h2 = (h + 140) % 360
  return `conic-gradient(from 210deg, hsl(${h} 80% 60%), hsl(${h2} 75% 55%), hsl(${(h + 280) % 360} 80% 60%), hsl(${h} 80% 60%))`
}

export function handoffHref(slug: string, callback: string) {
  return `/api/handoff?app=${encodeURIComponent(slug)}&redirect=${encodeURIComponent(callback)}`
}
