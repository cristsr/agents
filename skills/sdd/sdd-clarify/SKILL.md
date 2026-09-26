---
name: sdd-clarify
description: >
  Resolves the open questions of a story's spec.md before design: finds every
  ambiguity in the acceptance criteria, decides each one against the project's
  rules, the story's assets and the code precedent in context.md, asks the
  developer only what no source can settle, and rewrites the ACs as precise,
  testable criteria with a decision log.
  Use when the user says "/sdd-clarify spec-XXXX", "clarify story", "resolve
  ambiguities", "make the ACs testable", "aclara la historia", "resuelve las
  ambigüedades", or right after /sdd-scan hands off to it.
  Do NOT use to survey the codebase or refresh context.md (use /sdd-scan), to
  decide or change the tier or build mode (use /sdd-route), to correct
  artifacts once design or plan exist (use /sdd-refine), or to create the item
  (use /sdd-spec).
---

# clarify

## Overview

Turns a raw `spec.md` into a precise one: every unknown decided with its source, every
AC testable, and only what genuinely belongs to the developer asked.

**The principle:** a question the model can answer with grounding is not a question,
it's paperwork. If you can write the why, don't ask — decide and leave the why written
down.

The terrain comes from `context.md`, which `/sdd-scan` wrote before this run. This skill
reads it as evidence; it never surveys the modules or rewrites the inventory.

It runs inline, in three separated phases — Research, Plan, Implement. Why inline and
why separated: `references/why-rpi.md`.

**Announce at start:** "Clarifying spec-<number> — I'll decide what has a source and only ask you what doesn't."

**Output:** `work/active/spec-<number>/spec.md`, modified in place.

---

## Project profile (read first, always)

Read `.agents/profile.yaml` from the project root before anything else, as
`~/.agents/references/project-profile.md` describes. The keys this skill reads are
listed under **Profile keys** in the `Contract` below.

---

## Contract

What this skill needs, what it guarantees to `/sdd-route` (which routes the story to
`/sdd-design` or `/sdd-plan`), and what it may not do. **Check every `Requires` row
before any other work.**

**Requires**

| Condition | Check | If it fails |
|---|---|---|
| You are in the project's working directory | `pwd` == `WORKING_DIRECTORY` | `cd` there before running anything |
| An item id was given | the input carries an id matching `STORY_ID_PATTERN` | Ask: "Which item? (e.g. spec-1933)" |
| `spec.md` exists with at least one AC | `[ -f work/active/spec-<number>/spec.md ]` and one numbered AC under `## Acceptance Criteria` (a legacy `hu.md` counts) | Stop: "Run `/sdd-spec spec-<number>` first." |
| The story's tier has a clarification pass | no `tier: fast` in the front matter (absent means `full`) | Stop: "`spec-<number>` is a `fast` story — that tier has no clarification pass. To add one, raise the tier with `/sdd-route spec-<number>`." |
| `context.md` exists | `[ -f work/active/spec-<number>/context.md ]` | Stop: "Run `/sdd-scan spec-<number>` first — this pass reads the survey, it doesn't make one." |
| The item isn't already clarified | `## Ambiguity Resolution` present **and** zero `[NEEDS CLARIFICATION]` markers | Don't re-run: offer `/sdd-refine` (adjust ACs) or `/sdd-route` (next stage) |

**Produces** — what `/sdd-route` and `/sdd-design` look for

- **zero** `[NEEDS CLARIFICATION]` markers in `spec.md`
- `## Ambiguity Resolution` with one entry per unknown — decision, rationale, source,
  confidence — including the searches that came back empty
- every AC verifiable as written: rephrased in EARS where it wasn't, with one
  `#### Scenario:` per branch (happy path, error, empty, boundary) carrying the real
  values the decisions settled — none for a single unconditional rule
- `## Technical Context` **only** if the developer declared constraints or debt in R5

**Writes** — nothing outside this list

- `work/active/spec-<number>/spec.md` — the ACs, `## Ambiguity Resolution` and
  `## Technical Context`, edited in place

