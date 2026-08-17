---
name: clarify
description: >
  Turns a raw spec.md into a design-ready pair (spec.md + context.md) in three
  separated phases (Research → Plan → Implement): R gathers everything at once —
  ambiguities, authority sources, the story's assets folder, the affected module's
  inventory and code precedent via the code graph, plus the one thing only the
  developer knows; P decides every unknown with problem and terrain in full view,
  escalating only what no source can determine (scope, business intent, irreversible
  choices, rule conflicts); I writes the decision log, the precise ACs, and the
  context file. Use when the user says "/clarify spec-XXXX", "clarify story",
  "resolve ambiguities", "enrich the story", "analyze the story", "scan the context",
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

**The skill runs as two actors:**

- **The orchestrator** — this skill, running in the main agent. It owns the
  interactive gates: the item id, the component pre-resolution, the R5 and P4
  questions, the handoff grep, and the legacy `--ask` mode. It does not load the
  dossier or survey the code.
- **The `clarify-resolver` subagent** — the heavy context work, in two delegations.
  **RESOLVE** runs R+P (survey via the `CODE_SURVEY` port, decide every unknown,
  write the dossier to disk) and returns the questions to ask; **IMPLEMENT**
  receives the answers, reads the dossier, and writes `spec.md` and `context.md`.
  It cannot ask the user anything: questions are returned, never guessed.

It runs in **three strictly separated phases** (RPI). The separation is not
cosmetic — each phase needs the complete result of the previous one:

| Phase | Does | Does **not** do |
|---|---|---|
| **R — Research** | Gathers all evidence at once: ambiguities, authority sources, story assets, module inventory, code precedent, and what only the developer knows | Decides nothing, writes nothing |
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

Read `.agents/profile.yaml` at the root of the current project before anything else.
If it doesn't exist, tell the user to run `/bootstrap` and stop — without a profile you
don't know this project's conventions. The file is a YAML map of named blocks; a key
holding `null` is not configured, so use the fallback this skill declares for it —
never a guessed value.

Tools come from the profile's `ports` block: this skill names the capability it
needs — a port — and the block says which command, agent or MCP tool provides it
here. Run the first adapter that resolves; when one resolves and then fails, report
that failure instead of trying the next. A port with no usable adapter is **unbound**
— see the `Degrades` row below.

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
| `spec.md` exists | `[ -f work/active/spec-<number>/spec.md ]` | Stop: "I couldn't find `work/active/spec-<number>/spec.md`. Run `/spec spec-<number>` first." (a legacy `hu.md` counts — see step 2) |
| `spec.md` has acceptance criteria | the `## Acceptance Criteria` section holds at least one numbered AC | Stop: "`spec-<number>` has no acceptance criteria. There is nothing to clarify — run `/spec spec-<number>` again to write them." |
| The item isn't already clarified | `## Ambiguity Resolution` present, **zero** `[NEEDS CLARIFICATION]` markers left, and `context.md` exists | Don't re-run: offer `/scan` (refresh the context) or `/refine` (adjust ACs) — see orchestrator step 1 |

**Produces** — this is what `/design` looks for

- `spec.md` with **zero** `[NEEDS CLARIFICATION]` markers (the count in the handoff is
  the same gate `/design` re-runs before designing anything)
- an `## Ambiguity Resolution` section in `spec.md` with one entry per unknown —
  decision, rationale, source and confidence — including the searches that came back
  empty
- every AC verifiable as written, rephrased in EARS where it wasn't, and carrying one
  `#### Scenario:` per branch (happy path, error, empty, boundary) with the real
  values the decisions settled — an AC that is a single unconditional rule carries none
- `## Technical Context` in `spec.md` **only** if the developer declared constraints
  or debt in R5; omitted entirely otherwise
- `context.md` with the inventory `<STACK_REFS>/references/context-template.md` asks
  for, per affected <component>, and a **detected gaps** section that is always
  present even when empty

**Writes** — nothing outside this list; the files are written by the
`clarify-resolver` subagent, verified by the orchestrator

- `work/active/spec-<number>/spec.md` — the ACs, `## Ambiguity Resolution`,
  `## Technical Context`
- `work/active/spec-<number>/context.md` — regenerated whole on every run
- `work/active/spec-<number>/.clarify-dossier.md` — **transient** working file: written
  by the RESOLVE delegation, read and deleted by the IMPLEMENT delegation. Never a
  pipeline artifact.

