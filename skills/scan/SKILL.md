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

**Output:** `work/active/spec-<number>/context.md` (regenerated)

---

## Project profile (read first, always)

Before anything else, read `.agents/profile.md` (at the root of the current project): it defines the ID pattern,
the artifact paths, the **target stack** and the **documentation paths**. Everything
this skill looks for in the code comes from section 7. If it doesn't exist, tell the user to create it by copying `~/.agents/sdd-profile.template.md` to the project's `.agents/profile.md`, and stop: without a profile you don't know this project's conventions.

**CRITICAL — Working directory:** before running anything, verify you are in the project's working directory (`WORKING_DIRECTORY` from the profile — absolute path). If `pwd` doesn't match `WORKING_DIRECTORY`, `cd` there before continuing.

| In this document | Key in profile.md |
|---|---|
| `spec-<number>` | `STORY_ID_PATTERN` |
| `work/active/spec-<number>/` | `WORKDIR_ACTIVE` |
| "component" in the prose | `COMPONENT_TERM` |
| `develop` | `BASE_BRANCH` |
| component catalog, per-component docs | `DOCS_COMPONENTS_INDEX`, `DOCS_COMPONENT_README`, `DOCS_COMPONENT_ARCH` |
| indexed graph + `codegraph_explore` | `CODEGRAPH` (section 10) |
| `code-explorer` subagent | `EXPLORER_SUBAGENT` / `EXPLORER_MODEL` (section 9) |

---

## Step 1 — Prerequisites

Extract `spec-<number>` from the input. If it's missing, ask: "Which item do you want to refresh?"

```bash
[ -f work/active/spec-<number>/spec.md ] && echo "OK" || echo "MISSING"
[ -f work/active/spec-<number>/context.md ] && echo "CTX OK" || echo "CTX MISSING"
```

- If `spec.md` is missing → STOP: "I couldn't find the item. Run `/spec spec-<number>` first."
  (Legacy items: `hu.md` counts as `spec.md`.)
- If `context.md` **doesn't exist** → say so and redirect: "This item hasn't been
  clarified yet. Run `/clarify spec-<number>` — it produces `context.md` along with the
  precise `spec.md`. `/scan` only refreshes one that already exists."

## Step 2 — Determine what to survey

1. Read `spec.md` (ACs and framing) and the current `context.md`.
2. The components to survey come from the current `context.md`. If the item's scope
   changed since then, re-derive them from `DOCS_COMPONENTS_INDEX` against the
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

One `codegraph_explore` call **per component**, all in the same response, with the
module name and the item's keywords. It returns symbols with verbatim source,
call paths, blast radius and framework routes.

With the results:
1. Identify the key files and read **only those** with Read, applying the progressive
   disclosure from `<STACK_REFS>/references/scan-guide.md` (default: the local
   `references/scan-guide.md`) — don't explore the whole tree.
2. Review `DOCS_COMPONENT_README` / `DOCS_COMPONENT_ARCH` and note documentation gaps.

> **Scope:** this is an inventory, not an ambiguity investigation. No per-unknown
> precedent queries — that's `/clarify`'s job, which does make decisions.

### Fallback — CodeGraph unavailable

If `CODEGRAPH` is `no` or `.codegraph/` doesn't exist: suggest `codegraph init` (once,
cheap) and meanwhile delegate to the `EXPLORER_SUBAGENT` subagent (default
`code-explorer`), one call per component **in parallel**, with an explicit `model:` =
`EXPLORER_MODEL`. If the host agent doesn't support subagents, explore inline with
Read/Grep/Glob.

If the subagent reports it couldn't find the module → ask:
> "Do you know where the related module lives in `<component>`? You can give me the path or keywords."

## Step 4 — Rewrite context.md

Pour the inventory into `<STACK_REFS>/references/context-template.md` (default: the
local `references/context-template.md`) and overwrite
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

---

## CRITICAL: Output Language

**Artifact prose follows `ARTIFACT_LANGUAGE`** (profile, section 5 — falls back to
`OUTPUT_LANGUAGE` if the project doesn't declare it): `context.md`'s inventory
descriptions and detected gaps. Never translate them to English on your own.

Two things stay in English regardless of that key: the **section headings** (`/design`
and `/plan` read them by name) and the **identifiers** quoted from the code — paths,
classes, fields, endpoints (`IDENTIFIER_LANGUAGE`).

**Chat interaction follows the user's language** (`OUTPUT_LANGUAGE` in the profile).
The delta-report sample above is written in English; render it in the user's language
when that differs.
