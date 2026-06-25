// The app is path-mounted at flowbond.life/separationagreement, so client-side
// fetch() calls (which Next does NOT auto-prefix, unlike <Link>/router) must
// include the basePath. Keep this in sync with next.config.ts `basePath`.
export const BASE_PATH = '/separationagreement';

/** Prefix an in-app API path with the basePath for client fetch(). */
export const apiUrl = (p: string) => `${BASE_PATH}${p}`;
