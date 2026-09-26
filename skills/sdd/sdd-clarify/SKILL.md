---
name: sdd-clarify
description: >
  Turns a raw spec.md into a design-ready pair (spec.md + context.md) in three
  separated phases (Research → Plan → Implement): it surveys the ambiguities, the
  authority sources, the story's assets and the affected module's code precedent,
  decides every unknown with problem and terrain in view, escalates only what no
  source can determine, and writes the decision log, the precise ACs and the context
  file. It also resolves the story's build_mode and never picks the relaxed carril
  without asking.
  Use when the user says "/sdd-clarify spec-XXXX", "clarify story", "resolve
  ambiguities", "enrich the story", "analyze the story", "survey the module",
  "aclara la historia", "resuelve las ambigüedades", or has created spec.md with
  /sdd-spec. Add "--ask" for the legacy question-by-question mode. Do NOT use to
  refresh context.md alone after a code change (use /sdd-scan), to correct artifacts
  once design/plan exist (use /sdd-refine), or to create the item (use /sdd-spec).
---

# clarify

## Overview

Turns a raw `spec.md` into the design-ready pair — a precise `spec.md` plus a
`context.md` holding the surveyed terrain — resolving on its own everything that has
a determinable answer and consulting only what genuinely belongs to the developer.

**The skill runs in the main agent, start to finish.** It surveys, decides, asks the
one round of questions it needs, and writes the artifacts itself. Only the
`CODE_SURVEY` port delegates — and only when the profile binds it to an agent, because
a survey's output is bulk citation the run reads once and never needs again.

> **Why inline, and why a single research pass:** delegating would pay the whole
> context twice for sequential work, and splitting the survey from the decision
> wastes the evidence the survey just found — `references/why-rpi.md`.

The principle: **a question the model can answer with grounding is not a question,
it's paperwork.** If you can write the why, don't ask — decide and leave the why
written down.

**Announce at start:** "Clarifying spec-<number> — I'll survey, decide, and only ask you what I can't resolve."

**Output:**
- `work/active/spec-<number>/spec.md` (modified in place)
- `work/active/spec-<number>/context.md` (new)

> **`/sdd-scan` still exists** as the refresh skill: it regenerates only `context.md`
> when the code changed, without re-clarifying anything.

---

## Project profile (read first, always)

Read `.agents/profile.yaml` from the project root before anything else, as
`~/.agents/references/project-profile.md` describes: what a missing file means, how a
`null` key falls back, how a port resolves to an adapter, and why every path or command
shown here is only an example the profile overrides. The keys this skill reads are
listed under **Profile keys** in the `Contract` below.

---

## Contract

What this skill needs, what it guarantees to the stage that follows it (`/sdd-design`
in `full` under the `tdd` carril, `/sdd-plan` in `standard` and in `full` under
`evidence`), and what it may not do.
**Check every `Requires` row before any other work** — a failed precondition stops
the run at the start, not after the survey has been paid for.

> **This skill does not run on a `tier: fast` story.** That tier omits the clarification
> pass by definition: there is no `context.md` to write, and no design and no plan for the
> decisions to feed — the criterion closes in `spec.md` and `/sdd-build` takes it from
> there. If you are invoked on such a story, say so and stop; the story is not missing a
> step. The way back to this pass is `/sdd-refine` on `spec.md` to raise the tier, and a
> fresh run here once the developer asks for the clarification.

**Requires**

| Condition | Check | If it fails |
|---|---|---|
| You are in the project's working directory | `pwd` == `WORKING_DIRECTORY` (absolute path, from the profile) | `cd` there before running anything |
| An item id was given | the input carries an id matching `STORY_ID_PATTERN` | Ask: "Which item? (e.g. spec-1933)" |
| `spec.md` exists | `[ -f work/active/spec-<number>/spec.md ]` | Stop: "I couldn't find `work/active/spec-<number>/spec.md`. Run `/spec spec-<number>` first." (a legacy `hu.md` counts — see step 2) |
| `spec.md` has acceptance criteria | the `## Acceptance Criteria` section holds at least one numbered AC | Stop: "`spec-<number>` has no acceptance criteria. There is nothing to clarify — run `/spec spec-<number>` again to write them." |
| The item isn't already clarified | `## Ambiguity Resolution` present, **zero** `[NEEDS CLARIFICATION]` markers left, and `context.md` exists | Don't re-run: offer `/sdd-scan` (refresh the context) or `/sdd-refine` (adjust ACs) — see step 1 |

