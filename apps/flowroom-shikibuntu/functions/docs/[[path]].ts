/**
 * The document room gate — /docs/*
 *
 * Gala's private room: written documents about her own movement and about
 * money, which do not get to sit on a public URL because the path is hard to
 * guess.
 *
 * ⚠️ Copied from another client's room. Purging her ceremony was not enough —
 * the gate's own words are the first thing a reader sees, and for a day they
 * still named the other client to this one. Whatever you copy next, read the
 * gate out loud before you send the link.
 *
 * So every byte under /docs passes through here first. A request arrives with a
 * cookie or it does not; without one it gets the gate and nothing else — not the
 * document, not its title, not a 404 that confirms the file exists.
 *
 * Keys are HMAC-signed with the same ROOM_SECRET the vault uses, and carry more
 * than the old ones did:
 *
 *   { f: who handed it over, r: role, n: their name, d: [docs they may open] }
 *
 * `f` and `r` are exactly what `/api/notes` already verifies, so a key minted
 * here writes notes through the existing API with no change to it. `n` and `d`
 * are ours: `n` means a person never has to type their own name, and `d` is what
 * turns this from one room into a data room where counsel sees the two documents
 * that concern them and nothing else.
 *
 * Be clear-eyed, as the vault module already is: this is a capability link.
 * Whoever holds the URL holds the access baked into it. What it buys is that
 * the capability is now *per person and per document*, unforgeable, and
 * revocable-by-rotation — not a single shared secret for the whole room.
 */

interface Env {
  ROOM_SECRET: string;
}

type Role = 'owner' | 'editor' | 'commenter' | 'viewer';
const ROLES: Role[] = ['owner', 'editor', 'commenter', 'viewer'];

/** The owner's ceremony, matching `/api/open` so there is one way in, not two. */
const OWNER_NAME = 'gala';
const OWNER_KEY = '0808';

const COOKIE = 'frshk';
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export interface Pass {
  /** Who handed the key over. */
  f: string;
  r: Role;
  /** The holder's name, so the room greets them instead of interrogating them. */
  n?: string;
  /** Document ids this key opens. Absent = all of them. */
  d?: string[];
}

/* ------------------------------------------------------------------ */
/* Which file is which document                                        */
/* ------------------------------------------------------------------ */

/**
 * Only these filenames are documents. Anything else under /docs (the runtime,
 * the stylesheet) is room furniture and needs a valid pass but no doc scope.
 */
/**
 * Keyed without the extension and lowercased, because Pages serves these at
 * pretty URLs: a request for `/docs/4-DANZ….html` is 308'd to the extensionless
 * form before the asset is served. Matching on the filename alone would let the
 * *second* request — the one that actually delivers the document — through
 * unscoped.
 */
const DOC_OF_FILE: Record<string, string> = {
  '1-acuerdo-shikibuntu': '1',
  '1-acuerdo-shikibuntu-en': '1',   // la misma llave abre las dos lenguas
  '2-motor-misiones': '2',
};

export const DOC_TITLES: Record<string, string> = {
  '1': 'El acuerdo entre Gala y Steph',
  '2': 'El motor: misiones, premios y quién los paga',
};

const opens = (pass: Pass, doc: string) => !pass.d || pass.d.includes(doc);

/** Code and colour. No document text lives in any of these. */
const PUBLIC_ASSETS = new Set(['room.css', 'room.js', 'gate.js']);

/* ------------------------------------------------------------------ */
/* Signed keys — byte-identical to the scheme in functions/api          */
/* ------------------------------------------------------------------ */

const b64uBytes = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const b64uText = (s: string) =>
  btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const unb64uText = (s: string) =>
  decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));

async function sign(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return b64uBytes(mac).slice(0, 32);
}

export async function mint(secret: string, pass: Pass): Promise<string> {
  const body = b64uText(JSON.stringify(pass));
  return `${body}.${await sign(secret, body)}`;
}

export async function verify(secret: string, token: string | undefined | null): Promise<Pass | null> {
  if (!token) return null;
  const [body, mac] = token.split('.');
  if (!body || !mac) return null;

  const expected = await sign(secret, body);
  if (mac.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < mac.length; i++) diff |= mac.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return null;

  try {
    const p = JSON.parse(unb64uText(body)) as Pass;
    if (!p?.f || !ROLES.includes(p.r)) return null;
    if (p.d && !Array.isArray(p.d)) return null;
    return p;
  } catch {
    return null;
  }
}

const cookieToken = (req: Request): string | null => {
  const raw = req.headers.get('cookie');
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === COOKIE) return v.join('=');
  }
  return null;
};

const setCookie = (token: string) =>
  `${COOKIE}=${token}; Path=/docs; Max-Age=${THIRTY_DAYS}; Secure; HttpOnly; SameSite=Lax`;