Not `design.md` or `plan.md` (they don't exist yet at this stage), not the project's
source code or its living docs, not the story's `assets/` folder, and not the
authority sources (`docs/rules.md`, `CLAUDE.md`, `.agents/profile.yaml`) — those are
read-only inputs here.

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
the source hierarchy and recorded with its confidence. The `clarify-resolver` subagent
returns the candidates; the **orchestrator** asks them — at most 3 per run, in a
**single `AskUserQuestion` call** (P3/P4); above that the item's scope isn't ready and
the wrap-up says so. Two questions sit outside that budget: the affected <component>s
when the catalog can't identify them (R3 — pre-resolved by the orchestrator, it can't
be deferred), and R5's conditional free-text question about unwritten constraints.
With `--ask` there is no budget and no autonomy — every unknown is asked, one per
turn, and the whole run stays in the orchestrator.

**Degrades**

- `CODE_SURVEY` resolving to an adapter **without call paths** → the **inventory** is
  unaffected, every adapter returns it; but **precedent** queries are not delegated —
  those unknowns fall back to level 5-6 sources and are recorded as "no precedent"
  (R4 fallback). Say in the wrap-up which depth you got.
- `MODULE_ROOT` (stack block) inconclusive — its subdirectories don't map to
  <component>s with certainty → ask which <component>s the item affects (orchestrator
  step 2, R3).
- A missing authority source (`docs/rules.md`, `CLAUDE.md`) → continue without it;
  the hierarchy just drops one level (R2).

**Profile keys**

- `STORY_ID_PATTERN`, `WORKDIR_ACTIVE` — the item's id and workspace, written
  throughout this document as `spec-<number>` and `work/active/spec-<number>/`
- `WORKING_DIRECTORY` — the first `Requires` row
- `BASE_BRANCH` — the fresh-base check in R3
- `COMPONENT_TERM` and the stack block — the term for a deployable unit, and the code
  artifacts to locate per module
- `STACK_REFS` — `scan-guide.md` (progressive disclosure in R4) and
  `context-template.md` (the shape of `context.md` in I5). It is a list of packs,
  base → specific; each `<STACK_REFS>/<file>` is resolved across them most specific
  first, falling back to this skill's local `references/`
- `MODULE_ROOT` (stack block) — the folder where the code lives: its subdirectories
  are the <component>s, and each component's docs (`<component>/README.md`,
  `<component>/docs/`) feed R4
- `CODE_SURVEY` (port) — the
  survey and its fallback
- `ARTIFACT_LANGUAGE`, `OUTPUT_LANGUAGE`, `IDENTIFIER_LANGUAGE` — see "Output language"

---

## Orchestrator flow

Run these six steps. The drafting PHASEs below (R, P, I) are executed by the
`clarify-resolver` subagent, which reads this document — the orchestrator does not
perform them itself (except the legacy `--ask` mode, which stays fully in the
orchestrator).

### Step 1 — Gates and mode

Extract `spec-<number>` from the input. If absent, ask:
> "Which item? (e.g. spec-1933)"

- If the input includes `--ask` → run the legacy interactive mode (see
  `## Legacy mode` at the end) entirely in the orchestrator, and stop.
- Verify `spec.md` exists (a legacy `hu.md` counts — work on it in place):
  `[ -f work/active/spec-<number>/spec.md ]`; missing → stop per `Requires`.
- Verify the `## Acceptance Criteria` section holds at least one numbered AC;
  absent/empty → stop per `Requires`.
- If `## Ambiguity Resolution` already exists **and no markers remain** and
  `context.md` exists → everything was completed earlier. Announce it and offer
  `/scan` (refresh context) or `/refine` (adjust ACs) instead of re-running.
- If markers remain but the above state exists → note that the run will **append**
  entries to the existing section, not recreate it. If `context.md` exists → it gets
  regenerated at the end; say so in the wrap-up.

### Step 2 — Pre-resolve the components and check the base (R3)