Not `context.md` (that's `/sdd-scan`), not the `tier`/`build_mode` fields or their
sections (that's `/sdd-route`), not `design.md` or `plan.md`, not the source code, the
story's `assets/` or the authority sources.

**Never**

- delete a `[NEEDS CLARIFICATION]` marker without writing its decision into
  `## Ambiguity Resolution` — an unlogged resolution is indistinguishable from a guess
- any git command — this skill reads files only

**Escalates** — only the four classes of `references/decision-authority.md` §3:
**scope**, **business intent**, **irreversible choices**, **rule conflicts**. At most
**3** per run, in a **single `AskUserQuestion` call** (P3/P4); above that the item's
scope isn't ready and the wrap-up says so. R5's free-text question about unwritten
constraints sits outside that budget. With `--ask` there is no budget and no autonomy.

**Degrades**

- `CODE_SURVEY` without call paths → precedent queries are not delegated: lean on the
  verbatim citations already in `context.md`; what they don't cover is resolved with
  level 5-6 sources and recorded as "no precedent". Say which depth you got.
- A missing authority source (`docs/rules.md`, `CLAUDE.md`) → continue; the hierarchy
  drops one level.

**Reverting** — `spec.md` is edited in place. A re-run **appends** to the decision log
instead of recreating it, so the reasoning survives. `git checkout --
work/active/spec-<number>/spec.md` restores the committed version.

**Profile keys**

- `STORY_ID_PATTERN`, `WORKDIR_ACTIVE` — the item's id and workspace, written here as
  `spec-<number>` and `work/active/spec-<number>/`
- `WORKING_DIRECTORY` — the first `Requires` row
- `CODE_SURVEY` (port) — the precedent queries of R4
- `ARTIFACT_LANGUAGE`, `OUTPUT_LANGUAGE`, `IDENTIFIER_LANGUAGE` — see "Output language"

---

## Flow

Copy this checklist and tick it as you go:

```
- [ ] Step 1 — Requires checked, mode chosen
- [ ] Step 2 — PHASE R: unknowns, authorities, assets, precedent, R5
- [ ] Step 3 — PHASE P: classify, interdependencies, select, batch
- [ ] Step 4 — one interaction round (if anything to ask)
- [ ] Step 5 — PHASE I: decision log, ACs, EARS + scenarios, technical context
- [ ] Step 6 — handoff gate: zero markers
```

### Step 1 — Gates and mode

Run the `Requires` checks. Then:

- `--ask` in the input → the legacy interactive mode, `references/legacy-ask-mode.md`,
  and stop.
- Markers remain but `## Ambiguity Resolution` exists → the run **appends** entries;
  say so in the wrap-up.

### Step 2 — PHASE R (Research)

**Phase rule: collect evidence. Don't decide, don't write.** A resolution that tempts
you here belongs to P, with everything in view.

**R1 — The complete list of unknowns.** Combine and deduplicate:

- every `[NEEDS CLARIFICATION: ...]` marker `/sdd-spec` left;
- a self-check of every AC — working notes, never output:

| Dimension | What to look for |
|---|---|
| Testability | "reasonable", "fast", "should" with no objective criterion; undefined business terms ("active", "eligible") |
| Happy path | No output format, response code or resulting state |
| Edge cases | Empty, zero, maximum, duplicate, concurrency implied but uncovered |
| Errors | Silent about invalid input, authorization, or a dependency failure |
| Inconsistencies | Two ACs that overlap, or an AC that violates a stated rule |
| Coverage | Behavior described in prose with no AC capturing it |

Order by impact: contradictions → gaps blocking DTOs or business rules → errors and edge
cases → wording.

**R2 — Authority sources.** Read once: `docs/rules.md`, `CLAUDE.md`,
`.agents/profile.yaml`. Then read `references/decision-authority.md` (hierarchy,
escalation test, confidence) and keep `references/calibrated-cases.md` for decisions on
the line. **Once, not per unknown.**

**R2b — Story assets.** If `work/active/spec-<number>/assets/` exists, read every file
per `references/story-assets.md` — level-3 authority, read-only; an unreadable one is a
gap, never a blank you fill in.

**R4 — Precedent.** Read `context.md` in full: its inventory and detected gaps are
evidence. Then, for the unknowns where "how did we solve this before?" is pertinent
(lengths, error names, formats, column conventions, port patterns — never business
intent), resolve `CODE_SURVEY` and fire the precedent queries **in one batch**, capped at
**5**, scoped to the components `context.md` lists. Interpret the results with
`references/decision-authority.md` §2.

**R5 — What only the developer knows.** Unwritten constraints and known technical debt
live in no file. If either could change a resolution, hold one free-text question for
Step 4. No such risk → no R5 question.

Close R holding the dossier **in context, never on disk**: per unknown its text,
priority, sources consulted, what was found and what wasn't.

### Step 3 — PHASE P (Plan)

**Phase rule: decide everything. Write nothing.**

**P1 — Classify every unknown.** Search the hierarchy for the source that
**determines** the answer (not merely one compatible with it):
`docs/rules.md` → `CLAUDE.md`/profile → story assets → code precedent → formal standard
→ the item's own invariants.

- One determines it → autonomous: decision, rationale, source, confidence.
- None does → the escalation test: scope, business intent, irreversibility, rule
  conflict → *escalation candidate*. Otherwise decide the best alternative at **low**
  confidence.

**Golden rule:** if you can write the rationale in one sentence, don't ask.

**P2 — Interdependencies.** With every decision on the table: resolve contradictions
between decisions, drop unknowns another decision made irrelevant, fix any decision that
clashes with `context.md`, align low-confidence ones a high-confidence one pins down.

**P3 — Select.** At most **3** escalations, the highest-impact ones over the **complete**
candidate list. More than 3 → resolve the rest at low confidence and say:

> "<N> unknowns needed your judgment but the budget is 3. I resolved the others at low
> confidence — it may be worth reviewing this item's scope before moving on."

**P4 — Batch.** Each escalation as a `question`, a `header` (max 12 chars) and 2-4
`options`, the recommended one first with " (Recommended)" and its rationale in the
`description`.

### Step 4 — Ask the developer (one round)

- R5 question, if any → plain free text.
- Escalations, if any → a **single `AskUserQuestion` call**, never a loop.

Nothing to ask → skip this step.

### Step 5 — PHASE I (Implement)

**Phase rule: apply what was decided. Decide nothing new.** A doubt that shows up here
means R was incomplete: resolve it with the hierarchy at low confidence — don't open a
question this late.

1. **I1 — Decision log first.** Write `## Ambiguity Resolution` before anything else —
   an interrupted run then keeps the expensive part, the reasoning. Entry shape and
   worked examples: `references/decision-log-format.md`. Record the empty searches and
   the inconsistencies too.
2. **I2 — Apply the resolutions to the ACs** and remove each resolved marker. None may
   remain.
3. **I3 — EARS and scenarios**, automatic, never asked:
   `references/ears-and-scenarios.md`. Every decision that settled a **value** should be
   visible in a scenario.
4. **I4 — `## Technical Context`**, only with what the developer declared in R5, per
   `references/tech-context-template.md`. Nothing declared → omit the section.
5. **I5 — Batch review.** Render the decisions by ascending confidence — the shaky ones
   on top.

### Step 6 — Handoff

Run the gate against the file on disk, never from memory:

```bash
grep -c 'NEEDS CLARIFICATION' work/active/spec-<number>/spec.md
```

- Non-zero → the run isn't complete: finish PHASE I for the markers left.
- `0` → "Clarified. Next: `/sdd-route spec-<number>` — it confirms the tier and the
  build mode, and names the stage that follows."

Stop — don't start the next stage.

---

## Output language

**Conversational output** follows `~/.agents/references/chat-conventions.md` — the six
blocks (announce, progress, question, summary, stop, handoff).

**Artifact prose follows `ARTIFACT_LANGUAGE`**: the ACs you rewrite and the rationale
of each log entry.

The **section headings** stay English (`## Acceptance Criteria`,
`## Ambiguity Resolution`, `## Technical Context`) — other skills and the validator read
them by name. **Identifiers** quoted from the code follow `IDENTIFIER_LANGUAGE`: quote
them exactly as the code spells them.

---

## Common Issues

The ones that **stop** a run. Every other failure mode is in
`references/troubleshooting.md`.

| Issue | Cause | Resolution |
|---|---|---|
| `spec.md` missing or without ACs | `/sdd-spec` never ran, or left the section empty | Stop: run `/sdd-spec spec-<number>` |
| `context.md` missing | The survey hasn't run | Stop: run `/sdd-scan spec-<number>` |
| The story is `tier: fast` | That tier has no clarification pass | Stop: raise it with `/sdd-route spec-<number>` if a clarification is wanted |
| You can't build the unknowns list | A spec that contradicts itself | Stop before researching: show the blocker; fix it with `/sdd-refine` or `/sdd-spec`, then re-run |
| The handoff grep is non-zero | PHASE I left a marker | Finish PHASE I; the run isn't complete |

---

## Example

A full worked run is in `references/example.md`. Read it when the shape of the output
is in doubt.
