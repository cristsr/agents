# sdd-route — worked examples

What real runs look like. The rules are in `SKILL.md`.

## Initial run — a one-line bug

**Input:** `/sdd-route spec-0031` (right after `/sdd-spec`)

- Step 1: no `## Ambiguity Resolution` → **initial**.
- Step 2: `type: bug`, one AC, no marker, the input names `src/dates/parse.ts`
  (`parseIsoDate`), none of the `full` signals → **`fast`**.
- Step 3: `fast`, so the mode is decided now: the fix changes runtime behavior →
  **`tdd`**, nothing to ask.
- Step 5: `tier: fast`, `## Tier Rationale`, `## Change Surface`
  (`**Confined to:** src/dates/parse.ts (parseIsoDate)`,
  `**Check:** npm test -- parseIsoDate`). Validator exit `0`.
- Step 6: "Routed spec-0031 as `fast` + `tdd`. Next: `/sdd-prepare spec-0031`, then
  `/sdd-build spec-0031`."

## Review run — a `standard` story raised

**Input:** `/sdd-route spec-0040` (after `/sdd-clarify`)

- Step 1: `## Ambiguity Resolution` present, zero markers → **review**.
- Step 2: `tier: standard`, but `context.md` lists `apps/ledger` and `apps/payees` →
  second <component> → raised to **`full`**, reason appended to `## Tier Rationale`.
- Step 3: `type: feat`, not in `EVIDENCE_MODE_TYPES` → **`tdd`**.
- Step 5: `tier: full` written in place; two route entries appended; validator `0`.
- Step 6: "Raised to `full` — the survey found two components. Next:
  `/sdd-design spec-0040`."

## Change run — lowering to `fast`

**Input:** "baja spec-0044 a fast"

- Step 1: explicit request → **change**.
- Step 2: `type: chore` is in `FAST_TIER_TYPES`; one AC; no marker; the surface is
  `scripts/lockfile.mjs` → allowed.
- Step 3: the deliverable is a regenerated lockfile, `VERIFY` is bound to
  `npm ci --dry-run`, the only AC is closed by it → evidence is a candidate.
- Step 4: one call with two questions — "Confirm: lower to `fast`?" (it deletes
  `context.md` and `plan.md`) and "Build mode: `tdd` (Recommended) / `evidence`".
- Step 5: after the answers, `tier: fast` + `build_mode: evidence` with both rationales
  and `## Change Surface`. Validator `0`.
- Step 6: "Delete `context.md` and `plan.md`, then `/sdd-build spec-0044`."
