// Client-safe entry — no server-only imports (safe in 'use client' components).
// Server helpers (the callback handler) live in '@flowbond/auth/server'.
export {
  ALLOWED_CALLBACKS,
  isAllowedRedirect,
  allowedCallbackUrls,
  type AllowedCallback,
} from './redirect-allowlist'
export { FBID_HUB_URL, hubRedirect } from './hub'
