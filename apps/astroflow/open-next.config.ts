// @opennextjs/cloudflare config — puts the AstralFlow Next 15 App Router app on
// Cloudflare Workers (house rule: everything on Cloudflare, never Vercel).
//
// Unlike apps/web this app is mostly dynamic: 9 route handlers (FlowMe chat,
// readings, dreams, /api/health) plus per-user server-rendered pages that read
// the caller's own chart through their authed Supabase session. The Worker is
// the whole app, not just an escape hatch for one Server Action.
import { defineCloudflareConfig } from '@opennextjs/cloudflare';

export default defineCloudflareConfig();
