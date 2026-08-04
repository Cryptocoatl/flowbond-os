// @opennextjs/cloudflare config — deploys the flowbond.life Next 15 App Router
// site onto Cloudflare Workers (house hard rule: everything on Cloudflare,
// never Vercel). The site is mostly static; the Worker exists to serve the
// `joinWaitlist` Server Action and the /separationagreement rewrite.
import { defineCloudflareConfig } from '@opennextjs/cloudflare';

export default defineCloudflareConfig();
