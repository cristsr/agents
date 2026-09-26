---
name: sdd-route
description: >
  Decides a story's route through the pipeline and writes it into spec.md: the
  tier (which stages run — fast, standard or full) and the build_mode (how each
  acceptance criterion is closed — tdd or evidence). Infers the tier right after
  /sdd-spec, reviews both axes once /sdd-clarify has resolved the story, and
  applies a tier or mode change the developer asks for.
  Use when the user says "/sdd-route spec-XXXX", "route the story", "which tier",
  "raise the tier", "lower the tier", "make it a fast story", "switch to
  evidence mode", "back to tdd", "cambia el tier", "baja el tier", "pasa a modo
  evidence", or right after /sdd-spec or /sdd-clarify hand off to it.
  Do NOT use to write or correct the acceptance criteria (use /sdd-spec or
  /sdd-refine), to resolve ambiguities (use /sdd-clarify), or to survey the
  codebase (use /sdd-scan).
---

# route

## Overview

Owns the story's two routing axes in `spec.md`'s front matter, and nothing else:

| Axis | Question | Values | Default (field absent) |
|---|---|---|---|
| `tier` | which stages run | `fast` · `standard` · `full` | `full` |
| `build_mode` | how an AC is closed | `tdd` · `evidence` | `tdd` |

`~/.agents/contracts/TIERS.md` is the contract behind both. This skill is the only one
that writes either field.

**Core principle:** adding work is autonomous, removing it never is. Raising a tier or
keeping `tdd` needs no one's permission; lowering a tier or entering `evidence` is always
the developer's answer to a question.

**Announce at start:** "Routing spec-<number> — <initial | review | change> run."

**Output:** `work/active/spec-<number>/spec.md` — front matter and the routing sections
only.

---

## Project profile (read first, always)

Read `.agents/profile.yaml` from the project root before anything else, as
`~/.agents/references/project-profile.md` describes. The keys this skill reads are
listed under **Profile keys** in the `Contract` below.

---

## Contract

**Check every `Requires` row before any other work.**

**Requires**

| Condition | Check | If it fails |
|---|---|---|
| You are in the project's working directory | `pwd` == `WORKING_DIRECTORY` | `cd` there before running anything |
| An item id was given | the input carries an id matching `STORY_ID_PATTERN` | Ask: "Which item? (e.g. spec-1933)" |
| `spec.md` exists with at least one AC | `[ -f work/active/spec-<number>/spec.md ]` and one `### AC-N:` | Stop: "Run `/sdd-spec spec-<number>` first." |
| The story is still open | the folder is under `WORKDIR_ACTIVE`, not `WORKDIR_DONE` | Stop: a closed story has no route left to decide |
| **Review run only:** clarification is complete | `## Ambiguity Resolution` present and zero `[NEEDS CLARIFICATION]` markers | Stop: "Run `/sdd-clarify spec-<number>` first." |

**Produces** — what `/sdd-prepare`, `/sdd-plan`, `/sdd-build` and `/sdd-status` read

- a `tier` that is valid for the story's `type`: the field absent (`full`), or present
  with a non-empty `## Tier Rationale` — and, for `fast`, a `## Change Surface` with a
  path in `**Confined to:**` and a command in `**Check:**`
- a `build_mode` that is valid for the story's `type`: absent (`tdd`), or `evidence` with
  a non-empty `## Build Mode Rationale` naming the `VERIFY.run` check
- **review run:** exactly one `**Tier ·` entry and one `**Build mode ·` entry in
  `## Ambiguity Resolution`
- `node ~/.agents/scripts/validate-artifacts.mjs spec-<number>` exits `0`
- a handoff naming the one next command the two axes give

**Writes** — nothing outside this list

- in `work/active/spec-<number>/spec.md`: the `tier` and `build_mode` front-matter
  fields, `## Tier Rationale`, `## Build Mode Rationale`, `## Change Surface`, and the
  two route entries of `## Ambiguity Resolution` — each edited in place, never
  duplicated