1. Read `stack.MODULE_ROOT`, list its subdirectories as the <component>s (a `README.md`
   there is the catalog), and apply them against `spec.md`'s content. If they can't be
   identified with certainty, **ask now** (can't be deferred — without a component
   there's nothing to survey):
   > "Which <COMPONENT_TERM>(s) does this item affect? (e.g. `apps/ledger`)"
2. Verify (read-only) each component sits on a fresh base:
   `git -C <component> branch --show-current`, `git status --porcelain`,
   `git fetch --dry-run`. If any is off `BASE_BRANCH`, dirty or behind → **warn and
   continue** (you survey whatever is checked out); suggest `/prepare`.

Pass the resolved component list to the delegation.

### Step 3 — Delegate RESOLVE

Spawn the `clarify-resolver` subagent (`subagent_type: "clarify-resolver"` in
opencode, the same agent in Claude Code) in **RESOLVE** mode. Pass:

- the story id and the absolute path to `work/active/spec-<number>/`
- the resolved <component>s (from step 2)
- the absolute path to the project's `.agents/profile.yaml`
- a pointer that it must read `~/.agents/skills/sdd/clarify/SKILL.md` (this document)
  and follow the drafting PHASEs, and that any question it cannot ask is returned in
  its report — never silently guessed

It writes the dossier to disk and returns the escalations (max 3, with recommended
answers), the R5 question (if warranted), and its autonomous decisions. If it returns
`BLOCKED`, handle its blocker with the user before continuing.

### Step 4 — Ask the developer (one interaction round)

- If the report carries an **R5** question → ask it as plain free text (the unwritten
  constraints / technical debt question). Record the answer.
- If it carries **escalations** → ask them all in a **single `AskUserQuestion` call**
  (up to 3 questions together, never a loop). Each question uses the subagent's
  recommended answer as the first option, labelled " (Recommended)"; `header` max 12
  chars; the implicit "Other" covers custom answers — don't add one.

If the report lists no R5 and no escalations → skip this step entirely.

### Step 5 — Delegate IMPLEMENT

Spawn the `clarify-resolver` subagent in **IMPLEMENT** mode. Pass, in addition to the
step 3 inputs:

- the R5 free-text answer (or `none`/`-`)
- the selections for each escalation the user made

The `clarify-resolver` subagent's own prompt already encodes the drafting contract
(dossier handoff, R5 authority over the hierarchy, decision-log-first, EARS, context.md
template, report format) — do not repeat it, just supply the answers and read the
report.

### Step 6 — Handoff and review

1. Verify the handoff gate:
   ```bash
   grep -c 'NEEDS CLARIFICATION' work/active/spec-<number>/spec.md
   ```
   - Count `0` → "Ready to design. Once you've reviewed it, `/design spec-<number>`."
   - Markers remain → `<N>` markers left — re-run `/clarify spec-<number>`.
2. Render the review summary from the IMPLEMENT report (the low-confidence list first,
   then the decided-with-a-source group), add the step 2 base warning and the R4 depth
   note, and — if the escalation budget cut the list — the P3 warning.
3. Stop — do not start the design.

---

## Drafting PHASE R — Research

*Executed by the `clarify-resolver` subagent.*

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
`.agents/profile.yaml`. If any is missing, continue without it — it only lowers the
hierarchy by one level.

Consult `references/decision-authority.md` — source hierarchy, escalation test,
confidence levels, and cases calibrated against real project items. **Read it here,
once, not per unknown.**

### R2b — Read the story's assets (optional)

The story workspace may carry an `assets/` folder with material that grounds the
clarification — mockups, screenshots, wireframes, a signed contract, a data export.
Not every spec has one; check for it, and continue without comment when it's absent:

```bash
[ -d work/active/spec-<number>/assets ] && find work/active/spec-<number>/assets -type f || echo "NO_ASSETS"
```

When it exists:

- List every file recursively and **read each one** with Read — images and PDFs
  included, so mockups, screenshots and contracts are real evidence, not decoration.
- Treat them as **level-3 authority (`story assets`)** in `decision-authority.md`: the
  item's own concrete material outranks code precedent for *this* item's unknowns.
  `docs/rules.md` (level 1) and `CLAUDE.md`/`profile.yaml` (level 2) still beat it.
- An asset that **states** the answer (a signed contract, a finalized spec) is
  high-confidence evidence; one that only **suggests** it (a mockup, a sketch) is
  medium — the distinction is `decision-authority.md` §4.
- Note what you couldn't parse (an opaque binary, a scanned PDF with no extractable
  text) and carry that gap into the dossier — **never guess** what an unreadable
  asset says.
- Assets are **read-only evidence**: never modified, never copied wholesale into
  `context.md`. Only the conclusions drawn from them — cited as `assets/<file>` —
  go into the decision log.