**Produces** — this is what the stage the story hands off to looks for

- `spec.md` with **zero** `[NEEDS CLARIFICATION]` markers (the count in the handoff is
  the same gate `/sdd-design` re-runs before designing anything)
- an `## Ambiguity Resolution` section in `spec.md` with one entry per unknown —
  decision, rationale, source and confidence — including the searches that came back
  empty
- every AC verifiable as written, rephrased in EARS where it wasn't, and carrying one
  `#### Scenario:` per branch (happy path, error, empty, boundary) with the real
  values the decisions settled — an AC that is a single unconditional rule carries none
- `## Technical Context` in `spec.md` **only** if the developer declared constraints
  or debt in R5; omitted entirely otherwise
- the story's **`build_mode`** resolved (P2b): the `build_mode: evidence` front-matter
  field plus a `## Build Mode Rationale` section when the developer chose that carril,
  and nothing written in the front matter when it stays `tdd` — the default is the
  absence of the field. Either way the resolution is logged in
  `## Ambiguity Resolution`
- the story's **`tier`** confirmed or raised (P2c): `tier: full` written explicitly when
  a `standard` story turned out to touch a contract, a schema or a second <component>,
  with the reason appended to `## Tier Rationale`; the tier left exactly as it stands
  when it holds, and nothing written when the story is `full` — the default is the
  absence of the field. Either way the resolution is logged in
  `## Ambiguity Resolution`
- `context.md` with the inventory `<STACK_REFS>/references/context-template.md` asks
  for, per affected <component>, and a **detected gaps** section that is always
  present even when empty

**Writes** — nothing outside this list

- `work/active/spec-<number>/spec.md` — the ACs, `## Ambiguity Resolution`,
  `## Technical Context`, the `build_mode` field + `## Build Mode Rationale` when P2b
  resolved the story into the evidence carril, and the `tier` field + `## Tier Rationale`
  when P2c raised the tier (both edited in place, never duplicated)
- `work/active/spec-<number>/context.md` — regenerated whole on every run

The research dossier is **not** on this list: it lives in context between R and I, and
never touches disk.

Not `design.md` or `plan.md` (they don't exist yet at this stage), not the project's
source code or its living docs, not the story's `assets/` folder, and not the
authority sources (`docs/rules.md`, `CLAUDE.md`, `.agents/profile.yaml`) — those are
read-only inputs here.

**Never**

- **Allowed (read-only git):** `git branch --show-current`, `git status --porcelain`,
  `git fetch --dry-run`.
- **Forbidden:** `git checkout`, `git pull`, `git add`, `git commit`, `git push` and
  any other state-changing git command. A stale base is warned about and surveyed as
  it stands — freshening it is `/sdd-prepare`'s job (R3).
- Never delete a `[NEEDS CLARIFICATION]` marker without writing its decision into
  `## Ambiguity Resolution`. An unlogged resolution is indistinguishable from a guess.

**Escalates** — the four classes only: **scope**, **business intent**,
**irreversible choices**, and **rule conflicts**. Everything else is decided against
the source hierarchy and recorded with its confidence. P selects the candidates and
step 4 asks them — at most 3 per run, in a
**single `AskUserQuestion` call** (P3/P4); above that the item's scope isn't ready and
the wrap-up says so. Four questions sit outside that budget: the affected <component>s
when the catalog can't identify them (R3 — resolved in step 2, it can't
be deferred), R5's conditional free-text question about unwritten constraints, the
**build-mode question** (P2b), asked whenever the evidence carril is a candidate, and the
**tier-lowering question** (P2c), asked whenever the story could leave with fewer stages
than it has. Neither of the last two is ever resolved autonomously, and a full escalation
budget does not suppress either.
With `--ask` there is no budget and no autonomy — every unknown is asked, one per
turn.

**Degrades**

- `CODE_SURVEY` resolving to an adapter **without call paths** → the **inventory** is
  unaffected, every adapter returns it; but **precedent** queries are not delegated —
  those unknowns fall back to level 5-6 sources and are recorded as "no precedent"
  (R4 fallback). Say in the wrap-up which depth you got.
- `MODULE_ROOT` (stack block) inconclusive — its subdirectories don't map to
  <component>s with certainty → ask which <component>s the item affects (step 2, R3).
- A missing authority source (`docs/rules.md`, `CLAUDE.md`) → continue without it;
  the hierarchy just drops one level (R2).

**Reverting** — both artifacts are rewritten in place, and one of them wholly:

