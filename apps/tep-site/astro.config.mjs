// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Static by default — only the lead action runs on the server, so the whole
// narrative is prerendered HTML on Cloudflare's edge. No Vercel anywhere.
export default defineConfig({
  site: 'https://tuestratega.mx',
  output: 'static',
  adapter: cloudflare({
    imageService: 'passthrough',
  }),
  security: {
    checkOrigin: true,
  },
  build: {
    inlineStylesheets: 'always',
  },
  devToolbar: {
    enabled: false,
  },
});
