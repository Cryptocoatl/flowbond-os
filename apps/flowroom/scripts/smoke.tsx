/**
 * Render smoke test.
 *
 * A component that throws while rendering takes the entire room down — that is
 * how FlowMe blanked a page that had already been sent to a client. This
 * renders each surface to a string in Node and fails loudly if any of them
 * throw, which is cheap enough to run before every single deploy.
 *
 * It cannot catch effect-time bugs (no browser), so it is a floor, not a
 * guarantee — the browser check still has to happen.
 */
import { renderToString } from 'react-dom/server';

// Minimal browser shims. The vault reads the query string and the invite
// panel reads the origin, both during render — legitimate in a SPA, but Node
// needs them to exist for this test to reach the component at all.
(globalThis as unknown as { window: unknown }).window = {
  location: { search: '', origin: 'https://1mwd.danz.now', pathname: '/1MWDproposal' },
  matchMedia: () => ({ matches: false }),
};
import FlowMe from '../src/flowme/FlowMe';
import VaultGate from '../src/vault/VaultGate';
import InviteKeys from '../src/vault/InviteKeys';
import { DeckBlock } from '../src/deck/blocks';
import room1mwd from '../src/content/rooms/1mwd';
import type { Block } from '../src/content/types';

let failures = 0;

function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failures++;
    console.log(`  ✗ ${name}\n      ${(e as Error).message}`);
  }
}

console.log('\nrender smoke\n');

check('FlowMe (closed)', () => renderToString(<FlowMe canMark canComment />));
check('FlowMe (viewer)', () => renderToString(<FlowMe canMark={false} canComment={false} />));
check('VaultGate', () => renderToString(<VaultGate onOpen={() => {}} />));
check('InviteKeys', () => renderToString(<InviteKeys from="Vandana" />));

// Every block kind, on colour and on ink, headless and not.
const kinds = new Set<string>();
for (const b of room1mwd.blocks) {
  if (kinds.has(b.kind)) continue;
  kinds.add(b.kind);
  for (const onColor of [false, true]) {
    check(`block ${b.kind}${onColor ? ' (on colour)' : ''}`, () =>
      renderToString(
        <DeckBlock block={b as Block} ctx={{ onColor, accent: 'var(--gold)' }} />,
      ),
    );
  }
}

console.log(failures ? `\n${failures} FAILED\n` : `\nall clear\n`);
process.exit(failures ? 1 : 0);