| What | How it comes back |
|---|---|
| `context.md` | **Regenerated whole on every run**, so a re-run discards the previous inventory entirely. `git checkout -- work/active/spec-<number>/context.md` restores the committed version; before the story's first commit there is none |
| `spec.md` | Edited in place — the ACs, `## Ambiguity Resolution`, the `build_mode` field when P2b resolved the story into the evidence carril, and the `tier` field when P2c raised it. A re-run **appends** to the decision log rather than recreating it (step 1), so the reasoning survives even when the ACs are rewritten |

The expensive half is the reasoning, which is why PHASE I writes the decision log
**first** (I1): an interrupted run leaves behind what would cost most to reconstruct.

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
- `EVIDENCE_MODE_TYPES` (items block) — which item types may opt into
  `build_mode: evidence` (P2b); default `[debt, chore, incident]`
- `FAST_TIER_TYPES`, `STANDARD_TIER_TYPES` (items block) — which item types each reduced
  tier is open to (P2c); defaults `[bug, debt, chore]` and
  `[feat, bug, debt, incident, chore]`. They gate the third guardrail rather than
  anything P2c decides: a tier written against them is refused by
  `validate-artifacts.mjs`, and widening either list is a deliberate edit of
  `.agents/profile.yaml`, never a decision taken inside one conversation
- `CODE_SURVEY` (port) — the
  survey and its fallback. `VERIFY` (port) is not called here — P2b only checks
  whether it resolves to a real adapter
- `ARTIFACT_LANGUAGE`, `OUTPUT_LANGUAGE`, `IDENTIFIER_LANGUAGE` — see "Output language"

---

## Flow

Run these six steps. Steps 3 and 5 are the drafting PHASEs documented below (R, P, I);
you execute them yourself, in this same session, with everything already in context.

### Step 1 — Gates and mode

Extract `spec-<number>` from the input. If absent, ask:
> "Which item? (e.g. spec-1933)"

- Read `spec.md`'s `tier` from its front matter — absent means `full`, and a `spec.md`
  that doesn't exist is stopped by the check further down. `fast` → **stop here**: report
  the tier and the way in — the story runs `/sdd-build` directly, and raising the tier is
  `/sdd-refine` on `spec.md`, after which a fresh run of this skill performs the pass the
  developer asked for — and run nothing else, `--ask` included.
- If the input includes `--ask` → run the legacy interactive mode (see
  `## Legacy mode` at the end) and stop.
- Verify `spec.md` exists (a legacy `hu.md` counts — work on it in place):
  `[ -f work/active/spec-<number>/spec.md ]`; missing → stop per `Requires`.
- Verify the `## Acceptance Criteria` section holds at least one numbered AC;
  absent/empty → stop per `Requires`.
- If `## Ambiguity Resolution` already exists **and no markers remain** and
  `context.md` exists → everything was completed earlier. Announce it and offer
  `/sdd-scan` (refresh context) or `/sdd-refine` (adjust ACs) instead of re-running.
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
   continue** (you survey whatever is checked out); suggest `/sdd-prepare`.

Carry the resolved component list into R3.

### Step 3 — Run PHASE R and PHASE P

Execute the drafting phases below: R (R1 unknowns, R2 authorities, R2b assets, R4
survey via `CODE_SURVEY`) and P (P1 classify, P2 interdependencies, P2b build mode,
P2c tier, P3 select). Decide everything decidable; write nothing to disk yet.

You come out of P holding the decision table, the escalations (max 3, each with its
recommended answer), the R5 question if one is warranted, the build-mode question if
P2b raised one, and the tier-lowering question if P2c returned one.

### Step 4 — Ask the developer (one interaction round)

- If R5 raised a question → ask it as plain free text (the unwritten constraints /
  technical debt question). Record the answer.
- If P4 selected **escalations** → ask them all in a **single `AskUserQuestion` call**
  (up to 3 questions together, never a loop). Each question uses your recommended
  answer as the first option, labelled " (Recommended)"; `header` max 12 chars; the
  implicit "Other" covers custom answers — don't add one.
- If P2b raised the **build-mode** question → add it to that same call as one more
  question (`header: "Build mode"`), with `tdd` first. It sits **outside** the
  3-escalation budget, so a full budget never suppresses it, and it is never resolved
  for the user. If P2b found the type ineligible, don't ask: report it and say the way
  in is widening `EVIDENCE_MODE_TYPES` in the profile.
