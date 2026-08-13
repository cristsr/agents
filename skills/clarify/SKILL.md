---
name: clarify
description: >
  Turns a raw spec.md into a design-ready pair (spec.md + context.md) in three
  separated phases (Research → Plan → Implement): R gathers everything at once —
  ambiguities, authority sources, the affected module's inventory and code
  precedent via the code graph, plus the one thing only the developer knows; P
  decides every unknown with problem and terrain in full view, escalating only
  what no source can determine (scope, business intent, irreversible choices,
  rule conflicts); I writes the decision log, the precise ACs, and the context
  file. Use when the user says "/clarify spec-XXXX", "clarify story", "resolve
  ambiguities", "enrich the story", "analyze the story", "scan the context",
  "survey the module", or has created spec.md with /spec. Add "--ask" to force
  the legacy question-by-question mode. Do NOT use to refresh context.md alone
  after a code change (use /scan), to correct artifacts once design/plan exist
  (use /refine), or to create the item (use /spec).
---

# clarify

## Overview

Turns a raw `spec.md` into the design-ready pair — a precise `spec.md` plus a
`context.md` holding the surveyed terrain — resolving on its own everything that has
a determinable answer and consulting only what genuinely belongs to the developer.

It runs in **three strictly separated phases** (RPI). The separation is not
cosmetic — each phase needs the complete result of the previous one:

| Phase | Does | Does **not** do |
|---|---|---|
| **R — Research** | Gathers all evidence at once: ambiguities, authority sources, module inventory, code precedent, and what only the developer knows | Decides nothing, writes nothing |
| **P — Plan** | Decides **every** unknown with the problem and the terrain in view, and escalates in a single batch what no source determines | Writes nothing to disk |
| **I — Implement** | Writes the decision log, the precise ACs, and `context.md` | Decides nothing new |

**Why a single research pass:**
- A decision about an AC may rest on a port the inventory just found. Splitting the
  survey from the decision wastes that evidence.
- Graph queries — inventory and precedent — are fired **in the same batch**, in
  parallel.
- The escalation budget is applied against the **complete** list of unknowns: the ones
  coming from the ACs and the ones coming from the code, together and prioritized once.
- A constraint the developer mentions ("don't touch X's contract") arrives **before**
  deciding, not after the files have been written.

The principle: **a question the model can answer with grounding is not a question,
it's paperwork.** If you can write the why, don't ask — decide and leave the why
written down.

**Announce at start:** "Clarifying spec-<number> — I'll survey, decide, and only ask you what I can't resolve."

**Output:**
- `work/active/spec-<number>/spec.md` (modified in place)
- `work/active/spec-<number>/context.md` (new)

> **`/scan` still exists** as the refresh skill: it regenerates only `context.md`
> when the code changed, without re-clarifying anything.

---

## Project profile (read first, always)

Read `.agents/profile.md` at the root of the current project before anything else. If it
doesn't exist, tell the user to copy `~/.agents/sdd-profile.template.md` to
`.agents/profile.md` and stop — without a profile you don't know this project's
conventions.

Any path, branch name, command or tool shown in this document is an example
resolution; the profile's value wins. The keys this skill reads are listed under
**Profile keys** in the `Contract` below.

---

## Contract

What this skill needs, what it guarantees to `/design`, and what it may not do.
**Check every `Requires` row before any other work** — a failed precondition stops
the run at the start, not after the survey has been paid for.

**Requires**

| Condition | Check | If it fails |
|---|---|---|
| You are in the project's working directory | `pwd` == `WORKING_DIRECTORY` (absolute path, from the profile) | `cd` there before running anything |
| An item id was given | the input carries an id matching `STORY_ID_PATTERN` | Ask: "Which item? (e.g. spec-1933)" |
| `spec.md` exists | `[ -f work/active/spec-<number>/spec.md ]` | Stop: "I couldn't find `work/active/spec-<number>/spec.md`. Run `/spec spec-<number>` first." (a legacy `hu.md` counts — see Step 2) |
| `spec.md` has acceptance criteria | the `## Acceptance Criteria` section holds at least one numbered AC | Stop: "`spec-<number>` has no acceptance criteria. There is nothing to clarify — run `/spec spec-<number>` again to write them." |
| The item isn't already clarified | `## Ambiguity Resolution` present, **zero** `[NEEDS CLARIFICATION]` markers left, and `context.md` exists | Don't re-run: offer `/scan` (refresh the context) or `/refine` (adjust ACs) — see Step 4 |

