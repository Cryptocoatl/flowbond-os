// Post-build: next-on-pages routes every path except /_next/static/* through the
// worker, which does NOT serve HTTP range requests. Our media in /assets/* needs
// range/206 so the scroll-scrubbed film can seek. Excluding /assets/* makes Pages
// serve them as direct static assets (range-capable once edge-cached via _headers).
import { readFileSync, writeFileSync } from "node:fs";

const path = ".vercel/output/static/_routes.json";
const r = JSON.parse(readFileSync(path, "utf8"));
r.exclude = Array.isArray(r.exclude) ? r.exclude : [];
if (!r.exclude.includes("/assets/*")) r.exclude.push("/assets/*");
writeFileSync(path, JSON.stringify(r));
console.log("patched _routes.json exclude:", r.exclude.join(", "));
