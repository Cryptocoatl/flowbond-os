// Server-only entry — imports next/headers. Use from route handlers, never
// from a client component. Import client-safe helpers from '@flowbond/auth'.
export { handleAuthCallback, type CallbackOptions } from './callback'
