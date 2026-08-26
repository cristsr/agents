---
name: sdd-sync
description: >
  Closes the documentation half of a story: reconciles the design delta (the
  OpenAPI contract and the flow docs) into the affected unit's living docs,
  appends design.md's "Design Decisions" to the cumulative decisions log,
  promotes a global architecture change to /sdd-docs when design.md already
  flagged one, and archives the story from work/active to work/done. Doesn't
  touch git — that's /sdd-commit's job.
  Use when the user says "/sdd-sync spec-XXXX", "sync the documentation", "close
  the story", "finalize the story", "cierra la historia", or after /sdd-build
  completes every plan task and the user approves the changes.
  Do NOT use to execute plan tasks (use /sdd-build), to fix post-build defects
  (use /sdd-hotfix), to commit or draft the PR (use /sdd-commit, right after /sdd-sync),
  or to bootstrap the architecture docs from scratch (use /sdd-docs directly).
---

# sync

## Overview

Close the documentation half of a story at the end of the pipeline: promote
the documentation produced during `/sdd-design` into the module docs folder,
append any design decisions to the cumulative `docs/decisions.md` log, read
`design.md`'s own `## Global Architecture Impact` verdict and hand off to
`/sdd-docs` if it says the story touched global architecture, and archive
the story workspace into `work/done/`. Sync doesn't detect anything itself
anymore — `/sdd-design` already determined and documented it; sync only promotes.
That's the whole scope — the git side (grouping and executing commits,
drafting the PR) is `/sdd-commit`'s job, meant to run right after this one.

**Announce at start:** "Syncing documentation for spec-<number>."

**Output:**

