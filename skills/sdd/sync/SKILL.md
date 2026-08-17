---
name: sync
description: >
  Closes the documentation half of a story at the end of the pipeline:
  reconciles the design delta (OpenAPI contract + per-flow docs carrying their
  own inline Mermaid diagram) into the affected unit's living docs
  (docs-as-code mode; legacy mode promotes files),
  appends design.md's "Design Decisions" section (if any) to the
  cumulative docs/decisions.md log, and reads the "Global Architecture
  Impact" section /design already left in design.md — if it says yes,
  invokes /docs with the node/edge already specified (sync detects
  nothing on its own, it only promotes what /design already documented) —
  and moves the work/active folder to work/done. Doesn't touch git — that's
  /commit's job. Use when the user says "/sync spec-XXXX", "sync the
  documentation", "close the story" or "finalize the story", or after /build
  completes all plan tasks and the user approves the changes.
  Do NOT use to execute plan tasks (use /build), fix post-build defects
  (use /hotfix), group/execute commits and draft the PR (use /commit, right
  after /sync), or bootstrap docs/architecture/ from scratch (use
  /docs directly).
---

# sync

## Overview

Close the documentation half of a story at the end of the pipeline: promote
the documentation produced during `/design` into the module docs folder,
append any design decisions to the cumulative `docs/decisions.md` log, read
`design.md`'s own `## Global Architecture Impact` verdict and hand off to
`/docs` if it says the story touched global architecture, and archive
the story workspace into `work/done/`. Sync doesn't detect anything itself
anymore — `/design` already determined and documented it; sync only promotes.
That's the whole scope — the git side (grouping and executing commits,
drafting the PR) is `/commit`'s job, meant to run right after this one.

**Announce at start:** "Syncing documentation for spec-<number>."

**Output:**

