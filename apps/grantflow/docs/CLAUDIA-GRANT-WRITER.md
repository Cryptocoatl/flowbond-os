# ClaudIA as GrantFlow's grant writer — design

Status: **design** (no code yet). Owner: Steph. Drafted 2026-06.

## 1. The idea

ClaudIA — the FlowBond steward — runs the whole funding process end to end:
discover grants → score fit → **draft the application** → track it to submission and
decision. GrantFlow already does discovery, scoring (139 matches), and tracking. The
missing middle is drafting. This doc specs ClaudIA writing the draft.

## 2. Architectural honesty: this is ops-Claude, not zero-knowledge ClaudIA

ClaudIA's core identity (`apps/claudia`, §0) is **zero-knowledge**: client-side crypto,
blind no-log relay, server recovers zero plaintext. Grant writing is the *opposite*
shape — a server-side model that reads a lot and writes long-form prose.

That's fine, because **GrantFlow's catalog is non-sensitive**: `grants`, `projects`,
`matches`, `sources` are a public catalog. No secret custody is involved in drafting from
them. So this feature is the **ops-Claude pattern** (Claude-in-backend, source-aware,
operational/private) wearing ClaudIA's *voice and orchestration role* — NOT her blind
relay. We must not route grant-drafting through ClaudIA's zero-knowledge path, and we must
not imply that drafting is private/encrypted. It is a normal server LLM call over public data.

Model: `claude-opus-4-8` (server-side, `ANTHROPIC_API_KEY`, never exposed to the browser).

## 3. The brief already exists

A `matches` row is the drafting brief — no new "intent" capture needed:

| field | role in drafting |
|---|---|
| `matches.grant_id` → `grants` | the funder, its `requirements[]`, `eligibility_summary`, `application_process`, `funding_amount` |
| `matches.project_slug` → `projects` | the applicant: `name`, `tagline`, `description`, `layers`, `url` |
| `matches.reason` | why this is a fit — the angle the draft should lead with |
| `matches.fit_score` | prioritization only |

## 4. Data model — proposed migration

`applications` currently has no draft fields (only `notes text`). Add a dedicated draft
home so drafts are structured, versionable, and clearly machine-origin:

```sql
-- grantflow.applications additions (proposed)
alter table grantflow.applications
  add column draft          jsonb,       -- structured per-question answers (see §5)
  add column draft_status   text default 'none'
    check (draft_status in ('none','generating','drafted','edited','approved')),
  add column drafted_by      text,        -- 'claudia' | 'human'
  add column draft_model     text,        -- e.g. 'claude-opus-4-8'
  add column draft_updated_at timestamptz;
```

Keep `applications` service-role-only (no public policy) — drafts are internal until you
choose to submit. No schema change to `grants`/`matches`.

## 5. Draft shape (the `draft` jsonb)

Answer the grant's *actual* questions, not freeform prose. Derive questions from
`grants.requirements[]` + `application_process`; fall back to a standard set when a grant
has none.

```jsonc
{
  "summary": "one-paragraph project pitch tuned to this funder",
  "answers": [
    { "q": "What problem are you solving?", "a": "..." },
    { "q": "Why this team?", "a": "..." }
  ],
  "budget_ask": "matches grants.funding_amount / currency",
  "fit_rationale": "leads with matches.reason",
  "open_questions": ["facts ClaudIA couldn't fill — needs Steph"],
  "sources_used": ["project.description", "grant.eligibility_summary"]
}
```

`open_questions` is the honesty valve: ClaudIA flags what it does **not** know rather than
inventing facts (figures, traction, team bios). No fabricated metrics — ever.

## 6. Flow

1. From `/grants/[id]` or `/pipeline`, user clicks **Draft with ClaudIA** on a match.
2. `POST /api/applications` upserts an application at `stage='drafting'`,
   `draft_status='generating'`.
3. Server action loads grant + project + match, builds the prompt (§5 structured output),
   calls `claude-opus-4-8`, writes `draft`, sets `draft_status='drafted'`,
   `drafted_by='claudia'`, `draft_model`, `draft_updated_at`.
4. Pipeline shows the card with a "✦ drafted by ClaudIA" marker and an editable view.
5. Steph edits (→ `draft_status='edited'`), approves (→ `'approved'`), then submits
   manually on the funder's site and moves the stage to `submitted`.

## 7. Human-in-the-loop & guardrails

- **ClaudIA drafts, Steph submits.** No auto-submission to any funder, ever.
- **AI disclosure is per-funder.** Some grant programs forbid/require disclosing AI
  assistance. Surface `application_process` so Steph decides before sending; default to a
  human pass on every word. (Consistent with the ops rule: never *surface* AI in outward
  copy unless deliberately chosen.)
- **No fabrication.** Unknowns go to `open_questions`, not into invented answers.
- **Public data only.** Drafting never touches ClaudIA's encrypted/zero-knowledge stores.

## 8. Build phases (when we move past design)

1. **Migration** — add the §4 columns.
2. **Draft endpoint** — `POST /api/applications/[id]/draft` server action calling Opus with
   the §5 schema; persist + set status.
3. **UI** — "Draft with ClaudIA" button + a draft viewer/editor on the grant + pipeline.
4. **Polish** — regenerate, diff human edits vs ClaudIA, per-question regenerate,
   "ClaudIA reviews my draft" (critique mode).

## 9. Open product questions for Steph

- Voice: should drafts read as ClaudIA (first-person steward) or neutral applicant voice?
- Which layer/funders to target first? (highest-fit + nearest deadline is the obvious start)
- Do we want a "winning grants" library to give ClaudIA examples to imitate?
