---
name: sdd-scan
description: >
  Refreshes an item's context.md — re-surveys the affected components and
  rewrites the inventory — without touching spec.md or re-resolving any
  ambiguity. Use when the user says "/sdd-scan spec-XXXX", "refresh the context",
  "regenerate context.md", "the code changed since I clarified", "survey the
  module again", or when a long-running item needs its inventory brought
  up to date before /sdd-design or /sdd-plan. Do NOT use as the pipeline's survey
  step — /sdd-clarify already produces context.md along with the precise spec.md.
  Do NOT use to resolve ambiguities or edit ACs (use /sdd-clarify or /sdd-refine), to
  design (use /sdd-design), or to plan (use /sdd-plan).
---

# scan

## Overview

A **refresh** skill, not a pipeline step. It re-surveys the affected components and
rewrites `work/active/spec-<number>/context.md` with the updated inventory.

`/sdd-clarify` already produces `context.md` in its I phase, along with the precise
`spec.md`. `/sdd-scan` exists for the case where **the code changed and the ACs didn't**:
an item left open for several days, a base branch that moved forward, a module
refactored in the meantime.

**`context.md` is an artifact of the `full` and `standard` flows only.** A `tier: fast`
story declares a flow with no clarification pass and no context inventory, so this skill
refuses at the gate below instead of producing one: the artifact is not part of the flow
the story declared, and nothing is deleted. The way to an inventory for that story is
raising the tier with `/sdd-refine spec-<number>`: the clarification pass then
establishes `context.md`, and this skill is what keeps it current.

**It never touches `spec.md`.** It doesn't resolve ambiguities, doesn't edit ACs,
doesn't ask about constraints. If what changed is the item and not the code, the right
skill is `/sdd-clarify` (or `/sdd-refine` if a design already exists).

**Announce at start:** "Refreshing the context for spec-<number>."

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
| `spec.md` exists | `[ -f work/active/spec-<number>/spec.md ]` | Stop: "I couldn't find the item. Run `/spec spec-<number>` first." (a legacy `hu.md` counts) |
| The story's tier writes a `context.md` | `spec.md`'s front matter carries no `tier: fast` (absent means `full`) | Stop: "`spec-<number>` is a `tier: fast` story — that flow has no clarification pass, so it has no `context.md` and `/sdd-scan` has nothing to refresh. Nothing is deleted. If the story needs a context inventory, raise the tier with `/sdd-refine spec-<number>`." |
| `context.md` exists | `[ -f work/active/spec-<number>/context.md ]` | Redirect: "This item hasn't been clarified yet. Run `/clarify spec-<number>` — it produces `context.md` along with the precise `spec.md`. `/sdd-scan` only refreshes one that already exists." |

Read the tier row **before** the `context.md` row, and read `spec.md`'s front matter
before either: a `fast` story has no `context.md` by construction, so the existence check
below it would answer with a redirect to `/sdd-clarify`, a stage that tier never runs.
The order of the two rows is the difference between a correct refusal and a wrong
instruction.

**Produces** — indistinguishable from what `/sdd-clarify` leaves, by design, in the flows
that have a `context.md` (`full`, `standard`)

- `work/active/spec-<number>/context.md` regenerated whole from
  `<STACK_REFS>/references/context-template.md`, with the same inventory per affected
  <component> and the same **detected gaps** section, always present even when empty.
  `/sdd-design` and `/sdd-plan` read `context.md` without knowing which skill wrote it, so the
  shape has to match `/sdd-clarify`'s exactly. A `tier: fast` story never reaches this
  bullet: that flow has no `context.md` to produce (the gate in `Requires`)
- every hand-written note from the previous `context.md` preserved (Step 4) — only what
  came from the code is replaced
- `spec.md` byte for byte unchanged
- a **delta** report in chat (Step 5): what was added, changed and removed since the
  previous survey. This is the run's actual product; the full inventory is on disk

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
  investigation — that's `/sdd-clarify`'s job, and it costs what `/sdd-clarify` costs.

**Escalates**

- The affected <component>s, when `MODULE_ROOT`'s subdirectories don't map to
  <component>s with certainty
  and the previous `context.md` no longer matches the item's scope (Step 2).
- A module the survey can't locate: ask for the path or keywords (Step 3), and record
  it as a gap if the answer doesn't resolve it.
- A refresh that **contradicts a decision** already recorded in `spec.md`'s
  `## Ambiguity Resolution` — e.g. the precedent that grounded it is gone. Flag it and
  point at `/sdd-clarify` or `/sdd-refine`; write the refreshed context anyway, but never
  resolve the contradiction here.

**Degrades** — the same fallback chain as `/sdd-clarify`, minus the precedent half it
doesn't run

- `CODE_SURVEY` resolving to an adapter without call paths → the inventory is
  unaffected (every adapter returns it); say in the wrap-up which depth you got.
- `MODULE_ROOT` (stack block) inconclusive → ask which <component>s the item
  affects.
- `STACK_REFS` unset → the skill's local (generic) `references/`. When it is set, each
  `<STACK_REFS>/<file>` resolves across the listed packs most specific first, then to
  the same local `references/`.

**Reverting** — `context.md` is regenerated whole, so a refresh you didn't want is
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
[ -f work/active/spec-<number>/context.md ] && echo "CTX OK" || echo "CTX MISSING"
```

The tier line comes before the `context.md` line for the reason the `Requires` note
gives: in a `tier: fast` story the missing file is the tier's shape, not unfinished
clarification, and the run stops there.

## Step 2 — Determine what to survey

1. Read `spec.md` (ACs and framing) and the current `context.md`.
2. The components to survey come from the current `context.md`. If the item's scope
   changed since then, re-derive them from `MODULE_ROOT` against the
   `spec.md` content, and report which ones are added or dropped.
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

Keep from the previous `context.md` any note that doesn't come from the code
(observations added by hand). Everything surveyed gets replaced.

Always include the **detected gaps** section.

## Step 5 — Report the delta

What's valuable about a refresh is **what changed**, not the whole inventory:

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

Stop — do not start the next stage: `/sdd-design` in `full` under `tdd`, and `/sdd-plan`
in `standard` or in `full` under `evidence`.

---

## Common Issues

The 4 that **interrupt a run** — it stops, or the call goes back to the user.
Every other failure mode is in `references/common-issues.md`, with its cause and
resolution.

| Issue | Cause | Resolution |
|-------|-------|------------|
| The story is `tier: fast` | That tier runs no clarification pass, so its flow never has a `context.md` | Stop. Delete nothing — the artifact is absent because the story's flow does not include it. Raising the tier with `/sdd-refine spec-<number>` is the way to an inventory; `/sdd-clarify` then establishes it |
| `context.md` doesn't exist | The item was never clarified (and its tier runs a clarification pass) | Redirect to `/clarify spec-<number>`, which produces it |
| `spec.md` doesn't exist | `/sdd-spec` never ran | STOP: run `/spec spec-<number>` first |
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