### R3 — Components and fresh base

The **components** are pre-resolved by the orchestrator (orchestrator step 2) — use
the list you were given; the base warning, if any, is already in your inputs. You do
not ask, and you do not run git (you have no bash).

### R4 — Survey the code (one batch, in parallel)

Resolve the `CODE_SURVEY` port from the profile's `ports` block (the packs'
`ports.yaml` first — base → specific, a later one overriding — the profile on top;
first available adapter wins):

| Adapter | How |
|---|---|
| `mcp:<tool>` | call that MCP tool directly |
| `agent:<name>` | spawn it with the component name, the item's keywords, the instruction to read the component's docs and the `<STACK_REFS>` `scan-guide.md` (most specific pack wins), and to return verbatim citations |
| `inline` | survey with your own Read/Grep/Glob |

Fire **two classes of question** in the same response, in parallel:

| Class | Question | How many |
|---|---|---|
| **Inventory** | "What's in module M?" — for `context.md` | One per affected component |
| **Precedent** | "How did we solve X here before?" — for R1's unknowns | One per unknown that warrants it, cap **5** |

Only unknowns where "how did we solve this before?" is pertinent qualify for
*precedent* — lengths, error names, formats, column conventions, port patterns. A
business-intent unknown never qualifies.

With the results:

1. Identify the key files among those returned and read **only those** with Read,
   applying the progressive disclosure from `<STACK_REFS>/references/scan-guide.md`
   (if no pack in `STACK_REFS` provides it: `../scan/references/scan-guide.md`) — don't
   explore the whole tree.
2. Review each component's docs (`<component>/README.md`, `<component>/docs/` under
   `MODULE_ROOT`) and note the **documentation gaps** found.
3. Inventory everything `<STACK_REFS>/references/context-template.md` asks for, ready
   for phase I.

**What counts as precedent (sufficient evidence):**

| Result | Verdict |
|---|---|
| One clear analogous case, with verbatim source | **Precedent** — level 4, medium confidence |
| Several matching analogous cases | **Strong precedent** — level 4, medium-high confidence |
| Several cases that **contradict each other** | **No precedent, an inconsistency** — drop to level 5 and record it |
| No relevant results | **No precedent** — drop to level 5. That the repo has no convention here is information for `/design` |

**If the module doesn't show up** → it's just another unknown (not a blocker): note it
and carry it to P, where it gets escalated along with the rest.

#### Fallback — the survey came back without call paths

When `CODE_SURVEY` resolves to an adapter that returns an inventory but no call paths:

1. If the project has a graph adapter declared but no index on disk, suggest building
   it once — after that it stays auto-synced.
2. The **inventory** still arrives, one call per component, **in parallel**. When the
   adapter is an agent, the prompt must include: component name, item keywords, the
   instruction to read the component's docs, locate the module, and the `<STACK_REFS>`
   `scan-guide.md` — which **overrides the agent's own generic table**.
3. **Precedent** queries are not delegated as searches of their own: without a graph
   they're expensive. You lean on whatever verbatim citations the inventory already
   brought back; whatever remains uncovered is resolved with level 5-6 sources.

### R5 — The one thing only the developer knows (returned as a question)

There are two classes of information that live in no file and no code: **unwritten
constraints** and **known technical debt**. If either could change the resolution of
an unknown, return the free-text question in your report — the **orchestrator** asks
it. It is **conditional:** if every unknown was covered by formal sources or by the
survey, return `none`.

### Research dossier

At the close of R, write the dossier to `work/active/spec-<number>/.clarify-dossier.md`
(a transient working file): for each unknown its text, priority, consulted sources,
**what was found and what wasn't**, and — once P decides — its decision, rationale,
source and confidence; the story's assets (or their absence) and what each one settled
or suggested; the complete inventory per component (in `context-template.md` shape);
the documentation gaps; and the R5 answer if there was one. That dossier is the only
input to phase I.

---

## Drafting PHASE P — Plan

*Executed by the `clarify-resolver` subagent.*

**Phase rule: decide everything. Write nothing to disk except the dossier.**

### P1 — Classify every unknown

Walk the complete list (the ones from the ACs and the ones that surfaced during the
survey). For each, with the dossier in view:

