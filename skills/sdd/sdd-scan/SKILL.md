---
name: sdd-scan
description: >
  Surveys the code a story touches and writes its context.md — the affected
  components, their entities, ports, DTOs and conventions, and the detected
  documentation gaps — without touching spec.md or deciding anything. Runs as
  the pipeline's survey step before /sdd-clarify, and again later to refresh the
  inventory when the code moved.
  Use when the user says "/sdd-scan spec-XXXX", "survey the module", "survey the
  codebase for this story", "refresh the context", "regenerate context.md", "the
  code changed since I clarified", "releva el módulo", or right after
  /sdd-prepare hands off to it.
  Do NOT use to resolve ambiguities or edit ACs (use /sdd-clarify or
  /sdd-refine), to decide the tier (use /sdd-route), to design (use
  /sdd-design), or to plan (use /sdd-plan).
---

# scan

## Overview

The only skill that surveys the code for a story and the only one that writes
`work/active/spec-<number>/context.md`. It runs in two situations:

- **First survey** — no `context.md` yet: the pipeline's survey step, between
  `/sdd-prepare` and `/sdd-clarify`, which reads the inventory as evidence.
- **Refresh** — `context.md` exists and **the code changed while the ACs didn't**: an
  item left open for days, a base branch that moved forward, a module refactored in the
  meantime.

**`context.md` is an artifact of the `full` and `standard` flows only.** A `tier: fast`
story has no survey, so this skill refuses at the gate below instead of producing one.
The way to an inventory for that story is raising the tier with `/sdd-route spec-<number>`.

**It never touches `spec.md`.** It doesn't resolve ambiguities, doesn't edit ACs,
doesn't ask about constraints. If what changed is the item and not the code, the right
skill is `/sdd-clarify` (or `/sdd-refine` if a design already exists).

**Announce at start:** "Surveying spec-<number> — <first survey | refresh>."

---

## Project profile (read first, always)

Read `.agents/profile.yaml` from the project root before anything else, as
`~/.agents/references/project-profile.md` describes: what a missing file means, how a
`null` key falls back, how a port resolves to an adapter, and why every path or command
shown here is only an example the profile overrides. The keys this skill reads are
listed under **Profile keys** in the `Contract` below.

---

## Contract

What this skill needs, what it guarantees to whoever reads `context.md` next, and what
it may not do. **Check every `Requires` row before surveying anything** — the survey is
the expensive part of the run.

**Requires**

| Condition | Check | If it fails |
|---|---|---|
| You are in the project's working directory | `pwd` == `WORKING_DIRECTORY` (absolute path, from the profile) | `cd` there before running anything |
| An item id was given | the input carries an id matching `STORY_ID_PATTERN` | Ask: "Which item do you want to refresh?" |
| The item is still open | `work/active/spec-<number>/` exists | If it's under `work/done/spec-<number>/`, `/sdd-sync` already closed it: there is nothing downstream that would read a refreshed context. Report it and stop |
| `spec.md` exists | `[ -f work/active/spec-<number>/spec.md ]` | Stop: "I couldn't find the item. Run `/sdd-spec spec-<number>` first." (a legacy `hu.md` counts) |
| The story's tier has a survey | `spec.md`'s front matter carries no `tier: fast` (absent means `full`) | Stop: "`spec-<number>` is a `tier: fast` story — that flow has no survey and no `context.md`. Nothing is deleted. If the story needs one, raise the tier with `/sdd-route spec-<number>`." |

Whether `context.md` exists decides the run — **first survey** or **refresh** — and is
never a reason to stop.

**Produces** — what `/sdd-clarify`, `/sdd-route`, `/sdd-design` and `/sdd-plan` read

- `work/active/spec-<number>/context.md` written whole from
  `<STACK_REFS>/references/context-template.md`: the inventory per affected <component>
  and a **detected gaps** section, always present even when empty
- on a refresh, every hand-written note from the previous `context.md` preserved
  (Step 4) — only what came from the code is replaced
- `spec.md` byte for byte unchanged
- a report in chat (Step 5): the inventory summary on a first survey, the **delta** on a
  refresh

**Writes** — nothing outside this list

- `work/active/spec-<number>/context.md`

