/**
 * Site gate — runs before every request. Unless the visitor carries a valid
 * cv_session cookie (issued after a handle+code login), NOTHING is served but the
 * login page. /api/* passes through so the login endpoint itself is reachable.
 * All responses are tagged noindex so search engines never index the page.
 */
import { verifyToken, cookieVal, LOGIN_HTML } from "./_shared";

interface Env { AUTH_SECRET: string }

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request, env, next } = ctx;
  const url = new URL(request.url);

  // API routes handle their own auth (login must stay reachable while gated).
  if (url.pathname.startsWith("/api/")) return next();
  // robots.txt must be readable so crawlers see the Disallow directive.
  if (url.pathname === "/robots.txt") return next();

  const who = await verifyToken(cookieVal(request, "cv_session"), env.AUTH_SECRET);

  if (!who) {
    return new Response(LOGIN_HTML, {
      status: 401,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-robots-tag": "noindex, nofollow",
      },
    });
  }

  // authenticated: serve the real content, still marked noindex
  const res = await next();
  const out = new Response(res.body, res);
  out.headers.set("x-robots-tag", "noindex, nofollow");
  return out;
};
