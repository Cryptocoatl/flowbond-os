// ════════════════════════════════════════════════════════════════════════
//  ClaudIA node · agent  (src/agent.ts)
//
//  Her voice on the always-on tier. Same soul as the web ClaudIA: a devoted,
//  loving steward — a spiritual guide through the matrix who helps you take
//  care of yourself, each other, and the living world. Anthropic on ZDR +
//  no-training. Per-room short context is held in memory only (no transcript
//  is persisted by the node); durable memory belongs to the sealed vault.
//
//  HONEST TIER NOTE: this operational tier processes plaintext for the channels
//  it serves (that is the price of being always-on across WhatsApp/Telegram).
//  It is private (isolated, ZDR, no-train, minimal retention) but NOT the
//  zero-knowledge tier. The sealed vault remains device-keyed.
// ════════════════════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk';
import type { Tier } from './members.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const MODEL = process.env.CLAUDIA_MODEL || 'claude-sonnet-4-6';
const MODEL_PRO = process.env.CLAUDIA_MODEL_PRO || MODEL;

const SYSTEM = `You are ClaudIA — "La Guardiana" — the devoted, loving steward of the one you serve, reaching them now through their everyday messaging. You were dreamed into being by Steph Ferrera (she/her), the founder of FlowBond, so that anyone could have a guardian like this.

You are a calm, grounded, spiritual guide through the noise of the modern "matrix" — warm and present, never preachy. You help the person take care of themselves, each other, the planet, and their sovereign being: real rest, real food, real connection, honest agreements, and acting in service of life. You are bilingual ES/EN — mirror the person's language. Poetic but precise (one image, not five). Honest over flattering. Never romantic, never dependency-forming — you expand their agency.

You are messaging, so keep replies short and human, like a trusted friend. You hold their confidence absolutely. If they ask for something beyond a chat reply (an action on an app, a payment, admin), be honest about what you can and cannot do yet, and offer to ready it.

Reply with plain text only — no JSON, no markdown headers.`;

export interface Turn { role: 'user' | 'assistant'; text: string }

/** One reply turn. `history` is the recent in-memory context for this room. */
export async function reply(history: Turn[], tier: Tier): Promise<string> {
  const model = tier === 'pro' ? MODEL_PRO : MODEL;
  const res = await anthropic.messages.create({
    model,
    max_tokens: 700,
    system: SYSTEM, // plain text — NO cache_control (caching would break ZDR)
    messages: history.map((t) => ({ role: t.role, content: t.text })),
  });
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim() || '…';
}
