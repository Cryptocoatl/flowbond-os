// @opennextjs/cloudflare config — deploys the FlowScrow separation-agreement
// vault onto Cloudflare Workers (house hard rule: everything on Cloudflare,
// never Vercel). Path-mounted at flowbond.life/separationagreement via a
// rewrite from apps/web, so basePath in next.config.ts must stay in sync.
import { defineCloudflareConfig } from '@opennextjs/cloudflare';

export default defineCloudflareConfig();
