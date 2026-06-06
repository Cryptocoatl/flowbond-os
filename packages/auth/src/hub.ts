// Helpers an app uses to bounce an unauthenticated visitor to the FBID hub.

export const FBID_HUB_URL =
  process.env.NEXT_PUBLIC_FBID_URL || 'https://fbid.flowbond.life'

/**
 * Build the hub login URL for an app.
 *
 * @param slug          the app's slug (must be in activate_app's CHECK list)
 * @param appCallbackUrl the app's OWN absolute callback URL, e.g.
 *                       `${window.location.origin}/auth/callback`
 * @param next          optional in-app path to land on after login (default '/')
 *
 * Returns e.g.
 *   https://fbid.flowbond.life/?app=astroflow&redirect=https%3A%2F%2Fastro.flowbond.life%2Fauth%2Fcallback%3Fnext%3D%2Fdashboard
 */
export function hubRedirect(
  slug: string,
  appCallbackUrl: string,
  next?: string,
): string {
  const callback = new URL(appCallbackUrl)
  if (next) callback.searchParams.set('next', next)

  const hub = new URL(FBID_HUB_URL)
  hub.searchParams.set('app', slug)
  hub.searchParams.set('redirect', callback.toString())
  return hub.toString()
}
