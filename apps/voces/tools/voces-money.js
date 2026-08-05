/* ============================================================
   VOCES · MONEDA — bloque canónico ÚNICO (v1, 2026-08-05)
   ------------------------------------------------------------
   FUENTE DE VERDAD: apps/voces/tools/voces-money.js
   Se inyecta dentro de cada página, entre los marcadores VOCES-MONEY
   (BEGIN/END), con `node tools/sync-money.js`.
   NO editar la copia que vive dentro del HTML: se sobrescribe.

   REGLAS (decisión de Steph, 2026-08-05):
   1. UN SOLO PRECIO: el que se cobra. En Voces el cargo SIEMPRE se procesa
      en pesos mexicanos (MercadoPago MX y Stripe cobran los centavos MXN).
      Por eso el importe en MXN se muestra SIEMPRE, en toda pantalla pública.
   2. La moneda del visitante es SÓLO una referencia, marcada con «≈», y se
      calcula SIEMPRE desde el MXN cobrado — nunca desde otro precio.
   3. Sin tipo de cambio fresco NO se convierte: se muestra sólo el peso.
      (Una tabla fija ya causó ARS −39% y COP +22%: nunca más.)
   4. El número se formatea con la convención de la MONEDA mostrada y se
      acompaña del código ISO. En Colombia «33.708 COP» y no «COP 33,708»,
      que un lector colombiano lee como treinta y tres pesos.
============================================================ */
window.VM = (function(){
"use strict";

/* --- país (ISO 3166-1 alpha-2) → moneda (ISO 4217) -----------------------
   Cobertura mundial completa. Todas estas monedas existen en
   app_vpa_fx_rates (166 códigos, verificado 2026-08-05); las que no
   tuvieran tasa simplemente no se convierten y se ve el precio en MXN. */
var COUNTRY_CCY = {
AD:"EUR",AE:"AED",AF:"AFN",AG:"XCD",AI:"XCD",AL:"ALL",AM:"AMD",AO:"AOA",AR:"ARS",AS:"USD",
AT:"EUR",AU:"AUD",AW:"AWG",AX:"EUR",AZ:"AZN",BA:"BAM",BB:"BBD",BD:"BDT",BE:"EUR",BF:"XOF",
BG:"BGN",BH:"BHD",BI:"BIF",BJ:"XOF",BL:"EUR",BM:"BMD",BN:"BND",BO:"BOB",BQ:"USD",BR:"BRL",
BS:"BSD",BT:"BTN",BW:"BWP",BY:"BYN",BZ:"BZD",CA:"CAD",CC:"AUD",CD:"CDF",CF:"XAF",CG:"XAF",
CH:"CHF",CI:"XOF",CK:"NZD",CL:"CLP",CM:"XAF",CN:"CNY",CO:"COP",CR:"CRC",CU:"CUP",CV:"CVE",
CW:"XCG",CX:"AUD",CY:"EUR",CZ:"CZK",DE:"EUR",DJ:"DJF",DK:"DKK",DM:"XCD",DO:"DOP",DZ:"DZD",
EC:"USD",EE:"EUR",EG:"EGP",EH:"MAD",ER:"ERN",ES:"EUR",ET:"ETB",FI:"EUR",FJ:"FJD",FK:"FKP",
FM:"USD",FO:"FOK",FR:"EUR",GA:"XAF",GB:"GBP",GD:"XCD",GE:"GEL",GF:"EUR",GG:"GGP",GH:"GHS",
GI:"GIP",GL:"DKK",GM:"GMD",GN:"GNF",GP:"EUR",GQ:"XAF",GR:"EUR",GT:"GTQ",GU:"USD",GW:"XOF",
GY:"GYD",HK:"HKD",HN:"HNL",HR:"EUR",HT:"HTG",HU:"HUF",ID:"IDR",IE:"EUR",IL:"ILS",IM:"IMP",
IN:"INR",IO:"USD",IQ:"IQD",IR:"IRR",IS:"ISK",IT:"EUR",JE:"JEP",JM:"JMD",JO:"JOD",JP:"JPY",
KE:"KES",KG:"KGS",KH:"KHR",KI:"AUD",KM:"KMF",KN:"XCD",KR:"KRW",KW:"KWD",KY:"KYD",KZ:"KZT",
LA:"LAK",LB:"LBP",LC:"XCD",LI:"CHF",LK:"LKR",LR:"LRD",LS:"LSL",LT:"EUR",LU:"EUR",LV:"EUR",
LY:"LYD",MA:"MAD",MC:"EUR",MD:"MDL",ME:"EUR",MF:"EUR",MG:"MGA",MH:"USD",MK:"MKD",ML:"XOF",
MM:"MMK",MN:"MNT",MO:"MOP",MP:"USD",MQ:"EUR",MR:"MRU",MS:"XCD",MT:"EUR",MU:"MUR",MV:"MVR",
MW:"MWK",MX:"MXN",MY:"MYR",MZ:"MZN",NA:"NAD",NC:"XPF",NE:"XOF",NF:"AUD",NG:"NGN",NI:"NIO",
NL:"EUR",NO:"NOK",NP:"NPR",NR:"AUD",NU:"NZD",NZ:"NZD",OM:"OMR",PA:"USD",PE:"PEN",PF:"XPF",
PG:"PGK",PH:"PHP",PK:"PKR",PL:"PLN",PM:"EUR",PN:"NZD",PR:"USD",PS:"ILS",PT:"EUR",PW:"USD",
PY:"PYG",QA:"QAR",RE:"EUR",RO:"RON",RS:"RSD",RU:"RUB",RW:"RWF",SA:"SAR",SB:"SBD",SC:"SCR",
SD:"SDG",SE:"SEK",SG:"SGD",SH:"SHP",SI:"EUR",SJ:"NOK",SK:"EUR",SL:"SLE",SM:"EUR",SN:"XOF",
SO:"SOS",SR:"SRD",SS:"SSP",ST:"STN",SV:"USD",SX:"XCG",SY:"SYP",SZ:"SZL",TC:"USD",TD:"XAF",
TG:"XOF",TH:"THB",TJ:"TJS",TL:"USD",TM:"TMT",TN:"TND",TO:"TOP",TR:"TRY",TT:"TTD",TV:"TVD",
TW:"TWD",TZ:"TZS",UA:"UAH",UG:"UGX",US:"USD",UY:"UYU",UZ:"UZS",VA:"EUR",VC:"XCD",VE:"VES",
VG:"USD",VI:"USD",VN:"VND",VU:"VUV",WF:"XPF",WS:"WST",XK:"EUR",YE:"YER",YT:"EUR",ZA:"ZAR",
ZM:"ZMW",ZW:"ZWG"
};

/* País "dueño" de cada moneda: sólo para elegir la convención de separadores.
   (es-CO ⇒ 33.708 · es-MX ⇒ 33,708 · el mismo número, leído distinto.) */
var HOME_CC = {
USD:"US",EUR:"ES",MXN:"MX",COP:"CO",ARS:"AR",CLP:"CL",PEN:"PE",UYU:"UY",BOB:"BO",PYG:"PY",
BRL:"BR",VES:"VE",CRC:"CR",GTQ:"GT",HNL:"HN",NIO:"NI",DOP:"DO",CUP:"CU",PAB:"PA",GBP:"GB",
CAD:"CA",CHF:"CH",AUD:"AU",NZD:"NZ",JPY:"JP",CNY:"CN",KRW:"KR",INR:"IN",RUB:"RU",TRY:"TR",
ZAR:"ZA",SEK:"SE",NOK:"NO",DKK:"DK",PLN:"PL",CZK:"CZ",HUF:"HU",RON:"RO",ILS:"IL",AED:"AE",
SAR:"SA",SGD:"SG",HKD:"HK",TWD:"TW",THB:"TH",PHP:"PH",IDR:"ID",MYR:"MY",VND:"VN",NGN:"NG",
KES:"KE",EGP:"EG",MAD:"MA",XOF:"SN",XAF:"CM",XCD:"AG",XPF:"PF"
};

/* Monedas de inflación alta: se convierten sólo con tasa MUY fresca (≤36 h).
   Una tasa de tres días en ARS ya miente lo suficiente para molestar. */
var VOLATILE = ["ARS","VES","LBP","SYP","ZWL","ZWG","IRR","SDG","SSP","AFN","CUP","LAK","MMK"];
var VOLATILE_MAX_AGE_MS = 36 * 3600 * 1000;

var LS_CC = "vpa_cc", LS_CCY = "vpa_ccy", LS_FX = "vpa_fx_cache";
var MAX_AGE_MS = 3 * 24 * 3600 * 1000;   // misma regla de "stale" que el servidor

var FX = null;          // {rates:{CODE:per_usd}, fetched_at, stale}
var CC = null;          // país detectado
var CCY = "MXN";        // moneda que ve el visitante
var USER_PICKED = false;
var listeners = [];
var readyResolve, ready = new Promise(function(r){ readyResolve = r; });

function ls(k){ try{ return localStorage.getItem(k); }catch(_){ return null; } }
function lsSet(k,v){ try{ localStorage.setItem(k,v); }catch(_){} }

/* ---------------- tasas ---------------- */
function usable(fx){
  if(!fx || !fx.rates || !fx.rates.MXN || !fx.rates.USD) return false;
  if(fx.stale) return false;
  var t = fx.fetched_at ? Date.parse(fx.fetched_at) : 0;
  if(!t || (Date.now() - t) > MAX_AGE_MS) return false;
  return true;
}
function loadCache(){
  try{
    var raw = ls(LS_FX); if(!raw) return null;
    var fx = JSON.parse(raw);
    return usable(fx) ? fx : null;
  }catch(_){ return null; }
}
async function loadRates(sb){
  FX = loadCache();                       // arranca con lo último bueno (render inmediato)
  if(!sb) return;
  try{
    var ctrl = new AbortController(), to = setTimeout(function(){ ctrl.abort(); }, 4000);
    var res = await sb.rpc("vpa_fx_rates").abortSignal(ctrl.signal);
    clearTimeout(to);
    var d = res && res.data;
    if(d && d.rates && d.rates.MXN){
      var fx = { rates:d.rates, fetched_at:d.fetched_at, stale:!!d.stale };
      if(usable(fx)){ FX = fx; lsSet(LS_FX, JSON.stringify(fx)); }
      else if(fx.stale) FX = null;        // el servidor dice que está vieja: no inventamos
    }
  }catch(_){/* nos quedamos con el caché, o sin conversión */}
}

/* ---------------- país / moneda ---------------- */
function ccyForCountry(cc){ return COUNTRY_CCY[String(cc||"").toUpperCase()] || null; }
function regionOfBrowser(){
  try{
    var l = navigator.language || "";
    var r = (typeof Intl.Locale === "function") ? new Intl.Locale(l).region : null;
    return (r || (l.split("-")[1] || "")).toUpperCase() || null;
  }catch(_){ return null; }
}
async function detectCountry(){
  var saved = (ls(LS_CC) || "").toUpperCase();
  if(saved && COUNTRY_CCY[saved]) { CC = saved; return; }
  var reg = regionOfBrowser();
  if(reg && COUNTRY_CCY[reg]) CC = reg;          // instantáneo, sin red
  try{
    var ctrl = new AbortController(), to = setTimeout(function(){ ctrl.abort(); }, 2000);
    var r = await fetch("https://ipapi.co/json/", {signal:ctrl.signal});
    clearTimeout(to);
    if(r.ok){
      var j = await r.json();
      var c = String(j.country_code || j.country || "").toUpperCase();
      if(c && COUNTRY_CCY[c]){ CC = c; lsSet(LS_CC, c); }
    }
  }catch(_){/* nos quedamos con la región del navegador */}
}
function ageMs(){
  var t = FX && FX.fetched_at ? Date.parse(FX.fetched_at) : 0;
  return t ? (Date.now() - t) : Infinity;
}
function canShow(code){
  if(!code || code === "MXN") return code === "MXN";
  if(!FX || !FX.rates) return false;             // FX sólo existe si pasó usable()
  if(!Number(FX.rates[code])) return false;
  if(VOLATILE.indexOf(code) >= 0 && ageMs() > VOLATILE_MAX_AGE_MS) return false;
  return true;
}
function setCurrency(code, remember){
  code = String(code||"").toUpperCase();
  if(code === "MXN"){ CCY = "MXN"; if(remember){ USER_PICKED = true; lsSet(LS_CCY,"MXN"); } emit(); return true; }
  if(!canShow(code)) return false;
  CCY = code;
  if(remember){ USER_PICKED = true; lsSet(LS_CCY, code); }
  emit(); return true;
}
/* ?moneda=COP (o ?currency=COP) fuerza la moneda: sirve para reproducir lo que
   ve alguien en otro país y para mandarle un enlace ya en su moneda. */
function paramCurrency(){
  try{
    var q = new URLSearchParams(location.search);
    var c = (q.get("moneda") || q.get("currency") || "").toUpperCase();
    return /^[A-Z]{3}$/.test(c) ? c : null;
  }catch(_){ return null; }
}
function pickCurrency(){
  var forced = paramCurrency();
  if(forced && (forced==="MXN" || canShow(forced))){ CCY = forced; USER_PICKED = true; lsSet(LS_CCY, forced); return; }
  var saved = (ls(LS_CCY)||"").toUpperCase();
  if(saved && (saved==="MXN" || canShow(saved))){ CCY = saved; USER_PICKED = true; return; }
  var auto = ccyForCountry(CC);
  if(auto && canShow(auto)) CCY = auto;
  else CCY = "MXN";
}
function emit(){ listeners.forEach(function(f){ try{ f(CCY); }catch(_){} }); }

/* ---------------- formato ---------------- */
/* La cifra se agrupa como se escribe en el país de ESA moneda, no como en el
   navegador de quien mira: en Colombia 33.709 y en México 33,709 son el mismo
   número, y leer el separador al revés es exactamente lo que hace pensar que
   hay "dos precios". Intl deduce el idioma probable del país (und-CO → es-CO). */
/* Paraguay: Intl deduce guaraní (gn-PY, que agrupa con coma) pero los precios
   allá se escriben 30.522 como en el resto del Cono Sur. */
var LOCALE_OVERRIDE = { PY:"es-PY" };
var localeCache = {};
function localeFor(code){
  code = String(code||"").toUpperCase();
  if(localeCache[code]) return localeCache[code];
  var cc = HOME_CC[code] || (ccyForCountry(CC) === code ? CC : null);
  var loc = null;
  if(cc && LOCALE_OVERRIDE[cc]) loc = LOCALE_OVERRIDE[cc];
  else if(cc){
    try{ loc = new Intl.Locale("und-" + cc).maximize().toString(); }catch(_){ loc = null; }
    if(!loc || /^und/.test(loc)) loc = null;
  }
  if(!loc){ try{ loc = navigator.language || "es-MX"; }catch(_){ loc = "es-MX"; } }
  localeCache[code] = loc; return loc;
}
/* Decimales: los precios grandes no llevan centavos; los chicos sí, salvo en
   monedas sin fracción (JPY, CLP, PYG…), donde Intl ya manda. */
function digitsFor(v){ return Math.abs(v) >= 1000 ? 0 : 2; }
/* Siempre "cifra + código ISO" (33.709 COP · 15,03 EUR · 2,729 JPY): una sola
   forma en todo el sitio y sin ambigüedad posible sobre de qué peso hablamos. */
function fmt(value, code){
  var v = Number(value); if(!isFinite(v)) return "";
  code = String(code||CCY).toUpperCase();
  var d = Math.min(digitsFor(v), maxFrac(code));
  var s;
  try{
    s = new Intl.NumberFormat(localeFor(code), {minimumFractionDigits:d, maximumFractionDigits:d}).format(v);
  }catch(_){
    s = v.toFixed(d);
  }
  return s + " " + code;
}
/* cuántos decimales admite la moneda según el propio Intl (JPY→0, KWD→3…) */
var fracCache = {};
function maxFrac(code){
  if(fracCache[code] != null) return fracCache[code];
  var n = 2;
  try{ n = new Intl.NumberFormat("en-US",{style:"currency",currency:code}).resolvedOptions().maximumFractionDigits; }
  catch(_){ n = 2; }
  fracCache[code] = n; return n;
}
/* El importe que SÍ se cobra. Siempre visible, siempre en pesos. */
function mxn(pesos){
  var v = Number(pesos)||0;
  var d = (Math.round(v*100)%100 === 0) ? 0 : 2;
  return "$" + v.toLocaleString("es-MX",{minimumFractionDigits:d, maximumFractionDigits:d}) + " MXN";
}
/* Referencia en la moneda del visitante. "" si no aplica o no hay tasa fresca. */
function approx(pesos, code){
  code = String(code||CCY).toUpperCase();
  if(code === "MXN") return "";
  if(!canShow(code)) return "";
  var v = convert(Number(pesos)||0, "MXN", code);
  if(v == null || !(v > 0)) return "";
  return "≈ " + fmt(v, code);
}
/* Precio completo para pantalla: lo que se cobra + la referencia. */
function line(pesos, sep){ var a = approx(pesos); return mxn(pesos) + (a ? (sep||" · ") + a : ""); }
function html(pesos, cls){
  var a = approx(pesos);
  return '<span class="vm-mxn">'+mxn(pesos)+'</span>' +
         (a ? ' <span class="vm-approx'+(cls?" "+cls:"")+'">'+a+'</span>' : "");
}
function rate(from, to){
  if(!FX || !FX.rates) return null;
  from = String(from).toUpperCase(); to = String(to).toUpperCase();
  var f = from==="USD" ? 1 : Number(FX.rates[from]);
  var t = to==="USD"   ? 1 : Number(FX.rates[to]);
  if(!f || !t || !isFinite(f) || !isFinite(t)) return null;
  return t/f;
}
function convert(v, from, to){ var r = rate(from,to); return r==null ? null : v*r; }

/* Nombre legible de moneda para el selector. */
function ccyName(code){
  try{
    var mine = "es"; try{ mine = navigator.language || "es"; }catch(_){}
    var dn = new Intl.DisplayNames([mine], {type:"currency"});
    var n = dn.of(code);
    return n && n !== code ? (code + " · " + n) : code;
  }catch(_){ return code; }
}
function options(){
  if(!FX || !FX.rates) return [{code:"MXN", label:ccyName("MXN")}];
  var seen = {}, out = [{code:"MXN", label:ccyName("MXN")}];
  Object.keys(COUNTRY_CCY).forEach(function(k){
    var c = COUNTRY_CCY[k];
    if(c==="MXN" || seen[c] || !canShow(c)) return;
    seen[c] = 1; out.push({code:c, label:ccyName(c)});
  });
  out.sort(function(a,b){ return a.code==="MXN" ? -1 : b.code==="MXN" ? 1 : a.label.localeCompare(b.label); });
  return out;
}

/* Lectura tolerante de un importe escrito a mano: "33.000" y "33,000" son
   treinta y tres mil (nadie cobra 33 pesos con tres decimales); "33,50" y
   "33.50" son treinta y tres con cincuenta. Devuelve null si no es número. */
function parseAmount(str){
  var s = String(str==null?"":str).trim().replace(/[^\d.,-]/g,"");
  if(!s) return null;
  var neg = /^-/.test(s); s = s.replace(/-/g,"");
  if(/^\d{1,3}([.,]\d{3})+$/.test(s)) s = s.replace(/[.,]/g,"");        // 1.234.567 / 1,234,567
  else if(/^\d+[.,]\d{1,2}$/.test(s)) s = s.replace(",", ".");           // 33,50
  else if(/^\d+[.,]\d{3,}$/.test(s)) s = s.replace(/[.,]/g,"");          // 33.0005 → no existe: miles
  else s = s.replace(/,/g,"");
  var n = Number(s);
  if(!isFinite(n)) return null;
  return neg ? -n : n;
}

/* init: primero lo instantáneo (caché de tasas + región del navegador) para que
   la página pinte precios de inmediato; la afinación por IP llega después y, si
   cambia algo, avisa por onChange para repintar. Nunca bloquea el render. */
async function init(sb){
  await loadRates(sb);
  var saved = (ls(LS_CC)||"").toUpperCase();
  CC = (saved && COUNTRY_CCY[saved]) ? saved : regionOfBrowser();
  if(CC && !COUNTRY_CCY[CC]) CC = null;
  pickCurrency();
  emit(); readyResolve(true);
  if(!saved) refineByIp();
  return CCY;
}
async function refineByIp(){
  var before = CCY;
  await detectCountry();
  if(USER_PICKED) return;
  pickCurrency();
  if(CCY !== before) emit();
}

return {
  init: init, ready: ready,
  onChange: function(f){ listeners.push(f); },
  currency: function(){ return CCY; },
  country: function(){ return CC; },
  isMXN: function(){ return CCY === "MXN"; },
  hasRates: function(){ return !!(FX && FX.rates); },
  fetchedAt: function(){ return FX && FX.fetched_at; },
  ccyForCountry: ccyForCountry, countries: COUNTRY_CCY,
  setCurrency: setCurrency, options: options, ccyName: ccyName,
  rate: rate, convert: convert,
  fmt: fmt, mxn: mxn, approx: approx, line: line, html: html,
  parseAmount: parseAmount
};
})();