- If P2c returned the **tier-lowering** question → add it to that same call too
  (`header: "Tier"`), with the tier the story already carries first as the safe default
  and, in each lower option, the artifacts that tier stops producing. It sits
  **outside** the 3-escalation budget as well, and P2c never takes it on its own.

No R5, no escalations, no build-mode question and no tier-lowering question → skip this
step entirely.

### Step 5 — Run PHASE I

With the answers in hand (or `tdd` when the build-mode question wasn't asked, and the
tier unchanged when the lowering question wasn't asked), execute PHASE I: the decision
log first, then the ACs, then `context.md`.

### Step 6 — Handoff and review

1. Verify the handoff gate:
   ```bash
   grep -c 'NEEDS CLARIFICATION' work/active/spec-<number>/spec.md
   ```
   - Markers remain → `<N>` markers left — re-run `/clarify spec-<number>`.
   - Count `0` → hand off **to the stage the story's two axes actually give it**. P2c
     and P2b just resolved them, and this is the only skill that knows them: the **tier**
     decides which stages exist, the **`build_mode`** decides how the criterion is closed
     among them.

     | `tier` | `build_mode` | Next stage | Why |
     |---|---|---|---|
     | `full` (the field absent, or present because a stage escalated into it) | `tdd` (the field is absent) | "Ready to design. Once you've reviewed it, `/design spec-<number>`." | The contract, the diagram and the data model come first |
     | `full` | `evidence` | "Ready to plan. Once you've reviewed it, `/plan spec-<number>`." | That carril has no design artifacts: `/sdd-design` refuses to run on such a story and `/sdd-plan` requires none of them — the pipeline goes `/clarify → /sdd-plan` |
     | `standard` | either | "Ready to plan. Once you've reviewed it, `/plan spec-<number>`." | There is no design to make: the tier omits `design.md` and everything under `docs/` whatever the carril, so `/sdd-plan` builds the atomic breakdown from `context.md` |
     | raised to `full` in P2c | as the raise left it | `/design spec-<number>` — or `/plan spec-<number>` under `evidence` | The raise put the design stage back: a `standard` story corrected to `full` re-routes to the design, exactly as if the tier had never been reduced |

     A raise is the one case where the answer differs from what `/sdd-spec` reported: say
     it in the wrap-up, so the developer does not follow the tier the spec announced.
2. Render the review summary from the IMPLEMENT report (the low-confidence list first,
   then the decided-with-a-source group), add the step 2 base warning and the R4 depth
   note, and — if the escalation budget cut the list — the P3 warning.
3. Stop — do not start the design.

---

## Drafting PHASE R — Research

*Run inline, in the main agent.*

**Phase rule: collect evidence. Don't decide, don't write.**

If at any point you feel tempted to resolve an unknown, note the evidence and move
on — resolution belongs to phase P, with everything in view.

### R1 — Build the complete list of unknowns

Combine two sources and deduplicate:

**(a) Markers from `/sdd-spec`** — every `[NEEDS CLARIFICATION: ...]`, each with its
question text.

**(b) Self-check of every AC** against these seven dimensions. Evaluate internally —
the raw check is working notes, never output:

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

Consult `references/decision-authority.md` — source hierarchy, escalation test and
confidence levels — and keep `references/calibrated-cases.md` at hand: it is the worked
examples of that rubric against real items, and it is what you read when a decision sits on
the line between autonomous and escalated. **Read both here, once, not per unknown.**

### R2b — Read the story's assets (optional)

The story workspace may carry an `assets/` folder — mockups, screenshots, a signed
contract, a data export — that grounds the clarification:

```bash
[ -d work/active/spec-<number>/assets ] && find work/active/spec-<number>/assets -type f || echo "NO_ASSETS"
```

`NO_ASSETS` → continue without comment. When it exists, read every file (images and
PDFs included) per `references/story-assets.md`: assets are **level-3 authority**,
read-only, and one you cannot parse is a gap you carry to the dossier — never a blank
you fill in.

### R3 — Components and fresh base

The **components** were already resolved in step 2, and the base already checked —
carry that list forward. Don't ask again, and don't re-run the git checks.

### R4 — Survey the code (one batch, in parallel)

Resolve the `CODE_SURVEY` port from the profile's `ports` block (the packs'
`ports.yaml` first — base → specific — the profile on top; first available adapter
wins) and fire **both classes of question in the same response**:

| Class | Question | How many |
|---|---|---|
| **Inventory** | "What's in module M?" — for `context.md` | One per affected component |
| **Precedent** | "How did we solve X here before?" — for R1's unknowns | One per unknown that warrants it, cap **5** |