- The design delta reconciled into the unit's living docs (docs-as-code, `DESIGN_OUTPUT_MODE = full-flow`): canonical OpenAPI merged (classified by `CONTRACT_DIFF`) and `flows/*.md` replaced under `<unit>/flows/`, with their inline Mermaid diagrams validated by `DIAGRAM_CHECK`. (In legacy mode, `DESIGN_OUTPUT_MODE = full`: artifacts copied as is.)
- `docs/decisions.md` (repo root) with a new entry if `design.md` had a "Design Decisions" section (or unchanged, if it didn't apply).
- `docs/architecture/` updated by `/docs` if the story touched global architecture (or unchanged, if it didn't apply).
- The `work/active/spec-<number>/` folder moved to `work/done/spec-<number>/`.
- A suggestion to run `/commit spec-<number>` as the next step.

**Core principle:** sync syncs documentation, nothing else — it neither proposes nor
executes commits or PRs. It still reads `status`/`diff`/`log` read-only for Step 2's
gate check, but the git close-out lives in `/commit`.

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

Any path, branch name or command shown in this document is an example resolution; the
profile's value wins. The keys this skill reads are listed under **Profile keys** in
the `Contract` below.

---

## Contract

What this skill needs, what it guarantees, and what it may not do. **Check every
`Requires` row before any other work**, in this order — a failed precondition
stops the close-out at the start.

**Requires**

| Condition | If it fails |
|---|---|
| `pwd` == `WORKING_DIRECTORY` (absolute path, from the profile) | `cd` there before running anything |
| `work/active/spec-<number>/` exists | Check `work/done/spec-<number>/` — if it's already there the story was already synced: report it and stop |
| `node ~/.agents/scripts/validate-artifacts.mjs spec-<number>` exits `0` | Stop and report the issues it lists, verbatim — each one names the artifact and the broken contract. This is the mechanical form of the two rows below; don't re-derive by eye what it already checked. If `node` is unavailable (exit `2`), check both rows by hand and say the gate ran manually |
| `plan.md` exists and **all** its tasks are marked `[X]` | Stop: "The plan still has incomplete tasks. Run `/build spec-<number>` first." |
| `plan.md` has an `## AC Coverage` section with **zero** lines marked `✗` | Stop: "AC-<N> is not covered (`<reason from the line>`). The story isn't ready to close." (in `build_mode: evidence` the line points at the command that proves the AC rather than at a test — the gate is the same) If the section is missing entirely, the plan predates this convention — ask the user to confirm AC coverage; don't infer it from the `[X]` markers |
| `design.md` exists | In `build_mode: evidence` (spec.md front matter) there is no design to promote: skip Steps 3 and 4 silently and go on to the archive — that carril never produced a contract, a flow or a `## Design Decisions` section. In `tdd`, ask the user whether to skip doc promotion; do not invent module docs |
| `git branch --show-current` ≠ `BASE_BRANCH` | Stop and ask the user to switch to the working branch |

The `[X]` markers say the *tasks* were executed; `## AC Coverage` says the
*acceptance criteria* were met. Those are different claims, and a story can satisfy
the first without the second — which is exactly what this gate catches.

**Produces**

- the design delta reconciled into the unit's living docs (Step 3)
- a new entry at the top of `docs/decisions.md`, if `design.md` had one (Step 4)
- `work/done/spec-<number>/` (Step 5) — the whole workspace folder moved intact, so
  `spec.md` and the `plan.md` that closed with `## AC Coverage` travel with it.
  `/commit` reads both from there
- `docs/architecture/` refreshed **through `/docs`**, never written here (Step 6)

**Writes** — nothing outside this list

- `<unit>/docs/` — the living docs of the units named in `design.md`: canonical
  `api.yaml`, `flows/*.md`, unit README
- `docs/decisions.md` at the repo root
- `work/active/spec-<number>/` → `work/done/spec-<number>/` (filesystem move)

Not the project's source code (that's `/build` or `/hotfix`), not the story's own
`spec.md`/`design.md` (that's `/refine`), and not `docs/architecture/` — that scope
belongs strictly to `/docs`, which sync invokes rather than replaces.

**Never** — version control is managed by the user, same rule as `/build`. Sync
doesn't even propose a commit plan anymore (that moved to `/commit`); it only reads
git state for the Step 2 gate check.

- **Allowed (read-only):** `git status`, `git diff`, `git log`, `git branch --show-current`.
- **Forbidden:** `git add`, `git commit`, `git push`, `git merge`, `git rebase`,
  `git checkout -b`, `gh pr create` and any other state-changing git/gh command.

**Reverting** — every destination this skill overwrites is tracked by git, on the
story's working branch: `git checkout -- <path>` restores any living doc, and Step 5's
`mv` is undone by moving the folder back. That is the entire safety net, and it holds
only because sync never touches anything git doesn't already track.

**Escalates** — an unidentifiable destination module, an ambiguous unit, a
duplicate-flow clash (Step 3), or a failed CI gate (Step 2). Ask; never guess.

**Degrades** — `CI_GATES` unbound → offer per-app gates or an explicit warning;
`CONTRACT_DIFF` unbound → manual diff; `DIAGRAM_CHECK` unbound → manual review.

**Profile keys**

- `STORY_ID_PATTERN`, `WORKDIR_ACTIVE`, `WORKDIR_DONE` — the story's id and its
  workspace before and after the close, written throughout this document as
  `spec-<number>`, `work/active/spec-<number>/` and `work/done/spec-<number>/`
- `WORKING_DIRECTORY`, `BASE_BRANCH` — the location and branch gates in `Requires`
- `API_CONTRACT_MODE`, `DESIGN_OUTPUT_MODE` — the decision table in Step 3
- `DOCS_MODULE`, `DOCS_UNIT_FLOWS`, `DOCS_UNIT_README`,
  `DOCS_ARCHITECTURE` — where the living docs go (docs block)
- `CI_GATES`, `CONTRACT_DIFF`, `DIAGRAM_CHECK` (ports) — the pre-close gates
- `COMPONENT_TERM` and the stack block — the term for a deployable unit, and the stack
- `ARTIFACT_LANGUAGE`, `OUTPUT_LANGUAGE`, `IDENTIFIER_LANGUAGE` — see "Output language"

---

## Step 1: Read the story artifacts

Read from `work/active/spec-<number>/`:

- `design.md` — affected apps and modules → defines each artifact's destination.
- `docs/` — artifacts to promote (`diagram.md` sequence diagram,
  `component.md` C4 Level 3, `api.yaml`, `data-model.md`, etc.).

## Step 2: Pre-close verification

1. `git branch --show-current` — stop if it is the base branch.
2. `git status --porcelain` and `git diff --stat` (read-only) — inventory of
   what the story changed.
3. Offer to run the same gates as CI before closing the story. **Ask first** —
   it takes minutes. Call the `CI_GATES.run` port with the affected apps as `<apps>`.

   If the port is unbound (project with no declared gates) → offer to run the
   gates per app (individual lint/test/build) or continue the close-out with an
   explicit warning.

   If any gate fails → stop: the story is not ready to close. Report the
   failure; fix it directly, or use `/hotfix spec-<number>` if it traces back to
   a spec gap.

## Step 3: Reconcile the design delta into the living module docs

Two profile keys decide this step, one per artifact class. **They are resolved
independently** — read both rows of the table below and execute what each one says.
A project that mixes modes runs one row from each section; that is normal, not an
exception:

| Artifact class | Key | Value | Action | Section below |
|---|---|---|---|---|
| OpenAPI contract | `API_CONTRACT_MODE` | `delta` (default) | merge the delta into the canonical `api.yaml` | reconcile |
| OpenAPI contract | `API_CONTRACT_MODE` | `full` | copy the file as is | promote |
| Flows / diagrams | `DESIGN_OUTPUT_MODE` | `full-flow` | replace the whole `flows/<slug>.md` | reconcile |
| Flows / diagrams | `DESIGN_OUTPUT_MODE` | `full` (default) | copy the Markdown artifacts as is | promote |

### When `DESIGN_OUTPUT_MODE = full-flow` (docs-as-code with Mermaid — only if the profile declares it; the default is `full`)

`/design` produces the **complete** `flows/<slug>.md`, with its `sequenceDiagram`
inline. With no global model to merge, the flow is **replaced whole** in the living
docs. The only real reconciliation that survives is the canonical `api.yaml`, which is
genuinely cumulative.

**Identity keys & duplicate guard (run BEFORE writing).** Every living entity has a
stable key: the flow = `use_case` (slug of `flows/*.md`), the endpoint = `path`+method /
`operationId` in `api.yaml`. Before writing anything, check each delta flow against the
unit's living docs:

- If the delta's `use_case`/`operationId` **already exists** → it's a modification:
  replace it **in place** (steps below). Correct, not a duplicate.
- If the delta brings a **new** `use_case`/`operationId` but its `entrypoint`+`command`
  (or the event, for non-REST triggers) **matches an existing living flow** → **STOP**:
  it's a duplicate (`/design` gave a different name to a flow that already existed).
  Don't write. Report the clash and ask for the delta to be corrected so it reuses the
  current slug/operationId, or use `/refine` on the design. Never resolve the clash by
  creating `<slug>-v2.md`.

**Resolve the documentation unit, not the "module".** A flow's destination is
`DOCS_UNIT_FLOWS` = `<unit>/flows/<slug>.md`, where the unit is the code root the flow
documents. Hard rule: **documentation lives next to the code it describes.** If the
handler lives in a lib, its flow goes to `libs/<lib>/docs/flows/`, not under
`apps/<app>/docs/`. When the destination isn't obvious, resolve it by the real location
of the `command`'s class.

For each affected unit (identified in `design.md`; if ambiguous → ask, don't guess):

1. **Canonical OpenAPI** (convention under `DOCS_MODULE` — `<DOCS_MODULE>/<module>/api.yaml`):
   - Keep a copy of the previous canonical file (for the diff).
   - Merge `docs/api.delta.yaml`: add/replace each `path` and each `components.schemas`
     from the delta; keep everything the delta doesn't touch. Don't change the module's
     canonical `info.title`.
   - Call the `CONTRACT_DIFF.run` port with the previous canonical file as `<old>` and
     the new one as `<new>`. If the port is unbound → manual diff comparison.
     Record the verdict in the PR body: **non-breaking** (in-place evolution) or
     **breaking** (→ flag that it warrants a `/vN` path version; don't version
     automatically).

2. **Flows** (`DOCS_UNIT_FLOWS` = `<unit>/flows/<slug>.md`), for each
   `docs/flows/<slug>.md` in the delta:
   - Doesn't exist → create it as is.
   - Exists → **replace it whole**, keeping the living file's `introduced_by` and
     setting `last_modified_by` = this item. Git keeps the previous version; never
     create `<slug>-v2.md`.
   - `status: deprecated`/`removed` → mark it in the frontmatter, don't delete the file.
   - Verify the frontmatter does **not** carry a `view:` key — it's a leftover from the
     LikeC4 approach and no longer has a referent.

3. **Unit README** (`DOCS_UNIT_README`): update the use case table (add the new flow's
   row) and, **if the story added or removed components**, the ` ```mermaid ` block of
   the component `flowchart`. Don't rewrite it whole on every story.

4. **Validate the diagrams:** call the `DIAGRAM_CHECK.run` port. It verifies every
   identifier in every Mermaid block names a real symbol in the code. If it fails,
   **don't close the story**: the diagram names something that doesn't exist, and
   that's exactly what the gate is there to catch. If the port is unbound → manual
   review.

The original delta stays in the story folder as a point-in-time record — it travels to
`work/done/` in Step 5.

### When `DESIGN_OUTPUT_MODE = full` (default — copy Markdown artifacts as is)

For each file under `work/active/spec-<number>/docs/`:

1. Identify the affected app and module from `design.md` (and `context.md` if
   needed). If it is ambiguous → ask the user, do not guess.
2. Resolve the destination from `DOCS_MODULE` (folder pattern):
   - Artifact of one app's module → `<DOCS_MODULE>/<module>/<artifact>.md`
   - Cross-cutting artifact (libs, more than one app) → `docs/<module>/<artifact>.md` at the repo root
3. **Copy** (don't move) the artifact to its destination:
   - Destination does not exist → create it (create the folder tree as needed).
   - Destination exists → the new version supersedes: overwrite it, and record
     in the PR body that the module docs were updated by this story.
4. The original stays inside the story folder as a point-in-time record — it
   travels to `work/done/` in Step 4.

Stories without design artifacts (no `docs/` folder) skip this step silently;
note it in the final summary.

## Step 4: Append to the decisions log

`docs/decisions.md` (repo root — **not** `docs/architecture/`, that scope is
strictly `/docs`'s C4 diagrams) is a single cumulative, append-only
log of design decisions across **every** story, not just cross-cutting ones —
a decision scoped to one module still belongs here.

If `design.md` has a `## Design Decisions` section:

1. If `docs/decisions.md` doesn't exist yet, create it with a short header
   (append-only, reverse-chronological — most recent first).
2. Copy the section **verbatim** (don't paraphrase) as a new entry at the
   **top** of the log:

   ```markdown
   ## <item>-<number> — <short story title> (<close date>)

   <literal content of design.md's "Design Decisions" section>

   ---
   ```

3. Never edit or delete a previous entry — a superseded decision gets a new
   entry that references the old one.

If `design.md` has no such section, skip silently — not every story has a
significant decision to record.

## Step 5: Archive the story workspace

Move the whole folder (filesystem operation, not a git mutation):

```bash
mv work/active/spec-<number> work/done/spec-<number>
```

`work/` is tracked by git, so the move shows up in `git status` — `/commit`
picks it up from there as part of its own commit grouping.

## Step 6: Promote global architecture changes (if design.md already flagged one)

`/design` already determined, at design time, whether the story touches
global architecture — it's documented explicitly in `design.md`'s
**`## Global Architecture Impact`** section (always present, never
conditional — see PHASE 4/`../design/references/design-template.md` of `/design`).
Sync does **not** re-derive this from a git diff — it just reads the
answer and promotes it.

1. Read `## Global Architecture Impact` from `design.md`.
2. If it says **Yes**: invoke the `docs` skill in Update mode with
   this story's number (`spec-<number>`), passing along the level (Context/
   Container), the change, and the concrete node/edge already specified
   there — `docs` applies it, it doesn't have to infer it.
3. If it says **No**: skip silently, note "no global architecture changes"
   in the close-out summary.

This runs automatically as part of closing the story — filesystem-only, no
git mutation, same class of action as Step 3's doc promotion. No need to ask
the user first.

If `design.md` predates this section (an older story, written before this
convention existed) and doesn't have it, fall back to asking the user
directly whether the story touched global architecture — do not guess from
the diff.

## Step 7: Suggest /commit and close out

Report, in this order:

1. Artifacts promoted (destination paths) — or "no artifacts to promote".
2. Entry added to `docs/decisions.md` (its title) — or "no design decisions
   to record".
3. Folder archived under `work/done/spec-<number>/`.
4. `docs/architecture/` updated (what changed) — or "no global architecture
   changes".
5. Explicitly suggest: "Run `/commit spec-<number>` to group and execute the commits
   and leave the PR drafted."

Then stop — grouping/executing commits and drafting the PR is `/commit`'s job,
not this skill's.

> If a defect shows up after the close and it originates in an ambiguity or gap in
> `spec.md`, don't reopen this skill — use `/hotfix spec-<number>`.

---

## Examples

### Example 1: standard close after /build

User says: "/sync spec-0009"

Actions:
1. Read `.agents/profile.yaml` and verify `work/active/spec-0009/` with the plan
   fully done (`[X]` on every task).
2. `git branch --show-current` → `feat/spec-0009-transfers`; `git status
   --porcelain` → 14 files changed, all from the story.
3. With the user's go-ahead, call `CI_GATES.run` with `finances` as `<apps>` → all
   green.
4. Promote `docs/diagram.md` and `docs/api.yaml` to
   `apps/finances/docs/movement/` (design points to the `movement` module).
5. `design.md` has a "Design Decisions" section → append a new entry at
   the top of `docs/decisions.md`.
6. `mv work/active/spec-0009 work/done/spec-0009`.
7. `design.md`'s "Global Architecture Impact" says **No** → skip
   silently, no need to inspect the diff.
8. Suggest: "Run `/commit spec-0009` to group and execute the commits and leave the PR
   drafted."

Result: documentation synced, story archived, and the user knows the next
step (`/commit`).

### Example 2: a story that does touch global architecture

Context: `/sync spec-0015` closes a story that added `apps/notifications`.
`design.md` has:

```markdown
## Global Architecture Impact

**Does it touch global architecture?** Yes.

- **Level:** Container (Level 2)
- **Change:** new microservice
- **Concrete node/edge:** add node `notifications`; edge
  `ledger -. events .-> notifications`.
```

Actions:
1. Sync reads the section as-is — doesn't inspect `git diff` to confirm it.
2. Invokes `/docs spec-0015`, passing along the level, the change, and
   the already-specified node/edge.
3. `/docs` applies them directly to `containers.md` without having
   to re-analyze what changed.

Result: `containers.md` updated without any skill having to re-derive the
delta from the code.

### Example 3: automatic suggestion when /build closes

Context: `/build spec-0010` finished all tasks and the user replies "approved".

Actions:
1. Suggest: "Run `/sync spec-0010` to sync the documentation."
2. If the user confirms, run the full workflow from Step 1.
3. On close, in turn suggest `/commit spec-0010`.

Result: the story's close happens without the user having to remember the
next steps.

---

## Common Issues

| Issue | Cause | Resolution |
|---|---|---|
| `plan.md` has tasks without `[X]` | `/build` didn't finish | Stop — suggest `/build spec-<number>` |
| `plan.md` has an AC marked `✗` in `## AC Coverage` | Tasks executed, but an acceptance criterion has no test behind it | Stop — the story isn't ready to close; fix the gap, or `/hotfix spec-<number>` if it traces back to an ambiguous AC |
| `plan.md` has no `## AC Coverage` section at all | Plan built before this convention existed | Don't infer coverage from the `[X]` markers — ask the user to confirm the ACs are met before closing |
| Folder is already in `work/done/` | sync already ran for this story | Report it and stop |
| No `docs/` folder in the story | Story with no API/diagram changes | Skip Step 3, note it in the final summary |
| `design.md` has no "Design Decisions" section | Story with no significant decisions | Skip Step 4 silently — not every story has a decision worth recording |
| `docs/decisions.md` doesn't exist yet | No story with decisions has ever closed in this repo | Create it in Step 4 with the standard header — no need to wait for a separate bootstrap skill |
| Destination doc already exists | Module docs accumulate across stories | Overwrite (the new version supersedes) and note it in the final summary so `/commit` reflects it in the PR |
| Module can't be identified | `design.md` doesn't name it | Ask the user — don't guess |
| Current branch is the base branch | The user forgot to switch branches | Stop immediately, ask them to switch to the working branch |
| lint/test/build fails in Step 2 | Regression at close time | Stop — fix directly, or `/hotfix` if it traces back to a spec gap |
| User asks to group/execute commits or draft the PR right here | Scope confusion after the skill split | Explain that's `/commit spec-<number>`, meant to run right after |
| `design.md` has no "Global Architecture Impact" section | Story designed before this convention existed | Don't guess from the diff — ask the user directly whether the story touched global architecture |
| The section says "Yes" but the node/edge isn't clear | `/design` didn't specify it in enough detail | Invoke `/docs spec-<number>` anyway and let it ask for precision, or ask the user before invoking |
| User asks to bootstrap `docs/architecture/` from here | Out of this skill's scope | Explain that's `/docs` (with no arguments), not `/sync` |

---

## Output language
**Conversational output** follows `~/.agents/references/chat-conventions.md` - the six blocks (announce, progress, question, summary, stop, handoff).

**Artifact prose follows `ARTIFACT_LANGUAGE`** (profile, language block — falls back to
`OUTPUT_LANGUAGE` if the project doesn't declare it): the entries appended to
`docs/decisions.md` and anything you write into the living docs. Promoted content
keeps the language `/design` produced it in — never translate it on promotion.

The section names this skill reads (`## Design Decisions`, `## Global Architecture
Impact`) are structural contracts with `/design` — always English, as are paths,
schema names and any other identifier (`IDENTIFIER_LANGUAGE`).

**Chat interaction follows the user's language** (`OUTPUT_LANGUAGE` in the profile).
The message samples in this document are written in English; render them in the
user's language when that differs.
