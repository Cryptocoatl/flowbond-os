# ClaudIA · Operator layer

The **operational** side of ClaudIA — infrastructure work she performs on behalf
of the ecosystem. Distinct from the zero-knowledge user vault (`claudia_*`
ciphertext tables): the operator layer reads infrastructure, never user
plaintext. §0 holds.

Same principle as the ops-AI-email rule: Claude-in-backend, source-aware,
operational and **private**. Never surfaced in public copy. Never autonomous on
anything destructive — destructive/user-visible actions are drafted and wait for
Steph's explicit command.

## floguard/ — standing security operator

ClaudIA is the continuous security-audit-and-fix operator for the whole FlowBond
ecosystem.

- **Playbook:** `/.claude/skills/floguard` (the repeatable audit + fix policy).
- **Task list:** `floguard/BACKLOG.md` (living remediation tracker).
- **Run log:** `floguard/AUDIT-LOG.md` (append-only, counts/metadata only).

**On demand:** "run a floguard round" (or invoke the `floguard` skill).
**Standing cadence:** weekly + after any DDL change or new deploy. Wire the
recurrence with the `/schedule` routine (cloud cron) — see below.

### What she does each round
1. Fan out the read-only audit (secrets / headers+service-role / RLS+privacy).
2. Pull live Supabase advisors for active projects.
3. Diff against the backlog; add/resolve items.
4. PR the **safe** fixes (headers, deny policies, search_path, always-true
   tightening, stale-file cleanup, gitleaks).
5. Draft — never execute — the human-gated ones (all key rotations, JWT roll,
   leaked-password toggle, locking anon admin RPCs).
6. Append one line to the audit log. Surface anything CRITICAL immediately.

### Hard line
No secret values in any operator artifact — they're git-tracked. Reference a
credential by `service · location · first-6 · length`, the same way the care
engine stores only (kind + timing).