Only unknowns where "how did we solve this before?" is pertinent qualify for
precedent — lengths, error names, formats, column conventions, port patterns. A
business-intent unknown never qualifies.

| Adapter | How |
|---|---|
| `mcp:<tool>` | call that MCP tool directly |
| `agent:<name>` | spawn it with the component name, the item's keywords, the instruction to read the component's docs and the `<STACK_REFS>` `scan-guide.md` (most specific pack wins), and to return verbatim citations |
| `inline` | survey with your own Read/Grep/Glob |

With the results:

1. Identify the key files among those returned and read **only those** with Read,
   applying the progressive disclosure from `<STACK_REFS>/references/scan-guide.md`
   (if no pack in `STACK_REFS` provides it: `../sdd-scan/references/scan-guide.md`) — don't
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
| No relevant results | **No precedent** — drop to level 5. That the repo has no convention here is information for `/sdd-design` |

**If the module doesn't show up** → it's just another unknown (not a blocker): note it
and carry it to P, where it gets escalated along with the rest.

If the adapter returns an inventory but **no call paths**, the precedent half changes:
`references/code-survey-fallback.md`.

**If the module doesn't show up** → it's just another unknown (not a blocker): note it
and carry it to P, where it gets escalated along with the rest.

### R5 — The one thing only the developer knows (held for step 4)

There are two classes of information that live in no file and no code: **unwritten
constraints** and **known technical debt**. If either could change the resolution of
an unknown, hold the free-text question for step 4's single interaction round — don't
ask it here, mid-survey, and don't answer it for the developer. It is **conditional:**
if every unknown was covered by formal sources or by the survey, there is no R5
question.

### Research dossier

At the close of R you hold the dossier **in context** — it is never written to disk:
for each unknown its text, priority, consulted sources, **what was found and what
wasn't**, and — once P decides — its decision, rationale, source and confidence; the
story's assets (or their absence) and what each one settled or suggested; the complete
inventory per component (in `context-template.md` shape); the documentation gaps; and
the R5 answer once step 4 has it. That dossier is the only input to phase I.

Keep it as working notes, not as prose you render for the user: what reaches them is
step 4's questions and step 6's review.

---

## Drafting PHASE P — Plan

*Run inline, in the main agent.*

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

### P2b — Resolve the build mode

Which carril `/sdd-plan` and `/sdd-build` will follow. Two values, and the default is
`tdd` — the absence of the field in the front matter, and what every story written
before this axis existed carries.

**The tier (P2c) is the other axis and the two are independent:** the tier decides which
stages exist, `build_mode` decides how the criterion is closed among them, and both
questions can be live in the same run — a `fast` story can close its single criterion
by `evidence`, a `full` one by `tdd`.

| Mode | The AC is closed by | For |
|---|---|---|
| `tdd` | a test written red-first against the behavior | runtime behavior: features, defects, anything with a unit that can fail |
| `evidence` | an executable check over the deliverable (`VERIFY.run`) | a deliverable no test suite covers, or code where red-first is impossible |

**When `evidence` is a candidate.** Two families, and nothing else:

- **The deliverable is not code**: documentation, ADRs, architecture docs, a prompt
  or agent definition, a research/spike whose output is a decision, a skill.
- **It is code, but the red-first cycle cannot exist**: a pure refactor with no
  behavior change (the test that would "fail first" cannot be written by definition),
  an infra/config chore, a data migration or one-shot script.

A story that adds or changes runtime behavior is `tdd`, full stop — "there is no time
to write tests" and "it's a small change" are not this axis.

**Three conditions, all of them required.** If any fails, the mode stays `tdd`:

1. The item's `type` is in `EVIDENCE_MODE_TYPES` (profile, items block; default
   `[debt, chore, incident]`).
2. There is a **real check**: an adapter for the `VERIFY` port that can tell the
   deliverable being right from being wrong. Unbound port, or a check that passes no
   matter what the file says → not eligible. Name the concrete check in your report;
   "the reviewer reads it" is not one.
3. Every AC can be closed by that check. If some can and some can't, the story is
   `tdd` — a split carril inside one plan is how coverage gets lost.

**Never autonomous.** Even with all three conditions met, `evidence` is **returned as
a question**, outside the 3-escalation budget (same standing as R5), with `tdd` first
as the safe default and the concrete check named in the recommended option. `tdd` *is*
autonomous — it is the default, and choosing it needs no one's permission.

