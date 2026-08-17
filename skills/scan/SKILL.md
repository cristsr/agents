---
name: scan
description: >
  Refreshes an item's context.md — re-surveys the affected components and
  rewrites the inventory — without touching spec.md or re-resolving any
  ambiguity. Use when the user says "/scan spec-XXXX", "refresh the context",
  "regenerate context.md", "the code changed since I clarified", "survey the
  module again", or when a long-running item needs its inventory brought
  up to date before /design or /plan. Do NOT use as the pipeline's survey
  step — /clarify already produces context.md along with the precise spec.md.
  Do NOT use to resolve ambiguities or edit ACs (use /clarify or /refine), to
  design (use /design), or to plan (use /plan).
---

# scan

## Overview

A **refresh** skill, not a pipeline step. It re-surveys the affected components and
rewrites `work/active/spec-<number>/context.md` with the updated inventory.

`/clarify` already produces `context.md` in its I phase, along with the precise
`spec.md`. `/scan` exists for the case where **the code changed and the ACs didn't**:
an item left open for several days, a base branch that moved forward, a module
refactored in the meantime.

**It never touches `spec.md`.** It doesn't resolve ambiguities, doesn't edit ACs,
doesn't ask about constraints. If what changed is the item and not the code, the right
skill is `/clarify` (or `/refine` if a design already exists).

**Announce at start:** "Refreshing the context for spec-<number>."

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

What this skill needs, what it guarantees to whoever reads `context.md` next, and what
it may not do. **Check every `Requires` row before surveying anything** — the survey is
the expensive part of the run.

**Requires**

| Condition | Check | If it fails |
|---|---|---|
| You are in the project's working directory | `pwd` == `WORKING_DIRECTORY` (absolute path, from the profile) | `cd` there before running anything |
| An item id was given | the input carries an id matching `STORY_ID_PATTERN` | Ask: "Which item do you want to refresh?" |
| The item is still open | `work/active/spec-<number>/` exists | If it's under `work/done/spec-<number>/`, `/sync` already closed it: there is nothing downstream that would read a refreshed context. Report it and stop |
| `spec.md` exists | `[ -f work/active/spec-<number>/spec.md ]` | Stop: "I couldn't find the item. Run `/spec spec-<number>` first." (a legacy `hu.md` counts) |
| `context.md` exists | `[ -f work/active/spec-<number>/context.md ]` | Redirect: "This item hasn't been clarified yet. Run `/clarify spec-<number>` — it produces `context.md` along with the precise `spec.md`. `/scan` only refreshes one that already exists." |

**Produces** — indistinguishable from what `/clarify` leaves, by design

- `work/active/spec-<number>/context.md` regenerated whole from
  `<STACK_REFS>/references/context-template.md`, with the same inventory per affected
  <component> and the same **detected gaps** section, always present even when empty.
  `/design` and `/plan` read `context.md` without knowing which skill wrote it, so the
  shape has to match `/clarify`'s exactly
- every hand-written note from the previous `context.md` preserved (Step 4) — only what
  came from the code is replaced
- `spec.md` byte for byte unchanged
- a **delta** report in chat (Step 5): what was added, changed and removed since the
  previous survey. This is the run's actual product; the full inventory is on disk

**Writes** — nothing outside this list

- `work/active/spec-<number>/context.md`

Not `spec.md` (that's `/clarify` or `/refine`), not `design.md` or `plan.md`, and not
the project's source code or its living docs.

**Never**

- **Allowed (read-only git):** `git branch --show-current`, `git status --porcelain`,
  `git fetch --dry-run`.
- **Forbidden:** `git checkout`, `git pull`, `git add`, `git commit`, `git push` and
  any other state-changing git command. A stale base is warned about and surveyed as it
  stands — freshening it is `/prepare`'s job (Step 2).
- **Forbidden:** editing an AC, writing into `## Ambiguity Resolution`, or removing a
  `[NEEDS CLARIFICATION]` marker. `/scan` re-reads the code; it decides nothing.
- **Forbidden:** per-unknown precedent queries. This is an inventory, not an ambiguity
  investigation — that's `/clarify`'s job, and it costs what `/clarify` costs.

**Escalates**

- The affected <component>s, when `MODULE_ROOT`'s subdirectories don't map to
  <component>s with certainty
  and the previous `context.md` no longer matches the item's scope (Step 2).
- A module the survey can't locate: ask for the path or keywords (Step 3), and record
  it as a gap if the answer doesn't resolve it.
- A refresh that **contradicts a decision** already recorded in `spec.md`'s
  `## Ambiguity Resolution` — e.g. the precedent that grounded it is gone. Flag it and
  point at `/clarify` or `/refine`; write the refreshed context anyway, but never
  resolve the contradiction here.

**Degrades** — the same fallback chain as `/clarify`, minus the precedent half it
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
[ -f work/active/spec-<number>/context.md ] && echo "CTX OK" || echo "CTX MISSING"
```

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
> precedent queries — that's `/clarify`'s job, which does make decisions.

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
it explicitly and suggest `/clarify` or `/refine`. Don't fix it here — `/scan` doesn't
decide.

Stop — do not start the design.

---

## Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| `context.md` doesn't exist | The item was never clarified | Redirect to `/clarify spec-<number>`, which produces it |
| `spec.md` doesn't exist | `/spec` never ran | STOP: run `/spec spec-<number>` first |
| The item's scope changed | ACs were added since the last survey | Re-derive components from `spec.md` and report the change |
| Module not found | New or renamed module | Record it as a gap in `context.md`; don't block |
| The refresh contradicts a decision already made | The code changed under the item's feet | Flag it and suggest `/clarify`; `/scan` never edits `spec.md` |
| Component off `BASE_BRANCH` | Base not prepared | Warn and continue; suggest `/prepare` |
| The item is already in `work/done/` | `/sync` closed it | Stop — nothing downstream reads a refreshed context once the story is archived |

---

## Output language
**Conversational output** follows `~/.agents/references/chat-conventions.md` - the six blocks (announce, progress, question, summary, stop, handoff).

**Artifact prose follows `ARTIFACT_LANGUAGE`** (profile, language block — falls back to
`OUTPUT_LANGUAGE` if the project doesn't declare it): `context.md`'s inventory
descriptions and detected gaps. Never translate them to English on your own.

Two things stay in English regardless of that key: the **section headings** (`/design`
and `/plan` read them by name) and the **identifiers** quoted from the code — paths,
classes, fields, endpoints (`IDENTIFIER_LANGUAGE`).

**Chat interaction follows the user's language** (`OUTPUT_LANGUAGE` in the profile).
The delta-report sample above is written in English; render it in the user's language
when that differs.
