/**
 * check:brand — §9. Los tres bloqueos de go-live de Sani Templo viven en
 * config.ts (assertReadyForProduction). Este script falla el build SOLO en la
 * rama de producción; en cualquier otra rama avisa pero deja pasar (para poder
 * desplegar a /test). Cuando lleguen logo real + tokens exactos + base del 33%,
 * se tocan tres constantes y el gate se abre solo.
 *
 * Se conecta en el build de Cloudflare (fase de migración) como:
 *   pnpm check:brand && next build
 */
import { assertReadyForProduction } from '@flowbond/sanitemplo-core';

const missing = assertReadyForProduction();
const branch = process.env.CF_PAGES_BRANCH ?? process.env.SANITEMPLO_BRANCH ?? 'local';
const enforce =
  branch === 'main' ||
  branch === 'production' ||
  process.env.SANITEMPLO_REQUIRE_BRAND === '1';

if (missing.length === 0) {
  console.log('Sani Templo · marca lista para producción ✓');
  process.exit(0);
}

const banner = ['Sani Templo · bloqueos de marca antes de producción:', ...missing.map((m) => `  • ${m}`)].join('\n');

if (enforce) {
  console.error(`\n${banner}\n`);
  process.exit(1);
}
console.warn(`\n[aviso] ${banner}\n(rama "${branch}": no bloquea el build)\n`);
process.exit(0);