When the type is ineligible but the deliverable genuinely isn't code, say so in your
report and stop there: the fix is widening `EVIDENCE_MODE_TYPES` in the profile, a
deliberate edit the developer makes. **Never write the field against the allowlist** —
`validate-artifacts.mjs` fails the story and `/sdd-plan` refuses to run anyway.

Record the resolution — mode, why, and the check that backs it — in the decision
table, whichever way it went.

### P2c — Confirm or raise the tier

Which stages this story has, where P2b decided how its criterion is closed. Read
`spec.md`'s `tier` from the front matter — absent means `full`.

| `tier` | What P2c does |
|---|---|
| `full` (the field absent, or present because a stage escalated into it) | Nothing to decide, nothing to write |
| `standard` | The tier holds **unless** the survey or the decisions found a signal — below |
| `fast` | Unreachable: step 1 stopped the run before the survey was paid for |

**Raising is the only move taken here.** Read what R4 surveyed and what P1-P2 decided
against `~/.agents/contracts/TIERS.md`'s inference table — a public contract or schema
change, a new integration or dependency, more than one <component> affected, or a change
to security, authentication or performance behaviour. Any one of them makes the story
`full`: write `tier: full` (**never delete the field** — the escalation is part of the
record, so the field stays and stops saying `standard`), append the reason to the
existing `## Tier Rationale` — the signal that matched, never the stage that found it,
because the rationale records the decision and not its author — and say it in the report.
Raising is autonomous because it *adds* work: the design stage and everything under
`docs/` come back, and nothing the story already produced is discarded.

**Lowering is never taken here.** `standard` → `fast`, or `full` → anything beneath it,
is **returned as a question** in step 4 — outside the 3-escalation budget, the same
standing as the build-mode and R5 questions — with the current tier first as the safe
default and the consequence stated in the options: a lower tier **stops producing
artifacts and discards the ones that exist**. Entering `fast` means no `context.md`, no
`design.md`, no `docs/`, no `plan.md` and no `## AC Coverage` in a plan — the close moves
into `spec.md`; entering `standard` means `design.md` and `docs/` go. Never write a lower
tier on your own initiative: the answer authorises it, and `/sdd-refine` is what applies
it afterwards.

Record the tier's resolution in the decision table next to the build mode's, whichever
way it went.

### P3 — Select what to escalate

Over the **complete** candidate list, pick the highest-impact ones.

**Budget: at most 3 escalations per run.** It's not a blind cut, it's a signal: if
**more than 3** unknowns are about product intent or scope, the item isn't ready to be
clarified. Escalate the 3 with the highest impact, resolve the rest at low confidence,
and **say so explicitly** in the wrap-up:

> "<N> unknowns needed your judgment but the budget is 3. I resolved the others at low
> confidence — it may be worth reviewing this item's scope before moving on."

### P4 — Assemble the escalation batch

Shape each selected one as a `question`, a short `header` (max 12 chars), and 2-4
`options` with the recommended one **first** (" (Recommended)") and its rationale in
the `description`. They go out in step 4 as a **single `AskUserQuestion` call** —
never a one-per-turn loop, and never mid-phase.

The **build-mode question** (P2b), when there is one, rides in that same call as one
more question — it doesn't consume the 3-escalation budget. Its options are always
`tdd` first and `evidence` second, each naming what would close the ACs.

The **tier-lowering question** (P2c), when there is one, rides in that same call under
the same rule: the current tier first, and each lower option naming the artifacts that
tier stops producing. It spends no part of the 3-escalation budget either.

### Decision table

At the close of P you hold, per unknown: decision, rationale, source, confidence, and
whether it was autonomous or escalated. It stays in the dossier, in context.

---

## Drafting PHASE I — Implement

*Run inline, in the main agent.*

**Phase rule: apply what was decided. Decide nothing new.**

If a doubt shows up here that wasn't in the table, R was incomplete: resolve it with
the hierarchy and record it at low confidence — don't open a new question this late.

### I1 — Write the decision log first

**Write `## Ambiguity Resolution` into `spec.md` before anything else.** If the run is
interrupted, what survives is the complete reasoning — which is the expensive part to
reconstruct; reapplying edits is trivial.

Each entry carries **AC · how it was resolved (confidence) · the question → the
decision**, then `*Rationale:*` and `*Source:*` with its level:

```markdown
- **AC-2 · autonomous (high):** Which HTTP code for an empty list? → **200 with an
  empty array**.
  *Rationale:* it's the REST standard for collections with no results; 404 is reserved
  for a nonexistent resource. *Source:* HTTP convention (level 5).
```