Not the ACs, the framing block, `## Technical Context` or any other entry of
`## Ambiguity Resolution` (that's `/sdd-clarify`), and no other file.

**Never**

- survey the codebase — the survey is `/sdd-scan`'s; this skill reads `context.md`
- edit an acceptance criterion or resolve a `[NEEDS CLARIFICATION]` marker
- write `evidence` or a lower tier without the developer's answer
- write a field against `EVIDENCE_MODE_TYPES`, `FAST_TIER_TYPES` or
  `STANDARD_TIER_TYPES`, or invent a `## Change Surface` to reach `fast`
- delete a file — a change that leaves artifacts behind names them for the developer
- any state-changing git command

**Escalates** — the closed list

1. The **evidence question**, whenever the three conditions of `references/build-mode.md`
   hold — `tdd` first as the safe default.
2. The **lowering question**, whenever the evidence says the story could run with fewer
   stages — the current tier first (`references/tier-changes.md`).
3. **Confirmation of a requested change**, with what it drags along.

Both questions go in a **single `AskUserQuestion` call** when both apply. There is no
fourth reason to ask.

**Profile keys**

- `STORY_ID_PATTERN`, `WORKDIR_ACTIVE`, `WORKDIR_DONE` — the item's id and workspace,
  written here as `spec-<number>` and `work/active/spec-<number>/`
- `WORKING_DIRECTORY` — the first `Requires` row
- `FAST_TIER_TYPES`, `STANDARD_TIER_TYPES` (items block) — which types may enter each
  reduced tier; defaults `[bug, debt, chore]` and `[feat, bug, debt, incident, chore]`
- `EVIDENCE_MODE_TYPES` (items block) — which types may enter `evidence`; default
  `[debt, chore, incident]`
- `VERIFY` (port) — not called here; only checked for a real adapter
- `ARTIFACT_LANGUAGE`, `OUTPUT_LANGUAGE` — see "Output language"

---

## Flow

Copy this checklist and tick it as you go:

```
- [ ] Step 1 — Requires checked, run kind decided
- [ ] Step 2 — tier decided
- [ ] Step 3 — build_mode decided
- [ ] Step 4 — questions asked (one call), if any
- [ ] Step 5 — spec.md written, validator exit 0
- [ ] Step 6 — handoff
```

### Step 1 — Decide the run kind

| The input and the story say | Run |
|---|---|
| The developer asks for a specific tier or mode ("lower it to standard", "switch to evidence") | **change** |
| `## Ambiguity Resolution` present and zero markers | **review** |
| Anything else | **initial** |

### Step 2 — The tier

- **Initial:** a `tier` already in the front matter is a developer's decision — keep it.
  Otherwise infer it from the input alone with `references/tier-inference.md`: signals in
  order, first match wins. `full` → write nothing.
- **Review:** a `full` story has nothing to review. A `standard` story is raised to
  `full` when `context.md` or the decisions show a contract, a schema, a new integration,
  a second <component> or a security/performance change — autonomous, per
  `references/tier-changes.md`. If the evidence says the story could have fewer stages,
  hold the lowering question for Step 4.
- **Change:** confirm the requested tier against the allowlists and the rules of
  `references/tier-changes.md`; hold the confirmation for Step 4.

### Step 3 — The build mode

Apply `references/build-mode.md`: `tdd` unless the three conditions hold, in which case
hold the evidence question for Step 4.

- **Initial:** only for a `fast` story — it never reaches the review, so this is its
  only chance. For `standard` and `full`, leave it to the review, when the ACs are
  precise.
- **Review** and **change:** always.

### Step 4 — Ask (one interaction)

Everything held in Steps 2-3 goes out in a **single `AskUserQuestion` call**: the
recommended option first with " (Recommended)", `header` at most 12 characters
(`"Tier"`, `"Build mode"`, `"Confirm"`). Nothing held → skip this step.

### Step 5 — Write and validate

Write per `references/tier-changes.md` § "Writing the tier" and
`references/build-mode.md` § "Writing it down". In a review run, write the two route
entries per `references/route-log-format.md`. Then:

```bash
node ~/.agents/scripts/validate-artifacts.mjs spec-<number>
```

Exit `1` → fix what it reports and re-run until it exits `0`. Exit `2` (no `node`) →
check the rows of `Produces` by eye and say the validator didn't run.

### Step 6 — Handoff

| Run | `tier` | `build_mode` | Next |
|---|---|---|---|
| initial | `fast` | either | `/sdd-prepare spec-<number>`, then `/sdd-build spec-<number>` |
| initial | `standard`, `full` | — | `/sdd-prepare spec-<number>`, then `/sdd-scan spec-<number>` |
| review | `full` | `tdd` | `/sdd-design spec-<number>` |
| review | `full` | `evidence` | `/sdd-plan spec-<number>` — that mode has no design stage |
| review | `standard` | either | `/sdd-plan spec-<number>` |
| change | — | — | the `Next` column of `references/tier-changes.md`, plus the files to delete |

A raise is the one case where the answer differs from what the initial run reported:
say it, so the developer doesn't follow the tier announced earlier.

Stop — don't start the next stage.

---

## Output language

**Conversational output** follows `~/.agents/references/chat-conventions.md` — the six
blocks (announce, progress, question, summary, stop, handoff).

**Artifact prose follows `ARTIFACT_LANGUAGE`**: the lines under `## Tier Rationale`,
`## Build Mode Rationale` and the route entries. The **section headings**, the
front-matter keys and their values (`tier: fast`, `build_mode: evidence`) and the
`**Confined to:**` / `**Check:**` labels stay English — scripts and skills match them
by name.

---

## Common Issues

The ones that **stop** a run. Every other failure mode is in
`references/common-issues.md`.

| Issue | Cause | Resolution |
|---|---|---|
| Review requested but markers remain | `/sdd-clarify` didn't finish | Stop: run `/sdd-clarify spec-<number>` first |
| The requested tier is outside the type's allowlist | `FAST_TIER_TYPES` / `STANDARD_TIER_TYPES` | Refuse. Widening the list is a deliberate edit of `.agents/profile.yaml` |
| `fast` requested but the story has two ACs or a marker | `fast` pays with one criterion and no clarification pass | Refuse; `standard` is the lowest tier the story can take |
| The validator keeps failing | A rationale line is empty or a section is misplaced | Re-read `references/tier-changes.md` § "Writing the tier" and fix in place |

---

## Example

Worked runs — an initial run on a bug, a review that raises a story, and a change to
`fast` — are in `references/example.md`.
