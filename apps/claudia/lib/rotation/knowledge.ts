// ════════════════════════════════════════════════════════════════════════
//  ClaudIA · Rotación — base de conocimiento de infraestructura
//
//  SERVER-SIDE ONLY (same rule as plan.ts): reaches the browser exclusively
//  through the RSC payload after the three /rotation locks pass.
//  Facts verified by ClaudIA local on 2026-07-14 via DNS + HTTP-header
//  fingerprinting + repo inspection. No secret values, ever.
//  Keep in sync as the Vercel→Cloudflare migration advances.
// ════════════════════════════════════════════════════════════════════════

export const KNOWLEDGE_DATE = '2026-07-15';

export const INFRA_KNOWLEDGE = `
HECHOS DE INFRAESTRUCTURA (verificados ${KNOWLEDGE_DATE} por ClaudIA local — DNS + headers + repos):

DÓNDE VIVE CADA APP HOY:
• flowgarden.life — app en VERCEL detrás de proxy Cloudflare (DNS ya migró a CF, hosting no: tiene x-vercel-id). Sus env vars se actualizan en VERCEL (proyecto flowgarden) y luego redeploy.
• MIGRADOS A CLOUDFLARE PAGES 2026-07-14/15 (batch estático completo, verificados 200 desde edge CF): chords.flowme.one (flowchords), time.flowme.one (timeflow), steph.flowme.one (flow-steph), micelio.reciprociudad.lat, legatum.flowme.one (legatum-site — la copia Vercel servía branding viejo), brandmark.click (brandmark-web; ⚠️ brandmark.com.mx sigue en Vercel hasta mover su DNS), voces.flowme.one (proyecto Pages "voces", _headers portados, MP intacto), origo.flowme.one (origo-site-crr, con api/flowme + api/voice convertidas a Pages Functions — sin secretos aún = paridad 503/canned con prod anterior; al configurar ANTHROPIC_API_KEY propio el chat cobra vida). Proyectos Vercel vivos como rollback 24-48h.
• SIGUEN EN VERCEL (Next.js, migración one-by-one pendiente vía OpenNext): flowme.one (+ /flowmap), translate.flowme.one (Raíz), fbid.flowbond.life (hub FBID), flowbond.life, claudiaflow.life, mountaindogs.app, refirides-sigma.vercel.app, mohe-web, flowcdmx, heady-teddys, flowgarden.life (Vercel detrás de proxy CF). Env vars en Vercel + redeploy.
• legatum.lat — CLOUDFLARE Worker puro (repo local ~/Projects/legatum, deploy desde dist/, wrangler desde raíz del repo). Secretos: npx wrangler secret put <KEY> desde la raíz del repo.
• ops.claudiaflow.life (FlowOps) — CLOUDFLARE Worker (OpenNext), repo local ~/Projects/flowops (wrangler.jsonc). Secretos: npx wrangler secret put <KEY> desde ese repo.
• kai.flowbond.life (Los Siete Mundos) — CLOUDFLARE Pages (proyecto kai-mundos) + Worker "abuela" (abuela.cryptocoatl101.workers.dev, fuente ~/Downloads/KAI WORLD/abuela-worker.js). Secreto de la Abuela: npx wrangler secret put ANTHROPIC_API_KEY --name abuela.
• micelio.reciprociudad.lat — Cloudflare. Estado migración: DNS de varios dominios ya en CF; hosting sigue en Vercel salvo flowops, kai-mundos, legatum, micelio.

LLAVES — HECHOS ESPECÍFICOS:
• flowgarden/ANTHROPIC_API_KEY: HOY es una sola llave compartida por 3 superficies (Worker abuela, Worker flowops, y la entrada flowgarden). El plan es separarla en 3 llaves nuevas (kai-abuela-2026-07, flowops-ask-2026-07, flowgarden-2026-07) para atribución de gasto por app en la consola Anthropic.
• flowbond-app/RESEND_API_KEY: HUÉRFANA — ningún código la usa; flowbond.life no usa Resend. Solo se revoca en Resend y se borra del vault (claudia keys rm). Los Resend vivos: legatum (Worker CF) y heady-teddys (Vercel).
• Supabase canónico fgsrcxxccdjqyrpkitmk: service_role compartida por 5 entradas del vault (flowme, flowdesk, flowgarden, raiz-translation, flowcdmx). Se rota UNA vez al final (Sesión 4) + sweep de deploys. flowbond-app, heady-teddys y legatum (ptadpggunfelcuknxoli) tienen proyectos Supabase propios.
• cloudflare/CLOUDFLARE_API_TOKEN: permisos Pages Edit + Zone DNS flowbond.life (deploys kai-mundos). cloudflare/CLOUDFLARE_EMAIL_TOKEN: Email Routing + Workers (Legatum).
• NUNCA rotar: flowbond-app/IDENTITY_GLOBAL_SALT (rompe FBIDs), flowbond-app/EAS_PRIVATE_KEY (dirección on-chain), VERCEL_OIDC_TOKEN (efímero).

CÓMO SE EJECUTA (siempre en la terminal local de Steph — Claude Code / ClaudIA local):
• Vercel env: vercel env rm <KEY> production && vercel env add <KEY> production (en el dir del proyecto) → vercel --prod.
• CF Worker: npx wrangler secret put <KEY> (en el repo del worker; efecto inmediato).
• Vault local: claudia keys rotate <proyecto> <KEY> --yes (prompt silencioso) · claudia keys set para entradas nuevas · claudia keys rm ... --yes para huérfanas.
• Verificación en vivo la corre ClaudIA local (Playwright real, no solo curl).
`.trim();
