// @opennextjs/cloudflare config — deploys FlowGarden (Next 15 App Router) onto
// Cloudflare Workers. House hard rule: everything on Cloudflare, never Vercel.
//
// FlowGarden needs a real Worker (not a static export): it has ~30 API routes,
// an auth middleware, and every garden page is `force-dynamic` against Supabase.
import { defineCloudflareConfig } from '@opennextjs/cloudflare';

export default defineCloudflareConfig();