**Produces** — this is what `/design` looks for

- `spec.md` with **zero** `[NEEDS CLARIFICATION]` markers (the count in "Handoff" is
  the same gate `/design` re-runs before designing anything)
- an `## Ambiguity Resolution` section in `spec.md` with one entry per unknown —
  decision, rationale, source and confidence — including the searches that came back
  empty
- every AC verifiable as written, rephrased in EARS where it wasn't
- `## Technical Context` in `spec.md` **only** if the developer declared constraints
  or debt in R5; omitted entirely otherwise
- `context.md` with the inventory `<STACK_REFS>/references/context-template.md` asks
  for, per affected <component>, and a **detected gaps** section that is always
  present even when empty

**Writes** — nothing outside this list

- `work/active/spec-<number>/spec.md` — the ACs, `## Ambiguity Resolution`,
  `## Technical Context`
- `work/active/spec-<number>/context.md` — regenerated whole on every run

Not `design.md` or `plan.md` (they don't exist yet at this stage), not the project's
source code or its living docs, and not the authority sources (`docs/rules.md`,
`CLAUDE.md`, `.agents/profile.md`) — those are read-only inputs here.

**Never**

- **Allowed (read-only git):** `git branch --show-current`, `git status --porcelain`,
  `git fetch --dry-run`.
- **Forbidden:** `git checkout`, `git pull`, `git add`, `git commit`, `git push` and
  any other state-changing git command. A stale base is warned about and surveyed as
  it stands — freshening it is `/prepare`'s job (R3).
- Never delete a `[NEEDS CLARIFICATION]` marker without writing its decision into
  `## Ambiguity Resolution`. An unlogged resolution is indistinguishable from a guess.

**Escalates** — the four classes only: **scope**, **business intent**,
**irreversible choices**, and **rule conflicts**. Everything else is decided against
the source hierarchy and recorded with its confidence. They are asked in a **single
`AskUserQuestion` call, at most 3 per run** (P3/P4); above that the item's scope
isn't ready and the wrap-up says so. Two questions sit outside that batch and outside
the budget: the affected <component>s when the catalog can't identify them (R3 — it
can't be deferred, there is nothing to survey without one), and R5's conditional
free-text question about unwritten constraints. With `--ask` there is no budget and
no autonomy — every unknown is asked, one per turn.

**Degrades**

- `CODEGRAPH` at `no` (or no indexed graph on disk) → the **inventory** goes to the
  `EXPLORER_SUBAGENT` (default `code-explorer`) with an explicit `model:` =
  `EXPLORER_MODEL`, one call per <component>, in parallel; **precedent** queries are
  not delegated — those unknowns fall back to level 4-5 sources and are recorded as
  "no precedent" (R4 fallback).
- `EXPLORER_SUBAGENT` at `none`, or a host with no subagents → survey inline with
  Read/Grep, same scope, and say so in the wrap-up.
- `DOCS_COMPONENTS_INDEX` missing or inconclusive → ask which <component>s the item
  affects (R3).
- A missing authority source (`docs/rules.md`, `CLAUDE.md`) → continue without it;
  the hierarchy just drops one level (R2).

**Profile keys**

- `STORY_ID_PATTERN`, `WORKDIR_ACTIVE` — the item's id and workspace, written
  throughout this document as `spec-<number>` and `work/active/spec-<number>/`
- `WORKING_DIRECTORY` — the first `Requires` row
- `BASE_BRANCH` — the fresh-base check in R3
- `COMPONENT_TERM` and section 7 — the term for a deployable unit, and the code
  artifacts to locate per module
- `STACK_REFS` — `scan-guide.md` (progressive disclosure in R4) and
  `context-template.md` (the shape of `context.md` in I5)
- `DOCS_COMPONENTS_INDEX`, `DOCS_COMPONENT_README`, `DOCS_COMPONENT_ARCH`
  (section 8) — identifying the affected <component>s and reading their docs (R3, R4)
- `CODEGRAPH` (section 10), `EXPLORER_SUBAGENT` / `EXPLORER_MODEL` (section 9) — the
  survey and its fallback
- `ARTIFACT_LANGUAGE`, `OUTPUT_LANGUAGE`, `IDENTIFIER_LANGUAGE` — see "Output language"

---

## Prerequisites

### Step 1 — Extract the item id and the mode

Extract `spec-<number>` from the input. If absent, ask:
> "Which item? (e.g. spec-1933)"

**Mode:** autonomous RPI by default. If the input includes `--ask`, run in legacy
interactive mode (see `## Legacy mode` at the end).

### Step 2 — Verify spec.md exists

```bash
[ -f work/active/spec-<number>/spec.md ] && echo "OK" || echo "MISSING"
```

Missing → stop, per the `Requires` row.

> **Legacy items:** if there's an `hu.md` instead of a `spec.md`, it's the same
> artifact under its former name — work on it in place, without renaming it.

### Step 3 — Read spec.md

Read the whole file. Extract and keep in memory:
- `type` from the frontmatter (determines the framing block and the tone of the ACs)
- Title and framing block
- Complete, numbered list of ACs
- Business Rules if present
- **`[NEEDS CLARIFICATION: ...]` markers** inserted by `/spec`

If `## Acceptance Criteria` is absent or empty, stop per the `Requires` row: the ACs
are the only contract with the rest of the pipeline, and writing them is `/spec`'s
job, not this skill's.

### Step 4 — Verify existing state

- If `## Ambiguity Resolution` already exists **and no markers remain** and
  `context.md` exists → everything was completed earlier. Announce it and offer
  `/scan` (refresh context) or `/refine` (adjust ACs) instead of re-running.
- If markers remain → run the full RPI cycle over the remaining ones only,
  **appending** entries to the existing section (don't recreate it).
- If `context.md` already exists → it gets regenerated at the end; say so in the
  wrap-up.

---

# PHASE R — Research

**Phase rule: collect evidence. Don't decide, don't write.**

If at any point you feel tempted to resolve an unknown, note the evidence and move
on — resolution belongs to phase P, with everything in view.

### R1 — Build the complete list of unknowns

Combine two sources and deduplicate:

**(a) Markers from `/spec`** — every `[NEEDS CLARIFICATION: ...]`, each with its
question text.

**(b) Self-check of every AC** against the checklist (evaluate internally, don't show
the raw check):

| Dimension | Question | What to look for |
|---|---|---|
| **Testability** | Is it verifiable as written? | "reasonable", "adequate", "should", "fast" with no objective criterion |
| **Testability** | Does it use business terms with no clear definition? | "active", "current", "eligible" with no explicit rule |
| **Happy path** | Does it define output format / response code / resulting state? | AC that describes "what" but not "what the successful response looks like" |
| **Edge cases** | Does it cover the boundaries? (empty, zero, maximum, duplicate, concurrency) | Boundary case implied by the framing or the Rules with no associated AC |
| **Errors/failures** | Does it define behavior on invalid input, missing input, or a dependency failure? | AC silent about validation, authorization, or external/DB error |
| **Inconsistencies** | Does it contradict another AC or a Business Rule? | Two ACs that overlap, or an AC that violates a stated rule |
| **Coverage** | Is there behavior described in prose with no AC capturing it? | Mentioned requirement that never became a verifiable criterion |

Sort by impact (this sets the resolution order in P, it is not a cut):
1. **Inconsistencies/contradictions** between ACs or rules
2. Gaps that **block the design of DTOs or business rules**
3. Behavior on **errors and edge cases**
4. Wording testability

### R2 — Load the static authority sources

Read once, before touching the code: `docs/rules.md`, `CLAUDE.md`,
`.agents/profile.md`. If any is missing, continue without it — it only lowers the
hierarchy by one level.

Consult `references/decision-authority.md` — source hierarchy, escalation test,
confidence levels, and cases calibrated against real project items. **Read it here,
once, not per unknown.**

### R3 — Identify affected components and verify a fresh base

1. Read the component catalog (`DOCS_COMPONENTS_INDEX`) and apply it against the
   item's content. List **all** affected components — there may be more than one.

   If they can't be identified with certainty, **ask now** (this can't be deferred:
   without a component there's nothing to survey):
   > "Which <COMPONENT_TERM>(s) does this item affect? (e.g. `apps/ledger`)"

2. Verify (read-only, never mutate git) that each component sits on a fresh base:

```bash
git -C <component> branch --show-current
git -C <component> status --porcelain
git -C <component> fetch --dry-run 2>&1 | head -1
```

If any is not on `BASE_BRANCH`, has uncommitted changes, or is behind the remote →
**warn and continue** (you survey whatever is checked out):
> "`<component>` is not on an up-to-date `<BASE_BRANCH>`. I'll survey the code as it
> stands; if you want a fresh base, run `/prepare` and re-run this."

### R4 — Survey the code (one batch, in parallel)

A single batch of graph queries, with **two classes of question**:

| Class | Question | How many |
|---|---|---|
| **Inventory** | "What's in module M?" — for `context.md` | One per affected component |
| **Precedent** | "How did we solve X here before?" — for R1's unknowns | One per unknown that warrants it, cap **5** |

**Fire them all in the same response**, in parallel. Only unknowns where "how did we
solve this before?" is pertinent qualify for *precedent* — lengths, error names,
formats, column conventions, port patterns. A business-intent unknown never qualifies.

With `CODEGRAPH` at `yes`, one graph query (`codegraph_explore`) returns: symbols with
verbatim source grouped by file, call paths, blast radius (who depends on what and
which tests cover it), and framework routes. If it isn't, see the fallback below.

With the results:

1. Identify the key files among those returned and read **only those** with Read,
   applying the progressive disclosure from `<STACK_REFS>/references/scan-guide.md`
   (default: `../scan/references/scan-guide.md`) — don't explore the whole tree.
2. Review each component's `DOCS_COMPONENT_README` / `DOCS_COMPONENT_ARCH` and note
   the **documentation gaps** found.
3. Inventory everything `<STACK_REFS>/references/context-template.md` asks for, ready
   for phase I.

**What counts as precedent (sufficient evidence):**

| Result | Verdict |
|---|---|
| One clear analogous case, with verbatim source | **Precedent** — level 3, medium confidence |
| Several matching analogous cases | **Strong precedent** — level 3, medium-high confidence |
| Several cases that **contradict each other** | **No precedent, an inconsistency** — drop to level 4 and record it |
| No relevant results | **No precedent** — drop to level 4. That the repo has no convention here is information for `/design` |

**If the module doesn't show up** → it's just another unknown (not a blocker): note it
and carry it to P, where it gets escalated along with the rest.

#### Fallback — CodeGraph unavailable

If `CODEGRAPH` is `no`, or no indexed graph exists on disk (`.codegraph/`):

1. Suggest initializing it once (`codegraph init`) — after that it stays auto-synced.
2. Meanwhile, delegate the **inventory** to the `EXPLORER_SUBAGENT` subagent
   (default `code-explorer`), one call per component, **in parallel**, passing an
   explicit `model:` = `EXPLORER_MODEL`. If `EXPLORER_SUBAGENT` is `none` — or the
   host has no subagents — survey inline with Read/Grep instead, same scope, and note
   it in the wrap-up. The prompt must include: component name,
   item keywords, the instruction to read the component's docs, locate the module,
   and the pack's `scan-guide.md` — which **overrides the agent's own generic table**.

   **Explicitly ask for verbatim citations** (`<path>:<line>` + snippet) of
   conventions that could serve as precedent: column lengths, error types, names, port
   signatures. Without those, phase P can't cite a level-3 source and those unknowns
   drop to level 4.
3. **Precedent** queries are not delegated as searches of their own: without a graph
   they're expensive. You lean on whatever verbatim citations the inventory already
   brought back; whatever remains uncovered is resolved with level 4-5 sources.

### R5 — Ask the one thing only the developer knows (conditional)

There are two classes of information that live in no file and no code: **unwritten
constraints** and **known technical debt**. If either could change the resolution of
an unknown, ask **now** — before deciding.

Ask in plain text (free-form answer, not `AskUserQuestion`):

> "I've surveyed <component(s)>. Is there anything **not written down anywhere** that
> I should account for? Constraints ("don't touch table X", "don't break the current
> contract"), technical debt in the affected area, or integrations that don't exist in
> the code yet.
>
> If there's nothing, answer `-` and I'll continue."

**It is conditional:** if every unknown was covered by formal sources or by the
survey, **ask nothing** and go straight to P.

### Research dossier

At the close of R, hold in memory: for each unknown its text, priority, consulted
sources and **what was found and what wasn't**; the complete inventory per component;
the documentation gaps; and the developer's answer if there was one. That dossier is
the only input to phase P.

---

# PHASE P — Plan

**Phase rule: decide everything. Write nothing to disk.**

### P1 — Classify every unknown

Walk the complete list (the ones from the ACs and the ones that surfaced during the
survey). For each, with the dossier in view:

1. **Search the hierarchy** for the source that **determines** the answer:
   `docs/rules.md` → `CLAUDE.md`/`profile.md` → code precedent (R4) → formal
   standard → the item's own invariants. "Determines" = the answer follows from it,
   not merely that it's compatible with it.
2. **If one determines it** → autonomous decision; record decision, rationale, source
   and confidence (high/medium/low).
3. **If none determines it** → apply the escalation test: does it fall under **scope**,
   **business intent**, **irreversibility** or **rule conflict**? If so, mark it as an
   *escalation candidate*. If not, decide with the best alternative and mark confidence
   **low**.

**Golden rule:** if you can write the rationale in one sentence, don't ask. The
question is justified when the rationale **depends on a preference that isn't yours**.

### P2 — Check interdependencies

With every decision on the table, review the set before touching anything:

- **Does any decision contradict another?** (e.g. AC-2 resolved with 200 and AC-5 with
  404 for the same case). Resolve it here, not in the file.
- **Does any decision make another unknown irrelevant?** Discard it with a note.
- **Does any decision clash with the surveyed terrain?** (e.g. you decided to reuse a
  port the inventory shows with a different signature). Fix the decision, not the
  inventory.
- **Would any low-confidence one be pinned down by a high-confidence one?** Align them.

This step is impossible in a per-unknown loop — it's the main reason P is separate.

### P3 — Select what to escalate

Over the **complete** candidate list, pick the highest-impact ones.

**Budget: at most 3 escalations per run.** It's not a blind cut, it's a signal: if
**more than 3** unknowns are about product intent or scope, the item isn't ready to be
clarified. Escalate the 3 with the highest impact, resolve the rest at low confidence,
and **say so explicitly in the wrap-up**:

> "<N> unknowns needed your judgment but the budget is 3. I resolved the others at low
> confidence — it may be worth reviewing this item's scope before moving on."

### P4 — Escalate in a single call

The selected ones are asked via `AskUserQuestion`, **all in a single call** (up to 3
questions together). Never a one-per-turn loop.

For each question:
- `question`: the unknown stated directly, mentioning why it couldn't be resolved alone.
- `header`: short label (max 12 characters) identifying the AC (e.g. "AC-2 scope").
- `options`: 2-4 alternatives. The recommended one **first**, with `" (Recommended)"`
  at the end of the `label`; its `description` carries the rationale in 1-2 sentences.
- The implicit "Other" already covers custom answers — don't add an "Other" option.

### Decision table

At the close of P: per unknown → decision, rationale, source, confidence, and whether
it was autonomous or consulted. **Nothing has been written yet.**

---

# PHASE I — Implement

**Phase rule: apply what was decided. Decide nothing new.**

If a doubt shows up here that wasn't in the table, R was incomplete: resolve it with
the hierarchy and record it at low confidence — don't open a new question this late.

### I1 — Write the decision log first

**Write `## Ambiguity Resolution` into `spec.md` before anything else.** If the run is
interrupted, what survives is the complete reasoning — which is the expensive part to
reconstruct; reapplying edits is trivial.

```markdown
## Ambiguity Resolution

- **AC-2 · autonomous (high):** Which HTTP code for an empty list? → **200 with an
  empty array**.
  *Rationale:* it's the REST standard for collections with no results; 404 is reserved
  for a nonexistent resource. *Source:* HTTP convention (level 4).

- **AC-3 · autonomous (medium):** Max length of `Payee`? → **255**.
  *Rationale:* consistency with the analogous field that already exists.
  *Source:* `apps/finances/.../transaction.entity.ts:merchant` (level 3).

- **AC-4 · consulted:** `dryRun` on every write command or only where the case is
  clear? → **On all of them, no exceptions** (developer's decision).
  *Why it was consulted:* it defines the item's cross-cutting surface — scope category.

- **AC-6 · autonomous (low):** Format of the batch identifier? → **ULID**.
  *Rationale:* time-sortable, no coordination required.
  *No precedent:* the repo has no batch-identifier convention yet.
```

Also record the searches that came back **empty** and the inconsistencies found in
R4 — they're signals for `/design`.

### I2 — Apply the resolutions to the ACs

1. Edit each AC in `spec.md` with the precise wording.
2. **Remove the `[NEEDS CLARIFICATION: ...]` marker** from that line if it came from
   one. No resolved marker may remain in the file.

### I3 — EARS rephrasing (automatic, never asked)

When an AC fails testability, rewrite it in **EARS** notation — without asking. It's
a wording reformulation: it doesn't change behavior, there's no decision to delegate.

| Pattern | Form | Use |
|---|---|---|
| Ubiquitous | `THE SYSTEM SHALL <response>` | Always-active rule |
| Event-driven | `WHEN <trigger>, THE SYSTEM SHALL <response>` | Fired by an event |
| State-driven | `WHILE <state>, THE SYSTEM SHALL <response>` | Behavior during a state |
| Unwanted | `IF <error condition>, THEN THE SYSTEM SHALL <response>` | Error/edge-case handling |
| Optional | `WHERE <feature present>, THE SYSTEM SHALL <response>` | Conditional on a feature |

- **Preserve the original text** as a `> Original: "<text>"` line underneath.
- Use several EARS lines if the AC has both a happy path and an error case.
- **Never** reformulate an AC that is already clear and testable.

### I4 — Write `## Technical Context` (only what the human declared)

This `spec.md` section carries **exclusively what the developer declared in R5**:
technical constraints and relevant technical debt. Nothing inferred, nothing surveyed
from the code — that lives in `context.md`, which is its place.

Use `references/tech-context-template.md`. **If the developer declared nothing, omit
the whole section.**

### I5 — Write `context.md`

Pour R4's inventory into `<STACK_REFS>/references/context-template.md` (default:
`../scan/references/context-template.md`) and save it at
`work/active/spec-<number>/context.md`.

Always include the **detected gaps** section: what wasn't found, the missing
documentation, and the repo inconsistencies found in R4. `/design` and `/plan` depend
on that list as much as on the inventory.

### I6 — Batch review

Show in the chat (not in the files), ordered by **ascending confidence** — the shaky
ones on top, which is where the eye needs to land:

```
Clarified spec-<number>: <N> autonomous decisions, <M> consulted, <K> ACs in EARS.
Survey: <C> component(s), <Q> graph queries, <S> precedents, <T> without precedent.

⚠ Review these carefully (low confidence):
  1. AC-6 — <question> → <decision>  ·  no precedent in the repo

Decided with a firm source:
  2. AC-2 — <question> → <decision>  ·  <source>
  3. AC-3 — <question> → <decision>  ·  <source>

context.md: <n> modules inventoried, <g> gaps detected.

To revert any of them: "change 2 to <other decision>".
```

- If there were no low-confidence ones, omit the `⚠` group.
- If the budget cut escalations, include P3's warning.

### Handoff

```bash
grep -c 'NEEDS CLARIFICATION' work/active/spec-<number>/spec.md
```

- Count `0` → "Ready to design. Once you've reviewed it, `/design spec-<number>`."
- Markers remain → "<N> markers left. `/design` won't proceed until they're resolved —
  re-run `/clarify spec-<number>`."

Stop — do not start the design.

---

## Legacy mode (`--ask`)

With `--ask` there is no RPI separation: every unknown is resolved with
`AskUserQuestion`, one at a time, in a loop, with no budget and no auto-resolution;
EARS is offered rather than applied; and the technical context is surveyed by asking
(component, artifacts, patterns, constraints, integrations, technical debt), one per
turn. The code inventory and `context.md` are produced all the same.

Useful when the item touches terrain where you don't want anything decided out of your
sight — typically a new domain or strong contractual implications.

---

## Output language

**Artifact prose follows `ARTIFACT_LANGUAGE`** (profile, section 5 — falls back to
`OUTPUT_LANGUAGE` if the project doesn't declare it): the ACs you rewrite in
`spec.md`, the rationale of each entry in the decision log, and `context.md`'s
inventory prose. Never translate them to English on your own.

Two things stay in English regardless of that key: the **section headings**
(`## Acceptance Criteria`, `## Ambiguity Resolution`, `## Technical Context` — other
skills read them by name) and the **identifiers** quoted from the code — paths,
classes, fields, endpoints (`IDENTIFIER_LANGUAGE`).

**Chat interaction follows the user's language** (`OUTPUT_LANGUAGE` in the profile).
The message samples in this document are written in English; render them in the
user's language when that differs.

---

## Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| spec.md doesn't exist | `/spec` never ran | STOP: tell the user to run `/spec spec-<number>` first |
| spec.md exists but has no ACs | `/spec` left the section empty | STOP: the ACs are the contract with the rest of the pipeline — run `/spec spec-<number>` again to write them |
| `EXPLORER_SUBAGENT: none` and no graph | Project that delegates nothing | Survey inline with Read/Grep, same scope; note it in the wrap-up |
| Component not identifiable | Item with no clear keywords | Ask in R3 — it can't be deferred, without a component there's nothing to survey |
| Module not found in the component | New module or under a different name | Not a blocker: it's just another unknown, escalated in P with the rest |
| A new doubt appears in phase I | Phase R was incomplete | Resolve it with the hierarchy and mark it low confidence; don't open questions in I |
| The graph returns contradictory results | The repo solved the same thing two ways | Not a precedent: drop to level 4 and record the inconsistency in `context.md` |
| More than 3 unknowns qualify for escalation | Item with a lot of open product decisions | Escalate the 3 with the highest impact and warn that the scope may not be ready |
| `CODEGRAPH: no` in the profile | Project without an indexed graph | Delegate the **inventory** to the explorer subagent; **precedents** are resolved with levels 4-5 |
| Component off `BASE_BRANCH` | Base not prepared | Warn and continue — you survey whatever is checked out; suggest `/prepare` |
| Only `context.md` needs refreshing | The code changed, the ACs didn't | Use `/scan spec-<number>` — don't re-clarify |
| The user reverts several decisions in a row | Rubric miscalibrated for the domain | Apply the changes and suggest `--ask` for the next items in that area |

---

## Example

**Input:** `/clarify spec-1933`

**Phase R:**
- R1: 3 unknowns — AC-2 with no HTTP code, "service type" undefined, multi-value
  filter with no semantics (AND/OR).
- R2: loads `rules.md`, `CLAUDE.md`, the profile and the rubric.
- R3: identifies `apps/ledger`; it's on a clean `develop`.
- R4: **three queries in a single batch** — one inventory (`apps/ledger` zones module)
  and two precedent (`"service type enum"`, `"list empty response"`). The first
  precedent query finds `ServiceType`; the second returns nothing.
- R5: all three unknowns were covered by formal sources or are business ones →
  **nothing is asked**.

**Phase P:**

| Unknown | Source | Result |
|---|---|---|
| AC-2 HTTP code | Level 4 — REST convention | Autonomous (high): 200 with an empty array |
| AC-1 "service type" | Level 3 — `ServiceType` found in R4 | Autonomous (medium): the enum's values |
| AC-1 AND or OR | Nothing determines it; it changes what the operator sees | **Escalate** — business intent |

- P2: no interdependencies. P3: 1 candidate, within budget.
- P4: one `AskUserQuestion` call. The user picks OR.

**Phase I:** log first, then ACs, EARS on AC-1, no `Technical Context` (the developer
declared no constraints), `context.md` with the inventoried module and 1 documentation
gap, and the closing block.

**Before (two skills):** `/clarify` with 4 looping questions and a narrow probe, then
`/scan` re-exploring the same module with its own round of unknowns.
**Now:** one pass, 3 parallel queries, 1 question, two artifacts.
