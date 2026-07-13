// ════════════════════════════════════════════════════════════════════════
//  ClaudIA · Rotación de llaves — el plan  (lib/rotation/plan.ts)
//
//  METADATA ONLY. This file (and the whole /rotation surface) never holds a
//  secret value: key NAMES, provider links, deploy targets, verify steps.
//  Values flow exclusively provider → local Keychain via the silent
//  `claudia keys rotate` prompt on Steph's Mac. Mirrors
//  ~/.claudia/key-rotation-runbook.md (local source of truth).
// ════════════════════════════════════════════════════════════════════════

export type StepId = 'created' | 'deployed' | 'verified' | 'vaulted' | 'revoked';

export const STEP_LABEL: Record<StepId, string> = {
  created: '1 · Nueva llave creada en el proveedor (la vieja sigue viva)',
  deployed: '2 · Deploys actualizados (Vercel env / wrangler secret)',
  verified: '3 · App viva verificada',
  vaulted: '4 · Guardada en el vault local (prompt silencioso)',
  revoked: '5 · Llave vieja revocada en el proveedor',
};

export const ALL_STEPS: StepId[] = ['created', 'deployed', 'verified', 'vaulted', 'revoked'];

export interface RotationItem {
  id: string;
  session: 1 | 2 | 3 | 4;
  project: string;
  key: string;
  provider: string;
  providerUrl: string;
  /** Steps that apply (local-only scripts skip 'deployed'). */
  steps?: StepId[];
  deploy?: string[];
  verify?: string;
  warn?: string;
  /** Self-generated secret: mint locally, no provider dashboard. */
  selfGenerated?: boolean;
}

export const SESSION_TITLES: Record<number, string> = {
  1: 'Sesión 1 · SaaS API keys (bajo riesgo — construye el músculo)',
  2: 'Sesión 2 · Dinero + tokens de plataforma',
  3: 'Sesión 3 · Secretos auto-generados (openssl rand -base64 32)',
  4: 'Sesión 4 · Supabase service-role (mayor radio de impacto — AL FINAL)',
};

