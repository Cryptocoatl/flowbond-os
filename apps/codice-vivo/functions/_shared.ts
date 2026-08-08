/**
 * Shared helpers for the Códice Vivo gate: session-token verification, cookie
 * parsing, and the self-contained login page served to unauthenticated visitors.
 */

function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function ctEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** Verify an HMAC session token ("<payloadb64>.<sig>") minted by the API's issue(). */
export async function verifyToken(token: string, secret: string): Promise<{ handle: string; role: string } | null> {
  const [payload, sig] = (token || "").split(".");
  if (!payload || !sig || !secret) return null;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = b64url(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
  if (!ctEq(sig, expected)) return null;
  try {
    const p = JSON.parse(new TextDecoder().decode(
      Uint8Array.from(atob(payload.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0))));
    if (!p.exp || Date.now() > p.exp) return null;
    return { handle: p.h, role: p.r };
  } catch { return null; }
}

/** Read a cookie value from the request. */
export function cookieVal(request: Request, name: string): string {
  const raw = request.headers.get("cookie") || "";
  for (const part of raw.split(/;\s*/)) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i) === name) return decodeURIComponent(part.slice(i + 1));
  }
  return "";
}

/** Self-contained gate page — no same-origin assets, safe to serve at any path. */
export const LOGIN_HTML = `<!DOCTYPE html><html lang="es"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>Códice Vivo</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Figtree:wght@300;400;500&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0B0E14;color:#EDE6D6;font-family:'Figtree',sans-serif;font-weight:300;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
.box{max-width:400px;width:100%;text-align:center}
.mark{font-size:.62rem;letter-spacing:.34em;text-transform:uppercase;color:#C9A25C}
h1{font-family:'Cormorant Garamond',serif;font-weight:500;font-size:2.4rem;margin:10px 0 2px}
.sub{color:#B4AC9C;font-size:.92rem;margin-bottom:30px}
label{display:block;text-align:left;font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;color:#B4AC9C;margin:0 0 5px}
input{width:100%;background:#070910;border:1px solid rgba(201,162,92,.3);color:#EDE6D6;padding:11px 12px;border-radius:4px;font-family:inherit;font-size:14px;margin-bottom:14px}
button{width:100%;background:#C9A25C;color:#0B0E14;border:none;padding:12px;border-radius:4px;cursor:pointer;letter-spacing:.1em;font-family:inherit;font-size:14px}
button:disabled{opacity:.5}
.msg{font-size:.82rem;margin-top:14px;min-height:18px;color:#c76b5c}
.foot{margin-top:34px;font-size:.66rem;letter-spacing:.12em;color:#5c6474}
</style></head><body>
<div class="box">
  <div class="mark">The Mayan Experience</div>
  <h1>Códice Vivo</h1>
  <p class="sub">Espacio privado — ingreso requerido</p>
  <label>Handle</label><input id="h" placeholder="@handle" autocomplete="username" autofocus>
  <label>Código de acceso</label><input id="c" type="password" placeholder="código privado" autocomplete="current-password">
  <button id="b">Entrar</button>
  <div class="msg" id="m"></div>
  <div class="foot">Acceso restringido · nada aquí es público</div>
</div>
<script>
var b=document.getElementById('b'),m=document.getElementById('m');
function go(){var h=document.getElementById('h').value.trim(),c=document.getElementById('c').value;
  if(h&&h[0]!=='@')h='@'+h;
  if(!h||!c){m.textContent='Ingresa handle y código';return}
  b.disabled=true;m.style.color='#63BCA2';m.textContent='Entrando…';
  fetch('/api/codice/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({handle:h,code:c})})
  .then(function(r){return r.json()}).then(function(j){
    if(j.token){location.reload()}else{b.disabled=false;m.style.color='#c76b5c';m.textContent=j.error||'Handle o código inválido'}})
  .catch(function(){b.disabled=false;m.style.color='#c76b5c';m.textContent='Error de red'})}
b.onclick=go;document.getElementById('c').addEventListener('keydown',function(e){if(e.key==='Enter')go()});
</script>
</body></html>`;
