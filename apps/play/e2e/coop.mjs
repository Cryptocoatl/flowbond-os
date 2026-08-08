// =============================================================================
// Co-op end-to-end — two REAL Brave windows, one room.
//
// This drives the actual Brave browser (headed, via playwright-core pointed at
// the installed app), not a headless bundled Chromium: an automated version of
// the same thing you'd do by hand with two windows open.
//
//   node e2e/coop.mjs                      # against production
//   node e2e/coop.mjs http://localhost:3070
//
// ⚠️ This opens TWO real browser windows running a 3D scene. Run it when you can
// spare the machine — on a loaded laptop the two renderers fight over the GPU
// and take each other down (look for "non-existent mailbox" in the Brave log).
// That is the test host running out of room, not the game breaking.
//
// It proves the CLIENT wiring — that two players see each other, share one
// mission, and see each other's creations. It cannot prove the voice call:
// the microphone needs a human tap and a real pair of ears.
// =============================================================================
import { chromium } from 'playwright-core';

const BASE = (process.argv[2] ?? 'https://play.flowbond.life').replace(/\/$/, '');
const BRAVE = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
const SHOTS = process.env.SHOT_DIR ?? '/tmp';

// A fresh room per run, so a previous run's shared state can't make this pass.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE = Array.from({ length: 4 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');

const log = [];
let failures = 0;
function check(name, cond, extra = '') {
  if (!cond) failures++;
  log.push(`${cond ? '✅' : '❌'} ${name}${extra ? ` — ${extra}` : ''}`);
}

// Two independent Brave windows, each rendering through SOFTWARE GL.
//
// One window on the real GPU is fine; two hardware-accelerated WebGL scenes on
// one laptop corrupt the shared GPU process ("Trying to Produce a Skia
// representation from a non-existent mailbox") and both renderers die. Every
// assertion here is on the DOM, so software rendering costs nothing but speed.
const browsers = [];

/** Open one player's window, already joined to the room via the invite link. */
async function player(name) {
  const browser = await chromium.launch({
    executablePath: BRAVE,
    headless: false,
    args: [
      '--no-first-run',
      '--no-default-browser-check',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--window-size=880,660',
    ],
  });
  browsers.push(browser);
  const page = await browser.newPage({ viewport: { width: 880, height: 660 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('crash', () => errors.push('renderer crashed'));
  // Brave sometimes aborts the very first navigation of a fresh context while
  // its own startup work settles; one retry is enough.
  const url = `${BASE}/play?sala=${CODE}&nombre=${encodeURIComponent(name)}`;
  for (let attempt = 1; ; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
      break;
    } catch (e) {
      if (attempt >= 3) throw e;
      await page.waitForTimeout(1500);
    }
  }
  // Dismiss the world intro so the HUD is reachable.
  const begin = page.getByRole('button', { name: /Comenzar|Begin/ });
  await begin.waitFor({ timeout: 90_000 });
  await begin.click();
  return { name, page, errors };
}

let A, B;
try {
  // Opened one after the other, not in parallel: two 3D scenes booting on the
  // same frame is what tips a laptop's renderer over.
  A = await player('Papa');
  B = await player('Kai');

  // --- do they see each other? ---------------------------------------------
  const pillA = A.page.locator('text=Kai').first();
  const pillB = B.page.locator('text=Papa').first();
  await pillA.waitFor({ timeout: 45_000 });
  await pillB.waitFor({ timeout: 45_000 });
  check('Papá sees Kai in the room', await pillA.isVisible());
  check('Kai sees Papá in the room', await pillB.isVisible());

  // The party button counts heads, so "2" means the roster really synced.
  const headA = await A.page.getByRole('button', { name: /^👥/ }).first().textContent();
  check('the party button counts two guardians', /2/.test(headA ?? ''), headA?.trim());

  // --- is it ONE mission, or two parallel ones? -----------------------------
  // The per-player credit line only renders when the party's shared mission
  // state is live, and it lists both names.
  const credit = A.page.locator('text=/Papa:\\s*\\d/').first();
  await credit.waitFor({ timeout: 30_000 });
  check('the mission shows shared per-player credit', await credit.isVisible());

  // --- building together ----------------------------------------------------
  const openBuild = (p) => p.getByRole('button', { name: /Crear|Build/ }).first().click();
  await openBuild(A.page);
  await A.page.getByRole('button', { name: /Colocar|Place/ }).first().click();
  await A.page.waitForTimeout(1500);

  await openBuild(B.page);
  const counterB = B.page.locator('text=/\\d+\\s+(creaciones|placed)/').first();
  await counterB.waitFor({ timeout: 30_000 });
  const textB = (await counterB.textContent()) ?? '';
  const nB = parseInt(textB.match(/(\d+)/)?.[1] ?? '0', 10);
  check("Kai's world contains what Papá just built", nB >= 1, textB.trim());

  // and the other direction
  await B.page.getByRole('button', { name: /Colocar|Place/ }).first().click();
  await B.page.waitForTimeout(1500);
  const counterA = A.page.locator('text=/\\d+\\s+(creaciones|placed)/').first();
  const textA = (await counterA.textContent()) ?? '';
  const nA = parseInt(textA.match(/(\d+)/)?.[1] ?? '0', 10);
  check("Papá's world contains what Kai just built", nA >= 2, textA.trim());

  // --- nothing blew up in the console --------------------------------------
  check('no uncaught errors in Papá\'s window', A.errors.length === 0, A.errors.slice(0, 2).join(' | '));
  check('no uncaught errors in Kai\'s window', B.errors.length === 0, B.errors.slice(0, 2).join(' | '));

  await A.page.screenshot({ path: `${SHOTS}/coop-papa.png` });
  await B.page.screenshot({ path: `${SHOTS}/coop-kai.png` });
} catch (e) {
  failures++;
  log.push(`❌ threw: ${e.message.split('\n')[0]}`);
  for (const p of [A, B]) {
    if (p) await p.page.screenshot({ path: `${SHOTS}/coop-fail-${p.name}.png` }).catch(() => {});
  }
} finally {
  for (const b of browsers) await b.close().catch(() => {});
}

console.log(`room ${CODE} · ${BASE}\n`);
console.log(log.join('\n'));
console.log(failures === 0 ? `\nALL ${log.length} CHECKS PASS` : `\n${failures} FAILED of ${log.length}`);
console.log(`screenshots in ${SHOTS}/coop-*.png`);
process.exit(failures === 0 ? 0 : 1);