Not `spec.md` (that's `/sdd-clarify` or `/sdd-refine`), not `design.md` or `plan.md`, and not
the project's source code or its living docs.

**Never**

- **Allowed (read-only git):** `git branch --show-current`, `git status --porcelain`,
  `git fetch --dry-run`.
- **Forbidden:** `git checkout`, `git pull`, `git add`, `git commit`, `git push` and
  any other state-changing git command. A stale base is warned about and surveyed as it
  stands — freshening it is `/sdd-prepare`'s job (Step 2).
- **Forbidden:** editing an AC, writing into `## Ambiguity Resolution`, or removing a
  `[NEEDS CLARIFICATION]` marker. `/sdd-scan` re-reads the code; it decides nothing.
- **Forbidden:** per-unknown precedent queries. This is an inventory, not an ambiguity
  investigation — that's `/sdd-clarify`'s job, which does make decisions.

**Escalates**

- The affected <component>s, when `MODULE_ROOT`'s subdirectories don't map to
  <component>s with certainty against `spec.md` — on a first survey, or on a refresh
  whose previous `context.md` no longer matches the item's scope (Step 2).
- A module the survey can't locate: ask for the path or keywords (Step 3), and record
  it as a gap if the answer doesn't resolve it.
- A refresh that **contradicts a decision** already recorded in `spec.md`'s
  `## Ambiguity Resolution` — e.g. the precedent that grounded it is gone. Flag it and
  point at `/sdd-clarify` or `/sdd-refine`; write the refreshed context anyway, but never
  resolve the contradiction here.

**Degrades**

- `CODE_SURVEY` resolving to an adapter without call paths → the inventory is
  unaffected (every adapter returns it); say in the wrap-up which depth you got.
- `MODULE_ROOT` (stack block) inconclusive → ask which <component>s the item
  affects.
- `STACK_REFS` unset → the skill's local (generic) `references/`. When it is set, each
  `<STACK_REFS>/<file>` resolves across the listed packs most specific first, then to
  the same local `references/`.

**Reverting** — `context.md` is written whole, so a refresh you didn't want is
undone with `git checkout -- work/active/spec-<number>/context.md` once the story
workspace is tracked. Before the story's first commit there is nothing to restore,
which is why Step 4 carries the hand-written notes across instead of trusting git.

**Profile keys**

- `STORY_ID_PATTERN`, `WORKDIR_ACTIVE`, `WORKDIR_DONE` — the item's id and workspace,
  written throughout this document as `spec-<number>` and `work/active/spec-<number>/`
- `WORKING_DIRECTORY` — the first `Requires` row
- `BASE_BRANCH` — the fresh-base check in Step 2
- `COMPONENT_TERM` and the stack block — the term for a deployable unit, and the code
  artifacts to locate per module
- `STACK_REFS` — `scan-guide.md` (progressive disclosure in Step 3) and
  `context-template.md` (the shape of `context.md` in Step 4), resolved across the
  listed packs most specific first
- `MODULE_ROOT` (stack block) — the folder where the code lives: its subdirectories are
  the <component>s, and each component's docs (`<component>/README.md`, `<component>/docs/`)
  feed the gap review
- `CODE_SURVEY` (port) — the survey itself; its adapters decide the depth
- `ARTIFACT_LANGUAGE`, `OUTPUT_LANGUAGE`, `IDENTIFIER_LANGUAGE` — see "Output language"

---

## Step 1 — Prerequisites

Extract `spec-<number>` from the input and run the `Requires` checks of the `Contract`,
all of them, before anything else:

```bash
[ -f work/active/spec-<number>/spec.md ] && echo "OK" || echo "MISSING"
grep -E '^tier:' work/active/spec-<number>/spec.md || echo "TIER ABSENT (full)"
[ -f work/active/spec-<number>/context.md ] && echo "REFRESH" || echo "FIRST SURVEY"
```

## Step 2 — Determine what to survey

1. Read `spec.md` (ACs and framing) and, on a refresh, the current `context.md`.
2. **First survey:** list `MODULE_ROOT`'s subdirectories as the <component>s (a
   `README.md` there is the catalog) and match them against `spec.md`. If they can't be
   identified with certainty, ask — it can't be deferred, without a component there's
   nothing to survey:
   > "Which <COMPONENT_TERM>(s) does this item affect? (e.g. `apps/ledger`)"

   **Refresh:** the components come from the current `context.md`. If the item's scope
   changed since then, re-derive them the same way and report which were added or
   dropped.
3. Verify (read-only, never mutate git) that each component sits on a fresh base:

```bash
git -C <component> branch --show-current
git -C <component> status --porcelain
git -C <component> fetch --dry-run 2>&1 | head -1
```

If any isn't on `BASE_BRANCH`, has uncommitted changes, or is behind →
warn and continue: you survey whatever is checked out.

## Step 3 — Survey (parallel)

One `CODE_SURVEY.run` call **per component**, all in the same response, passing the
module name as `<module>` and the item's keywords. A graph adapter returns symbols
with verbatim source, call paths, blast radius and framework routes; an agent or
inline adapter returns the inventory without call paths. Both are enough for this
skill — `context.md` needs the inventory, not the graph.

With the results:
1. Identify the key files and read **only those** with Read, applying the progressive
   disclosure from `<STACK_REFS>/references/scan-guide.md` (if no pack in `STACK_REFS`
   provides it: the local `references/scan-guide.md`) — don't explore the whole tree.
2. Review each component's docs (`<component>/README.md`, `<component>/docs/` under
   `MODULE_ROOT`) and note documentation gaps.

> **Scope:** this is an inventory, not an ambiguity investigation. No per-unknown
> precedent queries — that's `/sdd-clarify`'s job, which does make decisions.

### Fallback — CodeGraph unavailable

Apply the `Degrades` chain of the `Contract`, and suggest `codegraph init` once (it's
cheap) so the next refresh doesn't pay the fallback again.

If the survey reports it couldn't find the module → ask:
> "Do you know where the related module lives in `<component>`? You can give me the path or keywords."

## Step 4 — Rewrite context.md

Pour the inventory into `<STACK_REFS>/references/context-template.md` (if no pack in
`STACK_REFS` provides it: the local `references/context-template.md`) and overwrite
`work/active/spec-<number>/context.md`.

On a refresh, keep from the previous `context.md` any note that doesn't come from the
code (observations added by hand). Everything surveyed gets replaced.

Always include the **detected gaps** section.

## Step 5 — Report

**First survey** — a short inventory summary: components, key artifacts found, gaps.
Then: "Next: `/sdd-clarify spec-<number>`."

**Refresh** — what's valuable is **what changed**, not the whole inventory:

```
Context for spec-<number> refreshed — <C> component(s).

Changes since the previous survey:
  + <new symbol/file>
  ~ <signature or field that changed>
  − <what's gone>

Gaps: <g>  ·  Unchanged in: <short list>
```

If nothing changed, say it in one line: "No changes since the previous context."

If something that changed **contradicts a decision** recorded in `spec.md`'s
`## Ambiguity Resolution` (e.g. the precedent that grounded a decision is gone), flag
it explicitly and suggest `/sdd-clarify` or `/sdd-refine`. Don't fix it here — `/sdd-scan` doesn't
decide.

Stop — do not start the next stage. After a refresh, `/sdd-status spec-<number>` names it.

---

## Common Issues

The ones that **interrupt a run** — it stops, or the call goes back to the user.
Every other failure mode is in `references/common-issues.md`, with its cause and
resolution.

| Issue | Cause | Resolution |
|-------|-------|------------|
| The story is `tier: fast` | That tier has no survey, so its flow never has a `context.md` | Stop. Delete nothing. Raising the tier with `/sdd-route spec-<number>` is the way to an inventory |
| `spec.md` doesn't exist | `/sdd-spec` never ran | STOP: run `/sdd-spec spec-<number>` first |
| The components can't be identified | `spec.md` names no module and `MODULE_ROOT` doesn't settle it | Ask which <component>s the item affects (Step 2) |
| The item is already in `work/done/` | `/sdd-sync` closed it | Stop — nothing downstream reads a refreshed context once the story is archived |

---

## Example

A full worked run — a refreshed context.md and its delta report — is in
`references/example.md`. Read it when the shape of the output is in doubt.

---

## Output language
**Conversational output** follows `~/.agents/references/chat-conventions.md` - the six blocks (announce, progress, question, summary, stop, handoff).

**Artifact prose follows `ARTIFACT_LANGUAGE`** (language block): `context.md`'s inventory
descriptions and detected gaps.

The **section headings** stay English regardless of that key (`/sdd-design` and `/sdd-plan`
read them by name). The **identifiers** — paths, classes, fields, endpoints — are
quoted from the code verbatim and therefore sit on `IDENTIFIER_LANGUAGE` (profile,
language block): copy what the code says, never a translation of it.
