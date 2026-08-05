#!/usr/bin/env node
/* Inyecta el bloque canónico de moneda (tools/voces-money.js) en cada página,
   entre los marcadores:
       // VOCES-MONEY:BEGIN
       // VOCES-MONEY:END
   Uso:  node tools/sync-money.js          → escribe
         node tools/sync-money.js --check  → sólo verifica que estén al día
   Así hay UNA sola fuente de verdad y ninguna página se queda con su propia
   tabla de tipos de cambio (que fue justo lo que hizo divergir los precios). */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(__dirname, "voces-money.js");
const PAGES = ["index.html", "unete.html", "mi-voz.html", "admin.html", "crear-perfil.html"];
const BEGIN = "// VOCES-MONEY:BEGIN";
const END = "// VOCES-MONEY:END";

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
  if (check) { console.log(`✗ ${page}: DESACTUALIZADO respecto a tools/voces-money.js`); stale++; continue; }
  fs.writeFileSync(p, html.slice(0, i + BEGIN.length) + "\n" + block + "\n" + html.slice(j), "utf8");
  console.log(`✓ ${page}: actualizado`);
  changed++;
}

if (missing || stale) { console.log(`\n❌ ${missing} sin marcadores, ${stale} desactualizadas`); process.exit(1); }
console.log(`\n✅ ${changed} páginas actualizadas`);
