/* Reemplazo del cron de Vercel (`vercel.json` → crons `0 * /6 * * *`) al migrar
   el hub a Cloudflare. Va en un Worker aparte a propósito: el worker del hub lo
   genera OpenNext y sólo exporta `fetch`; meterle un handler `scheduled` obliga
   a envolver un bundle generado, que se rompe en cada actualización de OpenNext.
   Veinte líneas independientes son más fáciles de mantener y de entender.

   Sólo llama al endpoint que ya existía y ya se auditaba a sí mismo
   (`/api/monitor` corre 14 comprobaciones y sólo manda correo si algo se rompió).
   El secreto va en `wrangler secret put CRON_SECRET` y tiene que ser EL MISMO
   que el del worker `fbid` — copia en el vault: `claudia keys get fbid CRON_SECRET`. */
export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(run(env));
  },
  // Disparo manual para probar sin esperar 6 horas. Pide el mismo secreto, así
  // que no expone nada: sin él contesta 401 igual que el endpoint que llama.
  async fetch(request, env) {
    const auth = request.headers.get('authorization');
    if (!env.CRON_SECRET || auth !== `Bearer ${env.CRON_SECRET}`) {
      return new Response('unauthorized', { status: 401 });
    }
    const r = await run(env);
    return new Response(JSON.stringify(r), { headers: { 'content-type': 'application/json' } });
  },
};

/* Este worker es además EL ÚNICO que puede mirar al hub de verdad: en
   Cloudflare, un Worker que se llama a sí mismo se detecta como bucle y contesta
   522, así que el hub no puede comprobar su propia salud. Aquí se observa desde
   fuera y se le pasa lo visto en `?hub=` y `?guard=`; el juicio y el correo de
   alerta siguen viviendo en /api/monitor, en un solo sitio. */
async function look(url) {
  try {
    const r = await fetch(url, { method: 'GET', redirect: 'manual', headers: { 'User-Agent': 'fbid-monitor-cron' } });
    return r.status;
  } catch (_) {
    return 0; // 0 = ni siquiera contestó; el hub lo tratará como fallo
  }
}

async function run(env) {
  const hub = env.HUB_URL || 'https://fbid.flowbond.life';
  const [home, guard] = await Promise.all([look(hub + '/'), look(hub + '/api/accounts/add-email')]);
  const target = `${hub}/api/monitor?hub=${home}&guard=${guard}`;
  try {
    const res = await fetch(target, { headers: { authorization: `Bearer ${env.CRON_SECRET}` } });
    const body = await res.text();
    // 503 = el monitor encontró una regresión y YA mandó el correo de alerta.
    console.log(`[fbid-monitor-cron] hub=${home} guard=${guard} monitor=${res.status} ${body.slice(0, 300)}`);
    return { hub: home, guard, status: res.status, ok: res.ok };
  } catch (e) {
    // Que el hub no conteste es en sí la peor señal posible: queda en el log del
    // worker, visible con `npx wrangler tail fbid-monitor-cron`.
    console.error(`[fbid-monitor-cron] no se pudo alcanzar ${target}: ${e}`);
    return { hub: home, guard, status: 0, ok: false, error: String(e) };
  }
}