export const ROTATION_PLAN: RotationItem[] = [
  // ── Sesión 1 · SaaS API keys ────────────────────────────────────────────
  {
    id: 'flowgarden/ANTHROPIC_API_KEY', session: 1,
    project: 'flowgarden', key: 'ANTHROPIC_API_KEY',
    provider: 'Anthropic Console', providerUrl: 'https://platform.claude.com/settings/keys',
    deploy: ['kai-mundos Abuela Worker → npx wrangler secret put ANTHROPIC_API_KEY', 'FlowOps /ask Worker → npx wrangler secret put ANTHROPIC_API_KEY'],
    verify: 'Abuela responde en kai.flowbond.life · FlowOps import Excel funciona',
    warn: 'Llave compartida por 3 superficies — actualiza AMBOS workers antes de revocar. Es la que recargaste el 12-jul.',
  },
  {
    id: 'flowbond-app/ANTHROPIC_API_KEY', session: 1,
    project: 'flowbond-app', key: 'ANTHROPIC_API_KEY',
    provider: 'Anthropic Console', providerUrl: 'https://platform.claude.com/settings/keys',
    deploy: ['Vercel env del proyecto flowbond-app + redeploy'],
  },
  {
    id: 'flowbond-app/RESEND_API_KEY', session: 1,
    project: 'flowbond-app', key: 'RESEND_API_KEY',
    provider: 'Resend', providerUrl: 'https://resend.com/api-keys',
    deploy: ['Vercel env flowbond-app + redeploy'],
  },
  {
    id: 'heady-teddys-project/RESEND_API_KEY', session: 1,
    project: 'heady-teddys-project', key: 'RESEND_API_KEY',
    provider: 'Resend', providerUrl: 'https://resend.com/api-keys',
    deploy: ['Vercel env heady-teddys + redeploy'],
    warn: 'Confirma en cuál cuenta Resend vive esta llave.',
  },
  {
    id: 'legatum/RESEND_API_KEY', session: 1,
    project: 'legatum', key: 'RESEND_API_KEY',
    provider: 'Resend', providerUrl: 'https://resend.com/api-keys',
    deploy: ['Worker correo Legatum → npx wrangler secret put RESEND_API_KEY (desde la raíz del repo legatum)'],
    verify: 'Enviar correo de prueba desde legatum.lat/admin',
    warn: 'Correo Legatum en producción real (Guillermo/Pablo).',
  },
  {
    id: 'raiz-translation/DEEPL_API_KEY', session: 1,
    project: 'raiz-translation', key: 'DEEPL_API_KEY',
    provider: 'DeepL', providerUrl: 'https://www.deepl.com/en/your-account/keys',
    deploy: ['Vercel env raiz-translation + redeploy'],
    verify: 'translate.flowme.one traduce de verdad',
  },
  {
    id: 'brandmark/APIFY_TOKEN', session: 1,
    project: 'brandmark', key: 'APIFY_TOKEN',
    provider: 'Apify', providerUrl: 'https://console.apify.com/settings/integrations',
    deploy: ['Donde corra el leadgen de BrandMark (revisar con ClaudIA)'],
  },
  {
    id: 'refirides/POLYGONSCAN_API_KEY', session: 1,
    project: 'refirides', key: 'POLYGONSCAN_API_KEY',
    provider: 'Polygonscan', providerUrl: 'https://polygonscan.com/myapikey',
    deploy: ['Vercel env refirides + redeploy'],
  },
  {
    id: 'TULUM LOT 9 Topography/OPENTOPO_API_KEY', session: 1,
    project: 'TULUM LOT 9 Topography', key: 'OPENTOPO_API_KEY',
    provider: 'OpenTopography', providerUrl: 'https://portal.opentopography.org/myopentopo',
    steps: ['created', 'vaulted', 'revoked'],
    verify: 'Script local — sin deploy.',
  },

  // ── Sesión 2 · Dinero + plataforma ──────────────────────────────────────
  {
    id: 'refirides/STRIPE_SECRET_KEY', session: 2,
    project: 'refirides', key: 'STRIPE_SECRET_KEY',
    provider: 'Stripe (Roll key, gracia 24h)', providerUrl: 'https://dashboard.stripe.com/apikeys',
    deploy: ['Vercel env refirides + redeploy'],
    warn: '“Roll key” con ventana de gracia 24h = create-then-revoke automático.',
  },
  {
    id: 'heady-teddys-project/STRIPE_SECRET_KEY', session: 2,
    project: 'heady-teddys-project', key: 'STRIPE_SECRET_KEY',
    provider: 'Stripe (otra cuenta)', providerUrl: 'https://dashboard.stripe.com/apikeys',
    deploy: ['Vercel env heady-teddys + redeploy'],
  },
  {
    id: 'heady-teddys-project/STRIPE_WEBHOOK_SECRET', session: 2,
    project: 'heady-teddys-project', key: 'STRIPE_WEBHOOK_SECRET',
    provider: 'Stripe · Webhooks', providerUrl: 'https://dashboard.stripe.com/webhooks',
    deploy: ['Vercel env heady-teddys + redeploy'],
    verify: 'Webhook de prueba desde el dashboard Stripe llega 200',
  },
  {
    id: 'refirides/MERCADOPAGO_ACCESS_TOKEN', session: 2,
    project: 'refirides', key: 'MERCADOPAGO_ACCESS_TOKEN',
    provider: 'MercadoPago', providerUrl: 'https://www.mercadopago.com.mx/developers/panel/app',
    deploy: ['Vercel env refirides + redeploy'],
  },
  {
    id: 'cloudflare/CLOUDFLARE_API_TOKEN', session: 2,
    project: 'cloudflare', key: 'CLOUDFLARE_API_TOKEN',
    provider: 'Cloudflare (Roll token)', providerUrl: 'https://dash.cloudflare.com/profile/api-tokens',
    steps: ['created', 'vaulted', 'revoked'],
    warn: 'Mismos permisos: Pages Edit + Zone DNS flowbond.life (deploys kai-mundos).',
  },
  {
    id: 'cloudflare/CLOUDFLARE_EMAIL_TOKEN', session: 2,
    project: 'cloudflare', key: 'CLOUDFLARE_EMAIL_TOKEN',
    provider: 'Cloudflare (Roll token)', providerUrl: 'https://dash.cloudflare.com/profile/api-tokens',
    steps: ['created', 'vaulted', 'revoked'],
    warn: 'Email Routing + Workers (Legatum).',
  },
  {
    id: 'mohe-web/VERCEL_TOKEN', session: 2,
    project: 'mohe-web', key: 'VERCEL_TOKEN',
    provider: 'Vercel', providerUrl: 'https://vercel.com/account/settings/tokens',
    deploy: ['Vercel env mohe-web + redeploy'],
  },
  {
    id: 'mohe-web/GITHUB_TOKEN', session: 2,
    project: 'mohe-web', key: 'GITHUB_TOKEN',
    provider: 'GitHub · PAT', providerUrl: 'https://github.com/settings/tokens',
    deploy: ['Vercel env mohe-web + redeploy'],
  },
  {
    id: 'mohe-web/AUTH_GITHUB_SECRET', session: 2,
    project: 'mohe-web', key: 'AUTH_GITHUB_SECRET',
    provider: 'GitHub · OAuth App', providerUrl: 'https://github.com/settings/developers',
    deploy: ['Vercel env mohe-web + redeploy'],
  },
  {
    id: 'mohe-web/AUTH_SECRET', session: 2,
    project: 'mohe-web', key: 'AUTH_SECRET', selfGenerated: true,
    provider: 'openssl rand -base64 32', providerUrl: '',
    deploy: ['Vercel env mohe-web + redeploy'],
    warn: 'Invalida sesiones activas en mohe-web (re-login y ya).',
  },
  {
    id: 'heady-teddys-project/SHOPIFY_ADMIN_API_TOKEN', session: 2,
    project: 'heady-teddys-project', key: 'SHOPIFY_ADMIN_API_TOKEN',
    provider: 'Shopify · Develop apps', providerUrl: 'https://admin.shopify.com',
    deploy: ['Vercel env heady-teddys + redeploy'],
    warn: 'Settings → Apps and sales channels → Develop apps → tu app → API credentials → rotate.',
  },
  {
    id: 'heady-teddys-project/SHOPIFY_WEBHOOK_SECRET', session: 2,
    project: 'heady-teddys-project', key: 'SHOPIFY_WEBHOOK_SECRET',
    provider: 'Shopify (rota junto con credentials)', providerUrl: 'https://admin.shopify.com',
    deploy: ['Vercel env heady-teddys + redeploy'],
  },
  {
    id: 'flowbond-app/TELEGRAM_BOT_TOKEN', session: 2,
    project: 'flowbond-app', key: 'TELEGRAM_BOT_TOKEN',
    provider: 'Telegram @BotFather (/revoke)', providerUrl: 'https://t.me/BotFather',
    deploy: ['Vercel env flowbond-app + redeploy — EN EL MISMO MINUTO'],
    warn: 'Telegram revoca al instante (sin traslape). Ten el deploy listo antes de tocar /revoke.',
  },

  // ── Sesión 3 · Auto-generados ───────────────────────────────────────────
  {
    id: 'legatum/EMAIL_TOKEN_ADMIN', session: 3,
    project: 'legatum', key: 'EMAIL_TOKEN_ADMIN', selfGenerated: true,
    provider: 'openssl rand -base64 32', providerUrl: '',
    deploy: ['Worker Legatum → wrangler secret put'],
  },
  {
    id: 'legatum/EMAIL_TOKEN_GUILLERMO', session: 3,
    project: 'legatum', key: 'EMAIL_TOKEN_GUILLERMO', selfGenerated: true,
    provider: 'openssl rand -base64 32', providerUrl: '',
    deploy: ['Worker Legatum → wrangler secret put'],
    warn: 'Guillermo responde desde Outlook vía reply+token@ — mándale su nueva dirección.',
  },
  {
    id: 'legatum/EMAIL_TOKEN_PABLO', session: 3,
    project: 'legatum', key: 'EMAIL_TOKEN_PABLO', selfGenerated: true,
    provider: 'openssl rand -base64 32', providerUrl: '',
    deploy: ['Worker Legatum → wrangler secret put'],
    warn: 'Igual que Guillermo — nueva dirección reply+token@ para Pablo.',
  },
  {
    id: 'legatum/SESSION_SECRET', session: 3,
    project: 'legatum', key: 'SESSION_SECRET', selfGenerated: true,
    provider: 'openssl rand -base64 32', providerUrl: '',
    deploy: ['Worker Legatum → wrangler secret put'],
    warn: 'Invalida sesiones del panel /admin (re-login).',
  },
  {
    id: 'flowcdmx/ADMIN_PASSWORD', session: 3,
    project: 'flowcdmx', key: 'ADMIN_PASSWORD', selfGenerated: true,
    provider: 'password manager / openssl', providerUrl: '',
    deploy: ['Vercel env flowcdmx + redeploy'],
  },
  {
    id: 'flowcdmx/ADMIN_SESSION_SECRET', session: 3,
    project: 'flowcdmx', key: 'ADMIN_SESSION_SECRET', selfGenerated: true,
    provider: 'openssl rand -base64 32', providerUrl: '',
    deploy: ['Vercel env flowcdmx + redeploy'],
  },
  {
    id: 'flowdesk/FLOWEDIT_WEBHOOK_SECRET', session: 3,
    project: 'flowdesk', key: 'FLOWEDIT_WEBHOOK_SECRET', selfGenerated: true,
    provider: 'openssl rand -base64 32', providerUrl: '',
    deploy: ['AMBOS lados en la misma sentada: env flowdesk + emisor flowedit'],
  },
  {
    id: 'flowme/HH_ACCESS_CODE', session: 3,
    project: 'flowme', key: 'HH_ACCESS_CODE', selfGenerated: true,
    provider: 'código nuevo (Holy Honey gate)', providerUrl: '',
    deploy: ['Vercel env flowme + redeploy'],
    warn: 'Avisa el código nuevo a los viewers autorizados del data room.',
  },
  {
    id: 'flowops/DEMO_PASSWORDS', session: 3,
    project: 'flowops', key: 'DEMO_*_PASSWORD (×5)', selfGenerated: true,
    provider: 'Supabase Auth (usuarios demo staging)', providerUrl: 'https://supabase.com/dashboard',
    deploy: ['Cambiar password en Supabase Auth + vault (owner/gerente/cajero/almacén/ajeno)'],
    warn: 'Solo staging — prioridad mínima, ciérralo al final de la sesión.',
  },

  // ── Sesión 4 · Supabase service-role ────────────────────────────────────
  {
    id: 'supabase/canonical', session: 4,
    project: 'canónico fgsrcxxccdjqyrpkitmk', key: 'SUPABASE_SERVICE_ROLE_KEY (5 entradas)',
    provider: 'Supabase · API settings', providerUrl: 'https://supabase.com/dashboard/project/fgsrcxxccdjqyrpkitmk/settings/api',
    deploy: [
      'UNA rotación → 5 entradas del vault: flowme, flowdesk, flowgarden, raiz-translation, flowcdmx',
      'Sweep de deploys: flowme.one, translate.flowme.one, voces, flowmap, flowcdmx, flowdesk, flowgarden…',
    ],
    verify: 'ClaudIA hace click-through de cada app viva (Playwright, no solo curl)',
    warn: 'ANTES DE TOCAR: revisa si el proyecto tiene el sistema nuevo de API keys (publishable+secret). Si sí → la secret rota sola, sin redeploy de frontends. Si solo legacy JWT → rotar mata también las anon keys y TODO frontend debe redeployar. Planea una noche.',
  },
  {
    id: 'supabase/flowbond-app', session: 4,
    project: 'flowbond-app', key: 'SUPABASE_SERVICE_ROLE_KEY',
    provider: 'Supabase (proyecto propio)', providerUrl: 'https://supabase.com/dashboard',
    deploy: ['Vercel env flowbond-app + redeploy'],
  },
  {
    id: 'supabase/heady-teddys', session: 4,
    project: 'heady-teddys-project', key: 'SUPABASE_SERVICE_ROLE_KEY',
    provider: 'Supabase (proyecto propio)', providerUrl: 'https://supabase.com/dashboard',
    deploy: ['Vercel env heady-teddys + redeploy'],
  },
  {
    id: 'supabase/legatum', session: 4,
    project: 'legatum', key: 'SUPABASE_SERVICE_ROLE_KEY',
    provider: 'Supabase ptadpggunfelcuknxoli', providerUrl: 'https://supabase.com/dashboard/project/ptadpggunfelcuknxoli/settings/api',
    deploy: ['Worker Legatum → wrangler secret put (desde raíz del repo)'],
    verify: '/admin leads + correo funcionan',
  },
];

/** Never rotate without a migration plan — shown greyed-out, unclickable. */
export const PARKED: { id: string; reason: string }[] = [
  { id: 'flowbond-app/IDENTITY_GLOBAL_SALT', reason: 'Rotarla rompe TODOS los FBID derivados.' },
  { id: 'flowbond-app/EAS_PRIVATE_KEY', reason: 'Llave nueva = dirección attester on-chain nueva = migración.' },
  { id: 'VERCEL_OIDC_TOKEN (flowcdmx, flowbond-os)', reason: 'Efímero — Vercel lo re-emite solo. Ignorar.' },
  { id: 'flowcdmx/POSTGRES_*', reason: 'Rota vía reset de password de DB en Supabase — decidir en Sesión 4.' },
];

/** The exact local command — the ONLY place a value ever gets typed. */
export const rotateCmd = (project: string, key: string) =>
  `claudia keys rotate ${project.includes(' ') ? `"${project}"` : project} ${key} --yes`;