/* ------------------------------------------------------------------ */
/* Responses                                                           */
/* ------------------------------------------------------------------ */

/** Function responses do not inherit `public/_headers`, so state it here. */
const SECURITY_HEADERS: Record<string, string> = {
  'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet, noimageindex',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store',
};

const json = (data: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...SECURITY_HEADERS, ...extra },
  });

const html = (body: string, status = 200) =>
  new Response(body, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' " +
        "https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; " +
        "connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
      ...SECURITY_HEADERS,
    },
  });

/* ------------------------------------------------------------------ */
/* The handler                                                         */
/* ------------------------------------------------------------------ */

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '');
  const rawFile = (path.split('/').pop() ?? '').toLowerCase();
  const file = rawFile.replace(/\.html$/i, '');

  /**
   * The room's own furniture, served to anyone who asks.
   *
   * This is not a loosening — it is the fix for a gate that locked itself out.
   * The gate page is HTML served from here, and it asks the browser for its
   * stylesheet and its script. Those requests carry no cookie yet, so they were
   * being answered with the gate page itself: a stylesheet that was HTML, and a
   * script that was HTML. The result was an unstyled page whose sign-in form had
   * no code behind it.
   *
   * None of these files contain a word of any document. They are code and
   * colour, and they are safe to hand to a stranger — the documents behind them
   * are not.
   */
  if (PUBLIC_ASSETS.has(rawFile)) return ctx.next();

  if (!env.ROOM_SECRET) {
    return html(gatePage({ misconfigured: true }), 503);
  }

  /* ---- the small API this room talks to ---- */
  if (path === '/docs/auth') return auth(request, env);
  if (path === '/docs/mint') return mintKey(request, env);
  if (path === '/docs/out') {
    return json({ ok: true }, 200, {
      'set-cookie': `${COOKIE}=; Path=/docs; Max-Age=0; Secure; HttpOnly; SameSite=Lax`,
    });
  }

  /* ---- arriving on a key: swallow it into a cookie, then show a clean URL ---- */
  const linkKey = url.searchParams.get('k');
  if (linkKey) {
    const pass = await verify(env.ROOM_SECRET, linkKey);
    if (pass) {
      url.searchParams.delete('k');
      return new Response(null, {
        status: 302,
        headers: {
          location: url.pathname + (url.search || '') + url.hash,
          'set-cookie': setCookie(linkKey),
          ...SECURITY_HEADERS,
        },
      });
    }
    // A tampered or expired-by-rotation key. Fall through to the gate rather
    // than saying which of the two it was.
  }

  const pass = await verify(env.ROOM_SECRET, cookieToken(request));

  if (path === '/docs/me') {
    // The token comes back with the identity because `/api/notes` authorises
    // writes by token, and the cookie carrying it is HttpOnly. Handing it to
    // the page gives away nothing the reader is not already holding: it is the
    // same capability that was in their link.
    return pass
      ? json({
          ok: true,
          name: pass.n ?? '',
          role: pass.r,
          from: pass.f,
          docs: pass.d ?? null,
          token: cookieToken(request),
        })
      : json({ ok: false }, 401);
  }

  if (!pass) return html(gatePage({ invited: Boolean(linkKey) }), 401);

  /* ---- the share console is the owner's desk, nobody else's ---- */
  if (file === 'share' && pass.r !== 'owner') return html(closedPage('share'), 403);

  /* ---- per-document scope: this is what makes it a data room ---- */
  const doc = DOC_OF_FILE[file];
  if (doc && !opens(pass, doc)) return html(closedPage(DOC_TITLES[doc] ?? 'this document'), 403);

  const res = await ctx.next();

  // Documents must never be cached by a shared proxy — the cookie is what
  // separates two readers, and a cached copy would not know that.
  const out = new Response(res.body, res);
  out.headers.set('Cache-Control', 'no-store');
  return out;
};

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

async function auth(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return json({ ok: false }, 405);

  const b = await request
    .json<{ name?: string; key?: string; token?: string }>()
    .catch(() => ({}) as { name?: string; key?: string; token?: string });

  const who = (b.name ?? '').trim().slice(0, 80);

  /* Someone arriving on a key Gala handed them. */
  if (b.token) {
    const p = await verify(env.ROOM_SECRET, b.token);
    if (!p) return json({ ok: false, reason: 'bad-key' }, 401);

    // The key may already carry their name; if it does not, they just told us.
    const name = p.n || who;
    if (!name) return json({ ok: false, reason: 'no-name' }, 400);

    const pass: Pass = { ...p, n: name };
    const token = await mint(env.ROOM_SECRET, pass);
    return json(
      { ok: true, name, role: pass.r, from: pass.f, docs: pass.d ?? null, token },
      200,
      { 'set-cookie': setCookie(token) },
    );
  }

  /* The owner, with her four digits. */
  if (who.toLowerCase() === OWNER_NAME && (b.key ?? '').trim() === OWNER_KEY) {
    const pass: Pass = { f: 'Gala', r: 'owner', n: 'Gala' };
    const token = await mint(env.ROOM_SECRET, pass);
    return json({ ok: true, name: 'Gala', role: 'owner', docs: null, token }, 200, {
      'set-cookie': setCookie(token),
    });
  }

  return json({ ok: false, reason: 'bad-key' }, 401);
}

