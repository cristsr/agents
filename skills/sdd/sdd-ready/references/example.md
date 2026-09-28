# sdd-ready — worked examples

What real runs look like. The rules are in `SKILL.md`.

## A `standard` story the review raises

**Input:** `/sdd-ready spec-0040` (right after reviewing `spec.md`)

- Step 1: no `.branch` → all stages left. Announce: "Getting spec-0040 ready:
  /sdd-route → /sdd-prepare → /sdd-scan → /sdd-clarify → /sdd-route."
- `/sdd-route` initial → `tier: standard`. Validator `0`.
- `/sdd-prepare` → asks the branch name (its own question) → `feat/SPEC-0040-payees`,
  `.branch` written.
- `/sdd-scan` → `context.md` with `apps/ledger` and `apps/payees`, 1 gap.
- `/sdd-clarify` → 3 decisions autonomous, 1 escalated (one `AskUserQuestion` call,
  relayed as is); markers `0`.
- `/sdd-route` review → two components → raised to `full`; `tdd`.
- Report: "Route: `full` + `tdd` (raised from `standard` — the survey found two
  components). Branch `feat/SPEC-0040-payees`. Survey: 2 components, 1 gap.
  Clarification: 3 autonomous, 1 consulted. Next: `/sdd-design spec-0040`, then
  `/sdd-forge spec-0040`."

## A `fast` story

**Input:** `/sdd-ready spec-0031`

- `/sdd-route` initial → `tier: fast`, `tdd`; `## Change Surface` written.
- `/sdd-prepare` → `.branch` written.
- Tier `fast` → the chain ends: no survey, no clarification.
- Report: "Route: `fast` + `tdd`, confined to `src/dates/parse.ts`. Next:
  `/sdd-forge spec-0031`."

## Resuming after a stop

**Input:** `/sdd-ready spec-0052` — the previous run stopped at `/sdd-scan` because the
components couldn't be identified and the developer left.

- Step 1: `.branch` present, `status.mjs` → `next.artifact: context`. Stages left:
  `/sdd-scan`, `/sdd-clarify`, `/sdd-route` review.
- The chain continues from `/sdd-scan`; nothing already done runs again.
