# Draft Review + multi-round audit

Companion to `CLAUDIA-GRANT-WRITER.md`. That document covers how ClaudIA *writes* a
draft; this one covers how a draft gets audited and how a submission gets recorded.

## 1. The hard constraint

**The system never submits to a funder.** There is no code path in this app that
sends anything to anyone. Steph submits on the funder's own portal, email, or
form; `/review` records that it happened.

Three independent layers hold this:

1. **Database** — `grantflow.enforce_review_state()` refuses any transition to
   `review_state='submitted'` unless `submitted_by` is non-null.
2. **API** — only `POST /api/applications/[id]/submit` can make that transition.
   It requires a signed-in FBID session, requires `confirm: true` in the body,
   and takes `submitted_by` **from the session**, never from the request body.
   The generic `PATCH /api/applications` explicitly rejects `review_state:
   'submitted'` and cannot write any `submission_*` field.
3. **Agent** — the audit tools live in `lib/audit.ts` and are deliberately *not*
   registered in `lib/agent.ts`. ClaudIA can run audits and discuss them; she has
   no tool that reaches submission.

The UI adds a fourth, softer layer: the button is disabled until every round
passes, and then requires typing `SUBMITTED`.

## 2. Two axes, not one

`applications.stage` stays the **funding lifecycle** — discovered → researching →
drafting → submitted → won/rejected/skipped. `/pipeline` is unchanged.

`applications.review_state` is the new **draft-readiness** axis — Drafting →
In Audit → Ready for Review → Submitted by Steph. `/review` is the board for it.

They answer different questions and are deliberately not merged.

## 3. The audit loop

Four rounds, defined as **rows** in `grantflow.audit_rounds`, not constants in
TypeScript — reorder, retire, or make one optional by editing the table.

| # | Round | Fails when |
|---|---|---|
| 1 | Completeness | A required section is empty, or a funder question is deflected rather than answered |
| 2 | Accuracy | Any factual claim in the body is unverifiable or contradicted by the provided context |
| 3 | Fit & tone | Generic pitch, off-voice, or any equity/ownership language |
| 4 | Compliance | Over a word limit, missing a required attachment, or misses a stated format requirement |

Round 2 is the strict one. It walks claim by claim and classifies each as
`traceable` (naming the source field), `unverifiable`, or `contradicted`. Any
unverifiable claim **asserted in the draft body** is a blocker — the correct home
for a fact ClaudIA wasn't given is `open_questions`, which the auditor is told
explicitly not to treat as a finding. This is the write-time no-fabrication rule
from `CLAUDIA-GRANT-WRITER.md` §2, enforced again on the way out.

Verdicts append to `grantflow.audit_results`. An `UPDATE` trigger makes the table
append-only: a past verdict can never be rewritten. (`DELETE` is left open so
`on delete cascade` from `applications` still works.)

## 4. The gate, and why edits invalidate passes

`grantflow.audit_gate(app_id)` returns true only when every active + required
round has a `pass`/`waived` result whose `created_at` is **newer than the newest
`draft_sections.updated_at`**.

That single comparison does the interesting work: editing any section after a
passing audit silently invalidates that pass, and the card drops out of "Ready"
back to "In Audit". No stale approvals, and no mutation of the append-only ledger
to achieve it. `lib/review.ts` mirrors the same logic client-side so the UI can
explain *why* a card is stuck without a round trip; the database remains the
enforcer.

A **cycle** is one pass over the draft. A new cycle begins when a section was
edited after the newest verdict — which is what makes "did round 2 actually
improve?" answerable in the trail view.

## 5. Draft storage

`applications.draft` (jsonb) is kept as the **immutable ClaudIA generation
artifact**. `grantflow.draft_sections` is the living, editable document,
backfilled once from that jsonb. Sections are rows so that findings can anchor to
one, word limits can be per-section, and edits can be timestamped individually.

## 6. Files

```
lib/audit.ts                                  round prompts + runner (claude-opus-5)
lib/review.ts                                 gate, freshness, deadline tone (shared)
app/review/load.ts                            server-side assembly
app/review/{ReviewBoard,DraftReviewCard}.tsx  board + card
app/review/{DraftSections,AuditPanel,SubmissionBlock,AuditTrail}.tsx
app/components/review-ui.tsx                  DeadlineChip, ReviewStatePill, AuditStrip
app/api/applications/[id]/{audit,sections,submit,checklist,audit-trail}/route.ts
supabase/migrations/20260725_draft_review_audit.sql
```

Deadline colour states: red under 7 days, amber under 21, green beyond.
