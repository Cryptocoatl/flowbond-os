// Headless protocol test for the kai-room Durable Object: two clients, one
// room, checking presence, shared-objective co-op, referee behaviour on a
// simultaneous finish, and signalling relay.
// Uses the "ws" client here; the game itself uses the browser's native
// WebSocket. Run against a local `wrangler dev`:
//   node test/room-test.mjs ws://localhost:8788 TST3
// Use a FRESH room code each run — a room's shared state is persisted.
import WebSocket from 'ws';

const URL = process.argv[2] ?? 'ws://localhost:8788';
const CODE = process.argv[3] ?? 'TST1';
const ORIGIN = 'http://localhost:3070';

const log = [];
let failures = 0;
function check(name, cond, extra = '') {
  const ok = !!cond;
  if (!ok) failures++;
  log.push(`${ok ? '✅' : '❌'} ${name}${extra ? ` — ${extra}` : ''}`);
}

function client(tag) {
  const ws = new WebSocket(`${URL}/room/${CODE}`, { origin: ORIGIN });
  const msgs = [];
  const waiters = [];
  let opened = false;
  ws.on('open', () => (opened = true));
  ws.on('message', (d) => {
    const m = JSON.parse(d.toString());
    msgs.push(m);
    for (let i = waiters.length - 1; i >= 0; i--) {
      if (waiters[i].pred(m)) {
        waiters[i].resolve(m);
        waiters.splice(i, 1);
      }
    }
  });
  return {
    tag,
    ws,
    msgs,
    open: () =>
      new Promise((resolve, reject) => {
        if (opened) return resolve();
        const t = setTimeout(() => reject(new Error(`${tag}: open timeout`)), 5000);
        ws.on('open', () => { clearTimeout(t); resolve(); });
        ws.on('error', (e) => { clearTimeout(t); reject(e); });
      }),
    send: (m) => ws.send(JSON.stringify(m)),
    wait: (pred, ms = 3000) =>
      new Promise((resolve, reject) => {
        const hit = msgs.find(pred);
        if (hit) return resolve(hit);
        const t = setTimeout(() => reject(new Error(`${tag}: timeout waiting`)), ms);
        waiters.push({ pred, resolve: (m) => { clearTimeout(t); resolve(m); } });
      }),
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const a = client('A');
const b = client('B');

try {
  // --- A joins an empty room and sets where the party is -------------------
  await a.open();
  a.send({ t: 'hello', name: 'Papá', avatar: 'proc:niko', w: 'atlantis', mi: 3 });
  const wa = await a.wait((m) => m.t === 'welcome');
  check('A gets welcome', wa.you && wa.room === CODE, `you=${wa.you} room=${wa.room}`);
  check('A alone in roster', wa.members.length === 0);
  check('first player sets the party world', wa.s.w === 'atlantis' && wa.s.mi === 3, JSON.stringify(wa.s));

  // --- B joins and ADOPTS A's world/mission ---------------------------------
  await b.open();
  b.send({ t: 'hello', name: 'Kai', avatar: 'proc:kai', w: 'selva', mi: 0 });
  const wb = await b.wait((m) => m.t === 'welcome');
  check('B lands where A already is', wb.s.w === 'atlantis' && wb.s.mi === 3, JSON.stringify(wb.s));
  check('B sees A in the roster', wb.members.length === 1 && wb.members[0].name === 'Papá');
  const joinA = await a.wait((m) => m.t === 'join');
  check('A is told B joined', joinA.m.name === 'Kai' && joinA.m.avatar === 'proc:kai');

  // --- positions relay, and never echo back to the sender -------------------
  b.send({ t: 'pos', p: [1.5, 0, -2], f: 0.5, m: 1 });
  const posA = await a.wait((m) => m.t === 'pos');
  check('A receives B position', posA.id === wb.you && posA.p[0] === 1.5);
  await sleep(150);
  check('B does not receive its own position', !b.msgs.some((m) => m.t === 'pos'));

  // --- co-op: one shared objective set --------------------------------------
  a.send({ t: 'collect', w: 'atlantis', mi: 3, id: 0 });
  b.send({ t: 'collect', w: 'atlantis', mi: 3, id: 1 });
  await sleep(250);
  const sB = [...b.msgs].reverse().find((m) => m.t === 's');
  check('what either picks up counts for both', sB && sB.s.col.length === 2 && sB.s.col.includes(0) && sB.s.col.includes(1), JSON.stringify(sB?.s.col));
  check('per-player credit is tracked', sB && sB.s.by[wa.you] === 1 && sB.s.by[wb.you] === 1, JSON.stringify(sB?.s.by));

  // duplicate pickup of the same objective must not double-count
  a.send({ t: 'collect', w: 'atlantis', mi: 3, id: 1 });
  await sleep(200);
  const sDup = [...b.msgs].reverse().find((m) => m.t === 's');
  check('duplicate pickup ignored', sDup.s.col.length === 2, JSON.stringify(sDup.s.col));

  // a stale message from a player still on the old mission is dropped
  a.send({ t: 'collect', w: 'atlantis', mi: 99, id: 7 });
  await sleep(200);
  const sStale = [...b.msgs].reverse().find((m) => m.t === 's');
  check('stale-mission pickup dropped', !sStale.s.col.includes(7));

  // --- referee: simultaneous finish advances the party exactly once ---------
  const beforeCount = b.msgs.filter((m) => m.t === 's').length;
  a.send({ t: 'done', w: 'atlantis', mi: 3 });
  b.send({ t: 'done', w: 'atlantis', mi: 3 });
  await sleep(300);
  const sDone = [...b.msgs].reverse().find((m) => m.t === 's');
  check('mission advances exactly one step', sDone.s.mi === 4, `mi=${sDone.s.mi}`);
  check('objectives reset for the new mission', sDone.s.col.length === 0 && Object.keys(sDone.s.by).length === 0);
  check('no runaway broadcasts', b.msgs.filter((m) => m.t === 's').length - beforeCount <= 2);

  // --- travelling is a group action ----------------------------------------
  b.send({ t: 'world', w: 'egipto', mi: 0 });
  const sTravel = await a.wait((m) => m.t === 's' && m.s.w === 'egipto');
  check('one player travelling takes the party', sTravel.s.w === 'egipto' && sTravel.s.mi === 0);

  // --- WebRTC signalling relay ---------------------------------------------
  a.send({ t: 'sig', to: wb.you, d: { kind: 'desc', desc: { type: 'offer', sdp: 'x' } } });
  const sig = await b.wait((m) => m.t === 'sig');
  check('signalling reaches only the addressed peer', sig.from === wa.you && sig.d.kind === 'desc');

  a.send({ t: 'voice', on: true });
  const v = await b.wait((m) => m.t === 'voice');
  check('mic state broadcasts', v.id === wa.you && v.on === true);

  a.send({ t: 'emote', e: '❤️' });
  const em = await b.wait((m) => m.t === 'emote');
  check('emote relays', em.e === '❤️');

  // --- building together: what one makes, the other sees -------------------
  a.send({ t: 'build', b: { id: 'a1', kind: 'tree', x: 5, z: 6, rot: 0 } });
  const b1 = await b.wait((m) => m.t === 'build1');
  check("B sees A's creation appear", b1.b.id === 'a1' && b1.b.by === wa.you && b1.b.kind === 'tree');

  b.send({ t: 'build', b: { id: 'b1', kind: 'flower', x: -3, z: 2, rot: 1 } });
  await a.wait((m) => m.t === 'build1' && m.b.id === 'b1');
  check("A sees B's creation appear", true);

  // out-of-bounds coordinates are clamped by the server, not trusted
  a.send({ t: 'build', b: { id: 'a2', kind: 'rock', x: 9999, z: -9999, rot: 0 } });
  const clamped = await b.wait((m) => m.t === 'build1' && m.b.id === 'a2');
  check('server clamps a bad coordinate', clamped.b.x === 150 && clamped.b.z === -150, `${clamped.b.x},${clamped.b.z}`);

  // you cannot take back someone else's work
  b.send({ t: 'unbuild', id: 'a1' });
  await sleep(250);
  check("B cannot delete A's creation", !b.msgs.some((m) => m.t === 'unbuilt' && m.id === 'a1'));

  // but you can take back your own
  a.send({ t: 'unbuild', id: 'a1' });
  const un = await b.wait((m) => m.t === 'unbuilt');
  check('A can take back their own creation', un.id === 'a1');

  // clearing wipes only YOUR creations. Take the LATEST 'built' — B already got
  // one at join time, so waiting for "a built message" would match that stale one.
  a.send({ t: 'buildclear' });
  await sleep(300);
  const cleared = [...b.msgs].reverse().find((m) => m.t === 'built');
  check("clear removes only the sender's work", cleared.list.length === 1 && cleared.list[0].id === 'b1', JSON.stringify(cleared.list.map((x) => x.id)));

  // travelling shows the new world's creations, not the old world's
  a.send({ t: 'world', w: 'espiritu', mi: 0 });
  const fresh = await b.wait((m) => m.t === 'built' && m.w === 'espiritu');
  check('a new world starts with its own (empty) creations', fresh.list.length === 0);

  // --- leaving ------------------------------------------------------------
  a.ws.close();
  const left = await b.wait((m) => m.t === 'leave');
  check('B is told A left', left.id === wa.you);
} catch (e) {
  failures++;
  log.push(`❌ threw: ${e.message}`);
} finally {
  a.ws.close();
  b.ws.close();
}

console.log(log.join('\n'));
console.log(failures === 0 ? `\nALL ${log.length} CHECKS PASS` : `\n${failures} FAILED of ${log.length}`);
process.exit(failures === 0 ? 0 : 1);
