// libsodium-wrappers@0.7.16 ships a broken ESM build (its .mjs imports a
// non-existent ./libsodium.mjs), which both webpack and turbopack choke on via
// the `import` export condition. Loading it with require() selects the package's
// working `require`/CJS condition instead — the standard cross-bundler fix —
// while the `import type` keeps full typing. This module is only ever bundled
// into the client (ClaudIA loads ssr:false), so the require runs in the browser.
import type Sodium from 'libsodium-wrappers';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const sodium = require('libsodium-wrappers') as typeof Sodium;

export default sodium;