Two entries are always present, whichever way P2b and P2c went — the **build mode** and
the **tier** (the tier the story runs, and, when P2c raised it, the survey signal that
raised it). Those two, plus a worked example of a consulted entry and of a
low-confidence one with no precedent: `references/decision-log-format.md`.

Also record the searches that came back **empty** and the inconsistencies found in
R4 — they're signals for `/sdd-design`.

### I2 — Apply the resolutions to the ACs

1. Edit each AC in `spec.md` with the precise wording.
2. **Remove the `[NEEDS CLARIFICATION: ...]` marker** from that line if it came from
   one. No resolved marker may remain in the file.

### I3 — EARS rephrasing and I3b — concrete scenarios

Two rewrites phase I applies **automatically — never asked, never escalated**, because
they change wording rather than behavior:

- **EARS** (I3): an AC that fails testability is rewritten in EARS notation, with the
  original preserved underneath as `> Original: "<text>"`. An AC that is already clear
  and testable is never reformulated.
- **Scenarios** (I3b): one `#### Scenario:` per branch — happy path, error, empty,
  boundary — carrying the real values I1's decisions settled, never placeholders. An AC
  that is a single unconditional rule needs none; don't manufacture one.

The five EARS patterns, the mandatory `**WHEN**`/`**THEN**` shape and the test that
separates observable behavior from implementation detail: `references/ears-and-scenarios.md`.

Every resolution that settled a **value** — an HTTP code, a limit, a format — should be
visible in a scenario. That is what makes a decision testable rather than written down.

### I4 — Write `## Technical Context` (only what the human declared)

This `spec.md` section carries **exclusively what the developer declared in R5**:
technical constraints and relevant technical debt. Nothing inferred, nothing surveyed
from the code — that lives in `context.md`, which is its place.

Use `references/tech-context-template.md`. **If the developer declared nothing, omit
the whole section.**

### I4b — Write the build mode (only when it isn't `tdd`)

The mode the developer picked in P2b:

- **`tdd`** → write **nothing** in the front matter. The absence of the field *is*
  the default, and adding it as noise would suggest the axis was contested when it
  wasn't. The decision still gets its line in `## Ambiguity Resolution`.
- **`evidence`** → add `build_mode: evidence` to the front matter, after `origin`, and
  write the `## Build Mode Rationale` section right below the framing block, before
  `## Acceptance Criteria`:

```markdown
## Build Mode Rationale

**Why not TDD:** <what makes a red-first test impossible or meaningless here —
the concrete reason, not "it's not code">
**What verifies it:** `VERIFY.run` → `<the exact check that closes the ACs>`
```

`## Build Mode Rationale` is a structural heading — English always, like
`## AC Coverage`; the prose under it follows `ARTIFACT_LANGUAGE`. Both lines are
mandatory and neither may be empty: `validate-artifacts.mjs` fails the story
otherwise, and that is the point — the mode is only valid when what replaces TDD is
written down.

Never write the field for a type outside `EVIDENCE_MODE_TYPES`, and never write it
when the developer wasn't asked.

### I4c — Write the tier (only when it is not `full`)

The field and its rationale are usually already in `spec.md` — the tier was inferred when
the story was written. I4c is what closes the guardrail: P2c may have raised the tier,
and a hand-written spec may carry the field with no rationale under it at all.

- **`full`, and P2c raised nothing** → write **nothing** in the front matter. The absence
  of the field *is* the default, and declaring it would suggest the axis was contested
  when it wasn't. The decision still gets its line in `## Ambiguity Resolution`.
- **The field is present** (`standard` held, or a raise P2c wrote as `tier: full`) → edit
  it in place, never duplicating it: it sits in the front matter after `origin` — and
  after `build_mode` when that one is written too. `## Tier Rationale` sits below the
  framing block and **above `## Build Mode Rationale`**; the two are never translated,
  and the tier keeps the wider position because it is the wider decision:

```markdown
## Tier Rationale

**Why this tier:** <the signals that matched — number of criteria, what the change is
confined to, what it does not touch>
**What covers the omitted stages:** <the check that closes the criterion, and the fact
that the working branch still gates the build>
```

Both labeled lines are mandatory when the field is present and neither may be empty:
`validate-artifacts.mjs` fails the story otherwise. That is the point — the tier is only
valid when why the full flow does not apply, and what covers the stages it omits, are
written down.

