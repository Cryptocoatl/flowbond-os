# FlowMe — The Consent-First Identity Agent, FlowGuard-Validated

Status: **Design / deep-plan** (not built). Authored 2026-06-08.
Fourth doc in the FBID set — read with [identity v2](./FBID_MULTI_EMAIL_ORG_DESIGN.md), [Passport](./FBID_PASSPORT_DESIGN.md),
[Personas & Linking](./FBID_PERSONAS_AND_LINKING.md).

Steph's ask: FlowMe becomes a **full agent that organizes everything around your identity** — capable like an open agent
framework, *but* with values: it respects that the data is **yours**, it **never enters without knocking** unless you've
given explicit permission, and **every action is wired through FlowGuard validation** and written to the provenance shield.

---

## 0. Reality check — what exists today (the gap)

From the audit (`services/flowme`, `services/api`, `packages/ai`, `flowdesk/src/lib/flowgardian/*`):

- FlowMe agent = JSON intent-parser (Haiku 4.5), 3 hardcoded intents (SITE_*), WhatsApp adapter. **No tool-calling, no scopes.**
- It calls the Hono API, which uses a **service-role** Supabase client → **bypasses RLS and the 5-tier visibility model**.
- It **executes without asking** — no approval, no capability, no per-action audit (only an `agent_messages` log).
- FlowGardian today = crypto + secret-field policy + rate-limit + security headers. **No authorization/policy engine.**
- BUT a reusable consent pattern exists: **FlowEdit** (`approval_mode: auto|review|admin_only`, `status: draft→pending→approved→live`,
  signed email approve/reject tokens, `notify.ts`). Generalize that into the agent's knock protocol.

**So this is a re-founding, not a bolt-on.** Phase 0 is: strip the agent of ambient service-role authority and put every
data touch behind the FlowGuard gate. That is simultaneously the security fix and the foundation for everything below.

---

## 1. Principles (enforced as code, not vibes)

1. **Knock-first / default-deny.** Any write, any cross-persona read, any external send → the agent must hold an explicit
   grant or **knock** (ask) first. No standing access is assumed.
2. **Least privilege.** The agent never holds blanket service-role. It acts **as a persona**, with narrow capabilities,
   under that persona's RLS + visibility — never seeing more than the human could.
3. **Data minimization.** It decrypts only the fields an action needs; its context window gets scoped/masked data, not raw PII.
4. **Persona firewall.** Acting as persona A, it cannot read or correlate persona B (or the root) without an explicit
   `link:personas` grant. (Directly enforces the unlinkability promise of the Personas doc.)
5. **Revocability.** Every grant is revocable instantly; revocation kills in-flight capability tokens.
6. **Transparency.** Every action produces a user-visible trace; the agent can always answer "what did you do, why, and to what."
7. **Sovereignty.** Data stays yours — no PII leaves to an external tool/model without a grant; export & erase always honored.

"Open and capable, but it works for you and knocks before it enters."

---

## 2. Capability model

A **capability** = `verb:resource:qualifier`, e.g. `read:profile:@artist`, `read:passport:root`,
`write:attachment:email`, `route:notify:billing`, `act:transfer:attachment`, `send:message:whatsapp`, `app:flowgarden:read`.

