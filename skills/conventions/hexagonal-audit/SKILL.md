---
name: hexagonal-audit
description: >
  Audits an existing codebase against the hexagonal rules (dependency direction,
  layer topology, ports & bindings, error handling) and produces a ranked
  findings report — then bridges into the SDD pipeline by generating draft
  spec.md stories (work/active/<story-id>/spec.md) whose ACs derive from the HIGH
  and MEDIUM findings, ready for /clarify → /design → /plan → /build. Read-only:
  never edits code unless the user asks for the fixes to be applied. Use when
  the user says "audit the project", "review the architecture", "audit it",
  "find architecture improvements", "does this respect hexagonal", or wants to
  turn architecture debt into backlog stories. Do NOT use to build modules (use
  /hexagonal-architecture), to survey the codebase for an item (use /clarify),
  or for C4 diagrams of the whole system (use /docs).
metadata:
  author: styve
  version: "1.0"
  tags: [hexagonal, audit, ports-adapters, debt, backlog]
  category: architecture
---

# Hexagonal Audit — AUDIT Mode

**Announce at start:** "I'll audit the architecture against the rules. Starting by mapping the terrain."

---

## Project profile (read first, always)

Read `.agents/profile.yaml` at the root of the current project before anything else.
If it doesn't exist, tell the user to run `/bootstrap` and stop — without a profile you
don't know this project's conventions. The file is a YAML map of named blocks; a key
holding `null` is not configured, so use the fallback this skill declares for it —
never a guessed value.

Any path, command or stack convention shown in this document is an example resolution;
the profile's value wins. The keys this skill reads are listed under **Profile keys**
in the `Contract` below.

---

## Contract

What this skill needs, what it hands to `/clarify`, and what it may not do. **Check
every `Requires` row before mapping anything** — auditing against rules the project
never adopted produces findings nobody asked for, and the survey is the expensive part.

**Requires**

| Condition | Check | If it fails |
|---|---|---|
| You are in the project's working directory | `pwd` == `WORKING_DIRECTORY` (absolute path, from the profile) | `cd` there before running anything |
| The project actually declares this architecture | `ARCHITECTURE` (stack block) is hexagonal / ports-and-adapters | Ask before continuing: the 13 dimensions score against rules this project may never have adopted, and every finding would be a false positive |
| The rule source is readable | `../hexagonal-architecture/references/rules.md` exists | Stop: without the canonical layout there is nothing to score against |
| The story workspace exists | `work/active/` is present | Create it — the `spec.md` drafts need it — and confirm `WORKDIR_ACTIVE` in the profile |
| The ids to generate are free | for each resolved `<story-id>`, `work/active/<story-id>/` does **not** exist | Never overwrite: pick the next free id, or ask if the id came from a tracker key |

**Produces** — this is what `/clarify` looks for

- `docs/audits/<date>-<scope>.md`: the ranked report (HIGH/MEDIUM/LOW), each finding
  with its `file:line`, the rule broken, the concrete cost and the smallest fix, plus
  the score per dimension and the prioritized 3–5 plan
- one or more `work/active/<story-id>/spec.md` following
  `../../sdd/spec/references/spec-template.md`, each with:
  - **at least one numbered AC** under `## Acceptance Criteria`, written as expected
    system behavior. This is a hard gate, not a stylistic note: `/clarify` stops on an
    item with no ACs, so an audit story without them is dead on arrival
  - one AC per HIGH/MEDIUM finding; LOW findings as a hygiene checklist in the body,
    never as ACs
  - an `## Audit Context` section pointing at the report the ACs came from

**Writes** — nothing outside this list

- `docs/audits/<date>-<scope>.md`
- `work/active/<story-id>/spec.md` — new files only, never over an existing workspace

Not the project's source or test files. Not `context.md`, `design.md` or `plan.md` of
the items it drafts — those come later, from `/clarify` onward.

**Never**

- **Forbidden:** editing code. AUDIT mode produces findings and stories; the fixes get
  built with `/plan` + `/build` like any other item. This holds even when the fix is
  one line and obvious — that one line is what the story is for.
- **Forbidden:** reporting a detector hit as a finding without reading the file. Every
  hit is a lead; a finding cites `file:line` because someone looked.
- **Forbidden:** deriving ACs from LOW findings, or writing a story with zero ACs.
- **Forbidden:** `git add`, `git commit`, `git push` and any other state-changing git
  command.

**Escalates**

- The project not declaring a hexagonal architecture (see `Requires`).
- `STORY_ID_MODE = tracker-code` → ask for the key; ids are never invented in that mode.
- A resolved `<story-id>` whose folder already exists → ask rather than overwrite.
- A request to apply the fixes → that's item work: point at the drafts and the pipeline.

**Degrades**

- The project's framework skill (`stack.SKILLS`) declares none, or ships no detector
  → map manually with the language's `find`/`grep` equivalents; the 13 dimensions are
  stack-agnostic and stay.
- The framework skill's `audit-smells.md` absent → score the generic dimensions only, and say so
  in the report rather than inventing stack-specific smells.
- `STORY_ID_MODE = sequential` with no items yet → start the numbering at the profile's
  `STORY_ID_PREFIX` + 1.