Never write the field for a type outside the tier's allowlist (`FAST_TIER_TYPES`,
`STANDARD_TIER_TYPES`), and never write a tier lower than the story carries — P2c's
question is the only thing that authorises that.

### I5 — Write `context.md`

Pour the dossier's inventory into `<STACK_REFS>/references/context-template.md`
(if no pack in `STACK_REFS` provides it: `../sdd-scan/references/context-template.md`)
and save it at
`work/active/spec-<number>/context.md`.

Always include the **detected gaps** section: what wasn't found, the missing
documentation, and the repo inconsistencies found in R4. `/sdd-design` and `/sdd-plan` depend
on that list as much as on the inventory.

### I6 — Batch review

Render the review list ordered by **ascending confidence** — the shaky ones on top,
which is where the eye needs to land.

### Handoff

Close with the grep (`grep -c 'NEEDS CLARIFICATION'
work/active/spec-<number>/spec.md`) — count `0` → hand off to the stage the story's tier
and carril give it (step 6's two-axis table), else re-run `/sdd-clarify`. Run it against
the file on disk; don't report the count from memory.

---

## Legacy mode (`--ask`)

With `--ask` there is no RPI separation: every unknown is asked with
`AskUserQuestion`, one at a time, with no budget and no autonomy; EARS is offered
rather than applied; and the technical context is surveyed by asking. The code
inventory and `context.md` are produced all the same, the build-mode question
(P2b) is asked under the same rule — `evidence` is never assumed — and the tier is never
lowered without the developer asking for it (P2c).

Details in `references/legacy-ask-mode.md`. Useful when the item touches terrain where
you don't want anything decided out of your sight.

## Output language
**Conversational output** follows `~/.agents/references/chat-conventions.md` - the six blocks (announce, progress, question, summary, stop, handoff).

**Artifact prose follows `ARTIFACT_LANGUAGE`** (language block): the ACs you rewrite in
`spec.md`, the rationale of each entry in the decision log, and `context.md`'s
inventory prose.

The **section headings** stay English regardless of that key (`## Acceptance
Criteria`, `## Ambiguity Resolution`, `## Technical Context`, `## Tier Rationale`,
`## Build Mode Rationale` — other skills and the validator read them by name), and so do
the front-matter keys and their enum values (`type`, `origin`, `tier: fast` /
`tier: standard` / `tier: full`, `build_mode: evidence`), which are matched verbatim.

The **identifiers** quoted from the code — paths, classes, fields, endpoints —
follow `IDENTIFIER_LANGUAGE` (profile, language block). Quote them exactly as the
code spells them; this skill has no language of its own to convert them into.

---

## Common Issues

The seven that **stop or re-route a run** — it stops, the call goes back to the user, or
the story leaves on a different tier than it arrived. Every other failure mode — survey
depth, escalation budget, unreadable assets, build-mode eligibility, contradictory
precedent — is in `references/troubleshooting.md`.

| Issue | Cause | Resolution |
|-------|-------|------------|
| spec.md doesn't exist | `/sdd-spec` never ran | STOP: tell the user to run `/spec spec-<number>` first |
| spec.md exists but has no ACs | `/sdd-spec` left the section empty | STOP: the ACs are the contract with the rest of the pipeline — run `/spec spec-<number>` again to write them |
| Only `context.md` needs refreshing | The code changed, the ACs didn't | Use `/scan spec-<number>` — don't re-clarify |
| You can't even build the unknowns list | Missing context, or a spec that contradicts itself | Stop before surveying: show the blocker, fix the input (`/sdd-refine`/`/sdd-spec`), then re-run |
| The handoff grep is non-zero | PHASE I left a resolved marker in place | Stop: the run isn't complete — re-run `/clarify spec-<number>` |
| A `standard` story turns out to touch a public contract | The inference read the input alone; the survey reads the code, and the change crosses a contract, a schema or a <component> boundary the input never named | Raise the tier in P2c: write `tier: full`, append the signal to `## Tier Rationale`, report the raise, and hand off to `/sdd-design` — raising adds work and discards none |
| The developer asks for a lower tier | Only the developer may lower a tier: it discards artifacts the stages already produced | Ask it in step 4, with the current tier first and the artifacts that tier stops producing named in each lower option; on the answer, say `/sdd-refine` is what applies it — never write a lower tier on your own initiative |

---

## Example

A full worked run — a run resolving ambiguities end to end — is in
`references/example.md`. Read it when the shape of the output is in doubt.

---