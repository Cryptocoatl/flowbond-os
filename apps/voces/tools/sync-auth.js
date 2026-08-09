#!/usr/bin/env node
/* Inyecta el bloque canónico de identidad (tools/voces-auth.js) en cada página,
   entre los marcadores:
       // VOCES-AUTH:BEGIN
       // VOCES-AUTH:END
   Uso:  node tools/sync-auth.js          → escribe
         node tools/sync-auth.js --check  → sólo verifica que estén al día

   Mismo patrón que sync-money.js: UNA sola fuente de verdad para el login, para
   que ninguna página se quede con su propia idea de cómo se entra (que fue justo
   lo que dejó a Mónica y a Steph fuera de sus propios paneles).
   OJO: el bloque se inyecta DENTRO del mismo <script> donde vive `const sb`,
   porque lo usa por alcance léxico. */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(__dirname, "voces-auth.js");
const PAGES = ["unete.html", "mi-voz.html", "admin.html", "crear-perfil.html"];
const BEGIN = "// VOCES-AUTH:BEGIN";
const END = "// VOCES-AUTH:END";

const block = fs.readFileSync(SRC, "utf8").trim();
const check = process.argv.includes("--check");
let changed = 0, missing = 0, stale = 0;

for (const page of PAGES) {
  const p = path.join(ROOT, page);
  if (!fs.existsSync(p)) { console.log(`· ${page}: no existe, se omite`); continue; }
  const html = fs.readFileSync(p, "utf8");
  const i = html.indexOf(BEGIN), j = html.lastIndexOf(END);
  if (i < 0 || j < 0 || j < i) {
    console.log(`✗ ${page}: faltan los marcadores ${BEGIN} / ${END}`);
    missing++; continue;
  }
  const current = html.slice(i + BEGIN.length, j).trim();
  if (current === block) { console.log(`= ${page}: al día`); continue; }
  if (check) { console.log(`✗ ${page}: DESACTUALIZADO respecto a tools/voces-auth.js`); stale++; continue; }
  fs.writeFileSync(p, html.slice(0, i + BEGIN.length) + "\n" + block + "\n" + html.slice(j), "utf8");
  console.log(`✓ ${page}: actualizado`);
  changed++;
}

if (missing || stale) { console.log(`\n❌ ${missing} sin marcadores, ${stale} desactualizadas`); process.exit(1); }
console.log(`\n✅ ${changed} actualizadas, ${PAGES.length - changed - missing} al día`);