Each capability is granted to an **(agent, persona)** pair with a **mode** (generalizing FlowEdit's `approval_mode`):

| Mode | Meaning |
|---|---|
| `auto` | standing permission — agent may act **without knocking**, within constraints |
| `knock` | agent must get a fresh per-action approval before acting |
| `never` | hard-forbidden (overrides everything) |

Constraints on a grant (JSON): `expires_at`, rate cap, value caps (e.g. spend ≤ N FlowCredits), resource filters
(e.g. only `app_slug='flowgarden'`), data-class limits (e.g. `no_pii`). Defaults are conservative: **writes and
external sends default to `knock`; only explicit, low-sensitivity reads default to `auto`.**

---

## 3. The knock protocol (consent UX)

```
agent wants action A (needs capability C)
        │
   FlowGuard.authorize(actor, C, resource, ctx)
        ├─ grant=auto & constraints ok ───────────────► ALLOW → execute → audit
        ├─ grant=never / no grant for sensitive ──────► DENY
        └─ grant=knock (or write w/o fresh approval) ─► emit KNOCK
                                                          │
   KNOCK = signed, scoped, expiring request to the user, delivered on their channel
   (push / WhatsApp / hub dashboard), stating EXACTLY: what · why · which persona ·
   what data it touches · constraints.
                                                          │
        user decides ──► Approve (once)         → one-time capability token → execute → audit
                    ├──► Approve + "always"      → upgrade grant to `auto` (with constraints) → execute
                    └──► Deny                    → recorded; agent backs off and explains
```

Reuses FlowEdit's signed-token mechanism (`generateActionToken`/`notify.ts`) for the approve/deny links, but generalized
to any capability and any channel, with short TTLs.

---

## 4. FlowGuard, extended into a policy gate (the "full wired validation")

Today FlowGuard is crypto-only. Extend it with one mandatory chokepoint every agent action passes through:

```ts
flowguard.authorize({
  agent, actingPersona, root,          // who
  capability, resource, context,       // what
}): Decision   // 'allow' | 'deny' | 'knock-pending'
```

Pipeline (each step can deny):
1. **Resolve actor** → (agent, acting persona, root) via `current_fbid()` + persona context.
2. **Grant check** — capability scope match, not expired/revoked, constraints satisfied.
3. **Visibility/RLS check** — agent operates with **user-scoped** access (a minted, constrained token — NOT service-role),
   so the existing RLS + `get_profile` 5-tier filtering applies unchanged. No bypass.
4. **Rate-limit** per (agent, capability) — extends the existing `ratelimit.ts` from Brain-only to all agent ops.
5. **Knock gate** — if write/sensitive and mode=`knock` with no fresh approval → emit knock, return `knock-pending`.
6. **Decrypt-minimal** — `fg1:` decrypt only the needed fields.
7. **Execute**.
8. **Audit** — append `fbid_provenance` commitment (the ZK shield already covers agent actions) + `fbid_agent_actions`
   detail (encrypted). Anything the agent touched is now inside the shield.
9. **Return** result + a user-visible trace line.

---

## 5. Data model (extends the prior docs)

```sql
create table fbid_capabilities (              -- catalog
  slug          text primary key,             -- 'write:attachment:email'
  verb          text not null,
  resource_type text not null,
  sensitivity   text not null check (sensitivity in ('low','medium','high')),
  default_mode  text not null check (default_mode in ('auto','knock','never'))
);

create table fbid_agent_grants (              -- what the agent is allowed, per persona
  id            uuid primary key default gen_random_uuid(),
  root_fbid_id  uuid not null references flowbond_identities(id) on delete cascade,
  persona_fbid_id uuid references flowbond_identities(id) on delete cascade,
  agent_id      text not null default 'flowme',
  capability    text not null references fbid_capabilities(slug),
  mode          text not null check (mode in ('auto','knock','never')),
  constraints   jsonb not null default '{}',  -- {expires_at, rate, value_cap, filters, data_class}
  granted_at    timestamptz not null default now(),
  expires_at    timestamptz,
  revoked_at    timestamptz
);

create table fbid_agent_knocks (              -- pending/answered approval requests
  id            uuid primary key default gen_random_uuid(),
  persona_fbid_id uuid not null references flowbond_identities(id),
  capability    text not null,
  action_summary text not null,               -- human-readable "FlowMe wants to … because …"
  resource_ref  text,
  data_touched  text,                          -- what it would read/decrypt
  status        text not null default 'pending' check (status in ('pending','approved','denied','expired')),
  channel       text,                          -- 'push'|'whatsapp'|'dashboard'
  decision_token text,                         -- signed, single-use
  requested_at  timestamptz not null default now(),
  expires_at    timestamptz not null,
  decided_at    timestamptz
);

create table fbid_agent_actions (             -- audit (links into fbid_provenance shield)
  id            uuid primary key default gen_random_uuid(),
  agent_id      text not null default 'flowme',
  persona_fbid_id uuid references flowbond_identities(id),
  capability    text not null,
  resource_ref  text,
  input_commitment  text,                      -- commitments, not raw PII
  result_commitment text,
  detail_enc    text,                          -- fg1:… (owner-only)
  status        text not null,                 -- 'allowed'|'denied'|'knocked'|'executed'|'failed'
  provenance_seq bigint references fbid_provenance(seq),
  created_at    timestamptz not null default now()
);
```

---

## 6. What FlowMe organizes (the actual value)

Acting as a chosen persona, within granted scopes, FlowMe:
- **Identity hygiene** — maps which emails/wallets/works attach where; **detects the duplicate-account case** (e.g. Steph's
  `cryptocoatl101` vs `stepbystephbtm`) and **knocks** to propose a merge/transfer — never auto-merges (consent + the
  Personas doc's verified flow).
- **Routing** — sends the right thing to the right inbox/persona via `fbid_email_routes` (the original "direct specific
  things to specific emails" ask).
- **Passport** — reminds you which stamps are expiring, what benefits a few more points unlock; **prompts** verification.
  It can *organize* stamps but cannot *mint* them — issuance stays with trusted verifiers (Passport doc §7).
- **Provenance Q&A** — answers "what happened to that wallet / who has access to my artist persona" from the shield.
- **Cross-app concierge** — organizes your FlowGarden / DANZ / Flow3 / FlowDesk life, each behind `app:*` capabilities.
- **Acts on your behalf** within scope (draft, schedule, claim, file) — high-impact actions always knock.

---

## 7. Agent runtime upgrade

- Replace the JSON-intent parser with **Anthropic tool-use** (Claude). Each tool's handler is wrapped so it **cannot run
  until `flowguard.authorize()` returns `allow`**. The capability is declared in the tool's metadata; the wrapper is the
  enforcement — a tool literally has no path to data except through the gate.
- The agent's **values live in the system prompt AND in the gate** — the prompt tells it to knock and minimize; the gate
  guarantees it even if the model misbehaves (defense in depth — never trust the prompt alone for security).
- Keep multi-channel adapters (WhatsApp/Telegram/Web); knocks are delivered on whichever channel the user prefers.

## 8. Phasing (folds into the master sequence)

- **AG0 — de-privilege (security fix, do first):** stop the agent using service-role; route every data touch through a
  minted user-scoped token + a stub `flowguard.authorize()`; log to `fbid_agent_actions`. Closes the current bypass.
- **AG1 — capabilities + grants + knock:** the three tables, the authorize() pipeline, generalize FlowEdit's signed-token
  approval into the knock UX (start in the hub dashboard, then push/WhatsApp).
- **AG2 — tool-use runtime:** migrate FlowMe to Anthropic tool-use; wrap every tool in the gate; ship the read-only
  organizing tools (hygiene map, routing suggestions, passport reminders) — all `auto` for low-sensitivity reads, `knock` for writes.
- **AG3 — act-on-behalf:** write/transfer/route/spend tools, all `knock` by default, value-capped; the duplicate-merge proposer.
- **AG4 — provenance + ZK:** agent actions commit into the shield; "always" grants and revocation; later, ZK proofs that an
  action was authorized without revealing the persona (depends on Passport/Personas Phase E).

## 9. Risks / open questions

- **Prompt is not a security boundary.** The model may try to over-reach; only the gate is trusted. Pen-test the wrapper, not the prompt.
- **Knock fatigue.** Too many knocks → users rubber-stamp. Tune default modes; batch related knocks; make "always (scoped)" easy but constrained.
- **De-privileging may break current flows** that rely on service-role. Inventory `services/api` callers before AG0; migrate behind a flag.
- **Cross-persona leakage via the model's context.** Even with the gate, don't load persona B's data into the context while
  acting as A. Scope the context itself, not just the tools.
- **Delegation depth.** If the agent calls sub-agents/tools that call externals, capabilities must not silently widen — propagate, don't escalate.