1. **Search the hierarchy** for the source that **determines** the answer:
   `docs/rules.md` → `CLAUDE.md`/`profile.yaml` → story assets (R2b) → code precedent
   (R4) → formal standard → the item's own invariants. "Determines" = the answer
   follows from it, not merely that it's compatible with it.
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
and **say so explicitly** in your report:

> "<N> unknowns needed your judgment but the budget is 3. I resolved the others at low
> confidence — it may be worth reviewing this item's scope before moving on."

### P4 — Return the escalation batch

Put the selected ones in your report's "Escalations" list, each with a `question`, a
short `header` (max 12 chars), and 2-4 `options` with the recommended one **first**
(" (Recommended)") and its rationale in the `description`. The **orchestrator** asks
them all in a **single `AskUserQuestion` call** — never a one-per-turn loop.

### Decision table

At the close of P: per unknown → decision, rationale, source, confidence, and whether
it was autonomous or escalated — all written into the dossier.

---

## Drafting PHASE I — Implement

*Executed by the `clarify-resolver` subagent.*

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
  for a nonexistent resource. *Source:* HTTP convention (level 5).

- **AC-3 · autonomous (medium):** Max length of `Payee`? → **255**.
  *Rationale:* consistency with the analogous field that already exists.
  *Source:* `apps/finances/.../transaction.entity.ts:merchant` (level 4).

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

### I3b — Concrete scenarios (automatic, never asked)

EARS makes an AC unambiguous; a scenario makes it **executable**. Write one
`#### Scenario:` per branch under the AC it belongs to — with the real values the
decisions in I1 settled, never placeholders:

```markdown
### AC-2: An empty result is not an error
IF no zone matches the requested service type, THEN THE SYSTEM SHALL return 200 with
an empty array.

#### Scenario: No zone offers the requested service
- **WHEN** the client requests `GET /zones?serviceType=DRONE` and no zone offers it
- **THEN** the response is 200 with an empty `data` array
```

- **`**WHEN**` and `**THEN**` are both mandatory** when a scenario exists.
  `**GIVEN**` (precondition) and `**AND**` (extra step) are optional.
- **One per branch**: happy path, error, empty result, boundary. An AC that is a
  single unconditional rule (`THE SYSTEM SHALL ...`) needs no scenario — don't
  manufacture one.
- **Observable behavior only.** No class names, no framework decisions, no
  step-by-step execution. The test: if the implementation can change without
  changing what the scenario says, the scenario is right; if it can't, it's
  describing implementation and belongs in `design.md`.
- Every resolution recorded in `## Ambiguity Resolution` that changed a **value**
  (an HTTP code, a limit, a format) should be visible in a scenario. That's what
  makes a decision testable rather than merely written down.
- This is a wording task, like EARS: never asked, never escalated.

### I4 — Write `## Technical Context` (only what the human declared)

This `spec.md` section carries **exclusively what the developer declared in R5**:
technical constraints and relevant technical debt. Nothing inferred, nothing surveyed
from the code — that lives in `context.md`, which is its place.

Use `references/tech-context-template.md`. **If the developer declared nothing, omit
the whole section.**

### I5 — Write `context.md`

Pour the dossier's inventory into `<STACK_REFS>/references/context-template.md`
(if no pack in `STACK_REFS` provides it: `../scan/references/context-template.md`)
and save it at
`work/active/spec-<number>/context.md`.

Always include the **detected gaps** section: what wasn't found, the missing
documentation, and the repo inconsistencies found in R4. `/design` and `/plan` depend
on that list as much as on the inventory.

### I6 — Batch review (returned to the orchestrator)

Include in your report the review list, ordered by **ascending confidence** — the
shaky ones on top, which is where the eye needs to land. The orchestrator renders it.

### Handoff

Your report states the `[NEEDS CLARIFICATION]` marker count remaining. The
orchestrator re-runs the grep itself (`grep -c 'NEEDS CLARIFICATION'
work/active/spec-<number>/spec.md`) before closing — count `0` → "Ready to design",
else re-run `/clarify`.

Delete the dossier file (`work/active/spec-<number>/.clarify-dossier.md`) when the
artifacts are written.

---

## Legacy mode (`--ask`)

Runs entirely in the **orchestrator** — no subagent. With `--ask` there is no RPI
separation: every unknown is resolved with `AskUserQuestion`, one at a time, in a
loop, with no budget and no auto-resolution; EARS is offered rather than applied; and
the technical context is surveyed by asking (component, artifacts, patterns,
constraints, integrations, technical debt), one per turn. The code inventory and
`context.md` are produced all the same.