**Reverting** — everything this skill writes is a **new** file: the report and the
drafts. Undoing an audit is deleting `docs/audits/<date>-<scope>.md` and the
`work/active/<story-id>/` folders it created. Nothing existing is overwritten, which is
why the "ids are free" row in `Requires` is the check that makes this true.

**Profile keys**

- `STORY_ID_PATTERN`, `STORY_ID_MODE`, `STORY_ID_PREFIX`, `STORY_KEY_PATTERN` — how the
  drafted items are named
- `WORKDIR_ACTIVE` — where the drafts land, written here as `work/active/<story-id>/`
- `WORKING_DIRECTORY` — the first `Requires` row
- `ARCHITECTURE`, `MODULE_ROOT` and the stack block — what to score against and where the
  modules live
- `COMPONENT_TERM` — the term for a deployable unit
- `SKILLS` (stack block) — the framework skill whose references carry the detector
  (`audit-scan.sh`) and smell catalog (`audit-smells.md`); on a Nest project the
  `nestjs` skill ships both
- `ARTIFACT_LANGUAGE`, `OUTPUT_LANGUAGE`, `IDENTIFIER_LANGUAGE` — see "Output language"

---

## Procedure

Follow `references/audit-guide.md` — the complete procedure (map the terrain, score
the 13 dimensions, write findings, auditor's rules). Summary:

1. **Map the terrain** (read-only): inventory of modules and layers; if the framework
   skill the profile's `SKILLS` declares provides a detector (e.g. the `nestjs` skill:
   `~/.agents/skills/conventions/nestjs/references/audit-scan.sh <src>`), run it; otherwise map
   with the language's `find`/grep. Every hit is a lead, not a
   finding — read the file before reporting.
2. **Score 0–3 per dimension** (13 dimensions, total /39). Anything below 2 is a
   finding. Load the rules from `../hexagonal-architecture/references/rules.md`
   (single source) to size against the canonical layout.
3. **Write findings** ranked by severity, each with `file:line`, the rule broken, the
   concrete cost and the smallest fix. Close with the prioritized 3–5 plan.
4. **Bridge to the pipeline — generate `spec.md`** (Step 4 below).

## Step 4: Bridge to the pipeline (generate stories)

With the final report, turn the findings into SDD pipeline work:

1. **One story per audited module** (or per cluster of findings if the module has
   few): create `work/active/<story-id>/spec.md` with the structure of `/spec`'s
   template (`../../sdd/spec/references/spec-template.md`).
2. **The ID** is resolved with the profile's `STORY_ID_MODE` (sequential → next free
   number; name → slug; tracker-code → ask for the key).
3. **Every HIGH/MEDIUM finding → one verifiable AC**, written as expected system
   behavior (e.g. "Controller X must not contain business logic" / "The domain must
   not import the framework"). LOW findings go as a hygiene checklist in the story
   body, not as ACs.
4. Each `spec.md` carries an `## Audit Context` section referencing the full report
   (`docs/audits/<date>-<scope>.md` — save the report there).
5. Before closing, verify the gate the `Contract` states: every generated `spec.md` has
   at least one numbered AC. Count them — a draft with zero is one `/clarify` will
   refuse, so it isn't a draft, it's a dead file.
6. Report and suggest the next step: `/clarify <id>`.

---

## Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| The framework skill's detector won't run (no bash / another language) | Skill with no script for the stack | Map manually with the language's find/grep; per-stack detailers live in the framework skill's `audit-smells.md` |
| `work/active/` doesn't exist | Pipeline never started in this repo | Create it (the spec.md drafts require it) and confirm the profile's `WORKDIR_ACTIVE` |
| The resolved `<story-id>` already exists | An earlier audit, or a real item, uses that id | Ask — never overwrite a workspace; take the next free id instead |
| A generated `spec.md` has no ACs | Every finding for that module was LOW | Don't leave the draft: fold the checklist into an existing story, or drop it — `/clarify` rejects an item with no ACs |
| Too many findings | Unprioritized report | Only HIGH/MEDIUM generate ACs; LOW stay as a checklist |
| The user wants you to apply the fixes | Mode confusion | That's story work: generate the `spec.md` files and let them go through `/plan` + `/build` — AUDIT never edits code |
| The generated `spec.md` doesn't follow the template | Inconsistent format | Consult `../../sdd/spec/references/spec-template.md` and the profile's `STORY_ID_MODE` |

---

## Output language
**Conversational output** follows `~/.agents/references/chat-conventions.md` - the six blocks (announce, progress, question, summary, stop, handoff).

**Artifact prose follows `ARTIFACT_LANGUAGE`** (profile, language block — falls back to
`OUTPUT_LANGUAGE` if the project doesn't declare it): the ACs of the generated
`spec.md` drafts and the finding descriptions of the report saved under
`docs/audits/`. Never translate them to English on your own.

Section headings stay in English (the pipeline reads them by name), and so do rule
names, severities, paths and layer names — they are identifiers
(`IDENTIFIER_LANGUAGE`).

**Chat interaction follows the user's language** (`OUTPUT_LANGUAGE` in the profile).