/** Owner mints a personal key: one name, one role, one set of documents. */
async function mintKey(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return json({ ok: false }, 405);

  const pass = await verify(env.ROOM_SECRET, cookieToken(request));
  if (!pass || pass.r !== 'owner') return json({ ok: false }, 403);

  const b = await request
    .json<{ name?: string; role?: Role; docs?: string[] }>()
    .catch(() => ({}) as { name?: string; role?: Role; docs?: string[] });

  const name = (b.name ?? '').trim().slice(0, 80);
  const role = b.role;
  if (!name) return json({ ok: false, reason: 'no-name' }, 400);
  if (!role || !['editor', 'commenter', 'viewer'].includes(role)) {
    return json({ ok: false, reason: 'bad-role' }, 400);
  }

  const docs = (Array.isArray(b.docs) ? b.docs : []).filter((d) => d in DOC_TITLES);
  if (!docs.length) return json({ ok: false, reason: 'no-docs' }, 400);

  const token = await mint(env.ROOM_SECRET, {
    f: pass.n ?? 'Gala',
    r: role,
    n: name,
    // All four is the same as unscoped, and a shorter key reads better in a
    // message. Keep the scope only when it actually narrows something.
    ...(docs.length === Object.keys(DOC_TITLES).length ? {} : { d: docs }),
  });

  return json({ ok: true, token });
}

/* ------------------------------------------------------------------ */
/* The gate, and the closed door                                       */
/* ------------------------------------------------------------------ */

const SHELL = (title: string, inner: string) => `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,600&family=Instrument+Sans:wght@400;500;600&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/docs/room.css">
</head><body class="gatebody">
<div class="gate-moon" aria-hidden="true"></div>
${inner}
</body></html>`;

function gatePage(opts: { invited?: boolean; misconfigured?: boolean } = {}) {
  if (opts.misconfigured) {
    return SHELL(
      'Privado',
      `<main class="gate"><div class="gate-card"><p class="kicker">Privado</p>
       <h1>El cuarto todavía no abre.</h1>
       <p class="gate-sub">Le falta configurar su bóveda de llaves. Nadie puede entrar, ni siquiera por accidente — que es la forma correcta de fallar.</p>
       </div></main>`,
    );
  }

  return SHELL(
    'Privado',
    `<main class="gate">
  <div class="gate-card" data-reveal>
    <p class="kicker">Shikibuntu</p>
    <h1>Cuarto privado<br><em>de documentos</em></h1>
    <p class="gate-sub">${
      opts.invited
        ? 'Esa llave no abrió. Pídele a quien te la mandó un enlace nuevo — las llaves son personales, y la vieja deja de servir en cuanto se reemplaza.'
        : 'Por invitación. Escribe tu nombre y la llave que te dieron.'
    }</p>

    <form id="gate-form" autocomplete="off">
      <label class="fld">
        <span>Tu nombre</span>
        <input id="g-name" name="name" required maxlength="80" autocomplete="name" placeholder="">
      </label>
      <label class="fld">
        <span>Llave</span>
        <input id="g-key" name="key" inputmode="numeric" maxlength="12" placeholder="••••">
      </label>
      <button type="submit" class="gate-go">Abrir el cuarto</button>
      <p class="gate-err" id="gate-err" role="alert" hidden></p>
    </form>

    <p class="gate-foot">Si te mandaron un enlace personal, abre ese enlace: lleva su propia llave y no te va a pedir nada.</p>
  </div>
</main>
<script src="/docs/gate.js" defer></script>`,
  );
}

function closedPage(what: string) {
  return SHELL(
    'No está en tu llave',
    `<main class="gate">
  <div class="gate-card" data-reveal>
    <p class="kicker">Privado</p>
    <h1>No está en <em>tu llave</em></h1>
    <p class="gate-sub">Ya entraste, pero ${
      what === 'share'
        ? 'la mesa de invitaciones es de la dueña del cuarto'
        : `«${what}» no es uno de los documentos que abre tu llave`
    }. Eso es un ajuste, no un muro — quien te invitó lo puede ampliar en un momento.</p>
    <p class="gate-foot"><a href="/docs/">← Volver a los documentos que sí abres</a></p>
  </div>
</main>`,
    );
}
