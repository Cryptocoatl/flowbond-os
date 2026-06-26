// ════════════════════════════════════════════════════════════════════════
//  ClaudIA always-on node  (src/index.ts)
//
//  A persistent presence that serves the private membership across every
//  messaging platform. Bridges (mautrix-whatsapp/-telegram/…) relay each chat
//  into a Matrix room; ClaudIA joins as ONE bot and reaches them all. Each
//  incoming sender is resolved to an FBID (member) and gated by their tier.
//
//  Onboarding: a person messages the bot a one-time code minted in their
//  ClaudIA dashboard (/security or a "link a channel" action → claudia_new_
//  channel_code). The node redeems it, binding that platform identity to their
//  FBID. After that, ClaudIA knows them everywhere.
// ════════════════════════════════════════════════════════════════════════

import 'dotenv/config';
import { MatrixClient, SimpleFsStorageProvider, AutojoinRoomsMixin } from 'matrix-bot-sdk';
import { memberFor, redeemCode, tierFor } from './members.js';
import { reply, type Turn } from './agent.js';

const HOMESERVER = process.env.MATRIX_HOMESERVER_URL!;
const TOKEN = process.env.MATRIX_ACCESS_TOKEN!;
const PLATFORM = 'matrix'; // the unified layer; bridges puppet every other platform into it

const CODE_RE = /^[A-Z0-9]{8}$/;
const HISTORY_MAX = 12;
const history = new Map<string, Turn[]>(); // roomId → recent turns (memory only)

function pushTurn(roomId: string, turn: Turn): Turn[] {
  const h = history.get(roomId) ?? [];
  h.push(turn);
  while (h.length > HISTORY_MAX) h.shift();
  history.set(roomId, h);
  return h;
}

async function main() {
  if (!HOMESERVER || !TOKEN) throw new Error('Set MATRIX_HOMESERVER_URL and MATRIX_ACCESS_TOKEN');
  const client = new MatrixClient(HOMESERVER, TOKEN, new SimpleFsStorageProvider('./data/bot.json'));
  AutojoinRoomsMixin.setupOnClient(client); // auto-join rooms the bridges create / invites
  const me = await client.getUserId();

  client.on('room.message', async (roomId: string, event: {
    sender: string; content?: { msgtype?: string; body?: string };
  }) => {
    try {
      if (!event.content || event.content.msgtype !== 'm.text') return;
      if (event.sender === me) return; // ignore our own messages
      const sender = event.sender;
      const text = (event.content.body ?? '').trim();
      if (!text) return;

      // 1. resolve membership
      let uid = await memberFor(PLATFORM, sender);

      // 2. not a member yet → accept a link code, else explain how to link
      if (!uid) {
        const maybeCode = text.toUpperCase();
        if (CODE_RE.test(maybeCode)) {
          uid = await redeemCode(maybeCode, PLATFORM, sender, sender);
          if (uid) {
            await client.sendText(roomId, 'Te reconozco. 🌙 Tu canal quedó vinculado a tu FBID — ahora estoy contigo aquí también. ¿En qué te acompaño?');
            return;
          }
          await client.sendText(roomId, 'Ese código no es válido o expiró. Genera uno nuevo desde tu panel de ClaudIA e intenta otra vez.');
          return;
        }
        await client.sendText(roomId, 'Hola 🌙 Soy ClaudIA. Para servirte de forma privada, vincula este canal: abre tu panel de ClaudIA, genera un código de vinculación y envíamelo aquí.');
        return;
      }

      // 3. member → gate by tier + reply with her voice
      const tier = await tierFor(uid);
      const h = pushTurn(roomId, { role: 'user', text });
      await client.setTyping(roomId, true, 8000).catch(() => {});
      const say = await reply(h, tier);
      await client.setTyping(roomId, false).catch(() => {});
      pushTurn(roomId, { role: 'assistant', text: say });
      await client.sendText(roomId, say);
    } catch (e) {
      // never crash the loop on a single bad message
      console.error('[claudia-node] message error:', (e as Error).message);
    }
  });

  await client.start();
  console.log(`[claudia-node] ClaudIA is awake as ${me} — serving the membership across all bridged channels.`);
}

main().catch((e) => { console.error('[claudia-node] fatal:', e); process.exit(1); });