Useful when the item touches terrain where you don't want anything decided out of your
sight — typically a new domain or strong contractual implications.

---

## Output language
**Conversational output** follows `~/.agents/references/chat-conventions.md` - the six blocks (announce, progress, question, summary, stop, handoff).

**Artifact prose follows `ARTIFACT_LANGUAGE`** (profile, language block — falls back to
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
| `CODE_SURVEY` resolving to `inline` | Project that delegates nothing | The subagent surveys inline with Read/Grep, same scope; note it in the wrap-up |
| Component not identifiable | Item with no clear keywords | Ask in orchestrator step 2 — it can't be deferred, without a component there's nothing to survey |
| Module not found in the component | New module or under a different name | Not a blocker: it's just another unknown, escalated in P with the rest |
| A new doubt appears in phase I | Phase R was incomplete | Resolve it with the hierarchy and mark it low confidence; don't open questions in I |
| The graph returns contradictory results | The repo solved the same thing two ways | Not a precedent: drop to level 5 and record the inconsistency in `context.md` |
| More than 3 unknowns qualify for escalation | Item with a lot of open product decisions | Escalate the 3 with the highest impact and warn that the scope may not be ready |
| `CODE_SURVEY` without call paths | Project without an indexed graph | The **inventory** arrives anyway; **precedents** are resolved with levels 4-5 |
| Component off `BASE_BRANCH` | Base not prepared | Warn and continue — you survey whatever is checked out; suggest `/prepare` |
| Only `context.md` needs refreshing | The code changed, the ACs didn't | Use `/scan spec-<number>` — don't re-clarify |
| `assets/` has files that can't be read | Opaque binary, scanned PDF with no extractable text | List them in the wrap-up and carry the gap to the dossier — never guess what an unreadable asset says |
| The user reverts several decisions in a row | Rubric miscalibrated for the domain | Apply the changes and suggest `--ask` for the next items in that area |
| The RESOLVE delegation reports `BLOCKED` | It cannot even build the unknowns list (missing context, contradictory spec) | Show the blocker to the user; fix the input (`/refine`/`/spec`) and re-delegate |
| The handoff grep is non-zero | IMPLEMENT left a resolved marker in place | Stop: the run isn't complete — re-run `/clarify spec-<number>` |

---

## Example

**Input:** `/clarify spec-1933`

**Orchestrator:**
- Gates OK; `apps/ledger` identified from `MODULE_ROOT` + spec keywords; clean `develop`.

**RESOLVE delegation (clarify-resolver):**
- R1: 3 unknowns — AC-2 with no HTTP code, "service type" undefined, multi-value
  filter with no semantics (AND/OR).
- R2: loads `rules.md`, `CLAUDE.md`, the profile and the rubric.
- R4: **three queries in a single batch** — one inventory (`apps/ledger` zones module)
  and two precedent (`"service type enum"`, `"list empty response"`). The first
  precedent query finds `ServiceType`; the second returns nothing.
- P: AC-2 → level 5 REST convention (autonomous, high: 200 with empty array);
  AC-1 "service type" → level 4 `ServiceType` (autonomous, medium); AC-1 AND/OR →
  nothing determines it, changes what the operator sees → **escalation** (business
  intent).
- Returns: 1 escalation with "OR" recommended, no R5 question. Writes the dossier.

**Orchestrator:** one `AskUserQuestion` call. The user picks OR.

**IMPLEMENT delegation (clarify-resolver):** reads the dossier + the answer; writes
the decision log first, then the ACs, EARS on AC-1, no `Technical Context` (the
developer declared no constraints), `context.md` with the inventoried module and 1
documentation gap; deletes the dossier.

**Orchestrator:** `grep -c 'NEEDS CLARIFICATION'` → `0`. Review summary:
> Clarified spec-1933: 2 autonomous decisions, 1 consulted, 1 AC in EARS.
> Survey: 1 component, 3 graph queries, 1 precedent, 1 without precedent.
> Ready to design. Once you've reviewed it, `/design spec-1933`.

**Before (two skills):** `/clarify` with 4 looping questions and a narrow probe, then
`/scan` re-exploring the same module with its own round of unknowns.
**Now:** one pass, 3 parallel queries, 1 question, two artifacts.