- The design delta reconciled into the unit's living docs (`DOC_UNIT = use-case`): canonical OpenAPI merged (classified by `CONTRACT_DIFF`) and `flows/*.md` replaced under `<unit>/flows/`, with their inline Mermaid diagrams validated by `DIAGRAM_CHECK`. (Under `DOC_UNIT = story`: artifacts copied as is.)
- `docs/decisions.md` (repo root) with a new entry if `design.md` had a "Design Decisions" section (or unchanged, if it didn't apply).
- `docs/architecture/` updated by `/sdd-docs` if the story touched global architecture (or unchanged, if it didn't apply).
- The `work/active/spec-<number>/` folder moved to `work/done/spec-<number>/`.
- A suggestion to run `/commit spec-<number>` as the next step.

**Core principle:** sync syncs documentation, nothing else — it neither proposes nor
executes commits or PRs. It still reads `status`/`diff`/`log` read-only for Step 2's
gate check, but the git close-out lives in `/sdd-commit`.

---

## Project profile (read first, always)

Read `.agents/profile.yaml` from the project root before anything else, as
`~/.agents/references/project-profile.md` describes: what a missing file means, how a
`null` key falls back, how a port resolves to an adapter, and why every path or command
shown here is only an example the profile overrides. The keys this skill reads are
listed under **Profile keys** in the `Contract` below.

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
  `/sdd-commit` reads both from there
- `docs/architecture/` refreshed **through `/sdd-docs`**, never written here (Step 6)

**Writes** — nothing outside this list

- `<unit>/docs/` — the living docs of the units named in `design.md`: canonical
  `api.yaml`, `flows/*.md`, unit README
- `docs/decisions.md` at the repo root
- `work/active/spec-<number>/` → `work/done/spec-<number>/` (filesystem move)

Not the project's source code (that's `/sdd-build` or `/sdd-hotfix`), not the story's own
`spec.md`/`design.md` (that's `/sdd-refine`), and not `docs/architecture/` — that scope
belongs strictly to `/sdd-docs`, which sync invokes rather than replaces.

**Never** — version control is managed by the user, same rule as `/sdd-build`. Sync
doesn't even propose a commit plan anymore (that moved to `/sdd-commit`); it only reads
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
- `API_CONTRACT_MODE`, `DOC_UNIT` — the decision table in Step 3
- `DOCS_MODULE`, `DOCS_UNIT_FLOWS`, `DOCS_UNIT_README`,
  `DOCS_ARCHITECTURE` — where the living docs go (docs block)
- `CI_GATES`, `CONTRACT_DIFF`, `DIAGRAM_CHECK` (ports) — the pre-close gates
- `COMPONENT_TERM` and the stack block — the term for a deployable unit, and the stack
- `ARTIFACT_LANGUAGE`, `OUTPUT_LANGUAGE`, `IDENTIFIER_LANGUAGE` — see "Output language"

---

## Step 1: Read the story artifacts

Read from `work/active/spec-<number>/`:

- `design.md` — affected apps and modules → defines each artifact's destination.
  **Read its `## Global Architecture Impact` verdict now and carry it forward**: Step 6
  promotes it, and by then Step 5 has moved this folder to `WORKDIR_DONE`. Note the
  Yes/No, and when it is Yes the C4 level and the concrete node/edge, verbatim.
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
| Flows / diagrams | `DOC_UNIT` | `use-case` | replace the whole `flows/<slug>.md` | reconcile |
| Flows / diagrams | `DOC_UNIT` | `story` (default) | copy the Markdown artifacts as is | promote |

### When `DOC_UNIT = use-case` (living documents per use case — only if the profile declares it; the default is `story`)

`/sdd-design` produces the **complete** `flows/<slug>.md`, with its `sequenceDiagram`
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
  it's a duplicate (`/sdd-design` gave a different name to a flow that already existed).
  Don't write. Report the clash and ask for the delta to be corrected so it reuses the
  current slug/operationId, or use `/sdd-refine` on the design. Never resolve the clash by
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
   - The frontmatter's keys are whatever `<STACK_REFS>/references/flow-template.md`
     declares — this skill promotes the document, it does not police its shape. A key
     the template doesn't define is the template's problem, or the diagram gate's.

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

### When `DOC_UNIT = story` (default — copy Markdown artifacts as is)

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
strictly `/sdd-docs`'s C4 diagrams) is a single cumulative, append-only
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
# WORKDIR_ACTIVE -> WORKDIR_DONE, resolved from the profile
mv work/active/spec-<number> work/done/spec-<number>
```

`WORKDIR_ACTIVE`'s parent is tracked by git, so the move shows up in `git status` — `/sdd-commit`
picks it up from there as part of its own commit grouping.

## Step 6: Promote global architecture changes (if design.md already flagged one)

`/sdd-design` already determined, at design time, whether the story touches
global architecture — it's documented explicitly in `design.md`'s
**`## Global Architecture Impact`** section (always present, never
conditional — see PHASE 4/`../sdd-design/references/design-template.md` of `/sdd-design`).
Sync does **not** re-derive this from a git diff — it just reads the
answer and promotes it.

1. Use the `## Global Architecture Impact` verdict **read in Step 1**, while the
   artifacts were still under `WORKDIR_ACTIVE`. Don't re-open `design.md` here: Step 5
   already moved it to `WORKDIR_DONE`, and re-reading it from the old path is the one
   way this step fails silently.
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

## Step 7: Suggest /sdd-commit and close out

Report, in this order:

1. Artifacts promoted (destination paths) — or "no artifacts to promote".
2. Entry added to `docs/decisions.md` (its title) — or "no design decisions
   to record".
3. Folder archived under `work/done/spec-<number>/`.
4. `docs/architecture/` updated (what changed) — or "no global architecture
   changes".
5. Explicitly suggest: "Run `/commit spec-<number>` to group and execute the commits
   and leave the PR drafted."

Then stop — grouping/executing commits and drafting the PR is `/sdd-commit`'s job,
not this skill's.

> If a defect shows up after the close and it originates in an ambiguity or gap in
> `spec.md`, don't reopen this skill — use `/hotfix spec-<number>`.

---

## Example

A full worked run — a close-out reconciling the docs — is in
`references/example.md`. Read it when the shape of the output is in doubt.

---
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
3. `/sdd-docs` applies them directly to `containers.md` without having
   to re-analyze what changed.

Result: `containers.md` updated without any skill having to re-derive the
delta from the code.

### Example 3: automatic suggestion when /sdd-build closes

Context: `/build spec-0010` finished all tasks and the user replies "approved".

Actions:
1. Suggest: "Run `/sync spec-0010` to sync the documentation."
2. If the user confirms, run the full workflow from Step 1.
3. On close, in turn suggest `/commit spec-0010`.

Result: the story's close happens without the user having to remember the
next steps.

---

## Common Issues

The 5 that **interrupt a run** — it stops, or the call goes back to the user.
Every other failure mode is in `references/common-issues.md`, with its cause and
resolution.

| Issue | Cause | Resolution |
|---|---|---|
| `plan.md` has tasks without `[X]` | `/sdd-build` didn't finish | Stop — suggest `/build spec-<number>` |
| `plan.md` has an AC marked `✗` in `## AC Coverage` | Tasks executed, but an acceptance criterion has no test behind it | Stop — the story isn't ready to close; fix the gap, or `/hotfix spec-<number>` if it traces back to an ambiguous AC |
| Folder is already in `work/done/` | sync already ran for this story | Report it and stop |
| Current branch is the base branch | The user forgot to switch branches | Stop immediately, ask them to switch to the working branch |
| lint/test/build fails in Step 2 | Regression at close time | Stop — fix directly, or `/sdd-hotfix` if it traces back to a spec gap |

---
## Output language
**Conversational output** follows `~/.agents/references/chat-conventions.md` - the six blocks (announce, progress, question, summary, stop, handoff).

**Artifact prose follows `ARTIFACT_LANGUAGE`** (language block): the entries appended to
`docs/decisions.md` and anything you write into the living docs. Promoted content
keeps the language `/sdd-design` produced it in — never translate it on promotion.

The section names this skill reads (`## Design Decisions`, `## Global Architecture
Impact`) are structural contracts with `/sdd-design` — always English. Paths, schema
names and any other identifier follow `IDENTIFIER_LANGUAGE` (profile, language
block): promote them verbatim from the delta, and never translate one into English
because this document is written in it.
