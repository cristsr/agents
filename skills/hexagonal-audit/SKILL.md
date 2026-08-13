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
  or for C4 diagrams of the whole system (use /architecture).
metadata:
  author: styve
  version: "1.0"
  tags: [hexagonal, audit, ports-adapters, debt, backlog]
  category: architecture
---

# Hexagonal Audit — AUDIT Mode

**Announce at start:** "I'll audit the architecture against the rules. Starting by mapping the terrain."

**Output:**
- A ranked findings report (HIGH/MEDIUM/LOW).
- One or more draft `work/active/<story-id>/spec.md` files derived from the findings,
  so the fix enters the SDD pipeline (see Step 4).
- **Never edit code in AUDIT mode** unless the user asks for the fixes to be applied.

---

## Project profile (read first, always)

Read `.agents/profile.md` at the root of the current project before anything else. If it
doesn't exist, tell the user to copy `~/.agents/sdd-profile.template.md` to
`.agents/profile.md` and stop — without a profile you don't know this project's
conventions. Then verify `pwd` matches `WORKING_DIRECTORY` (absolute path) and `cd`
there if it doesn't, before running any command.

**The literals in this document are only an example resolution.** The real values come
from the project's `profile.md`; if they differ, the profile wins:

| In this document | Key in profile.md |
|---|---|
| `spec-<number>` | `STORY_ID_PATTERN` |
| `work/active/spec-<number>/` | `WORKDIR_ACTIVE` |
| "microservice" in the prose | `COMPONENT_TERM` (section 7) |
| stack / conventions | section 7 + `<STACK_REFS>` (per-stack pack) |

---

## Procedure

Follow `references/audit-guide.md` — the complete procedure (map the terrain, score
the 13 dimensions, write findings, auditor's rules). Summary:

1. **Map the terrain** (read-only): inventory of modules and layers; if the stack's
   pack provides a detector (e.g. TS/NestJS: `<STACK_REFS>/architecture/audit-scan.sh <src>`),
   run it; otherwise map with the language's `find`/grep. Every hit is a lead, not a
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
   template (`../spec/references/spec-template.md`).
2. **The ID** is resolved with the profile's `STORY_ID_MODE` (sequential → next free
   number; name → slug; tracker-code → ask for the key).
3. **Every HIGH/MEDIUM finding → one verifiable AC**, written as expected system
   behavior (e.g. "Controller X must not contain business logic" / "The domain must
   not import the framework"). LOW findings go as a hygiene checklist in the story
   body, not as ACs.
4. Each `spec.md` carries an `## Audit Context` section referencing the full report
   (`docs/audits/<date>-<scope>.md` — save the report there).
5. Report and suggest the next step: `/clarify <id>`.

CRITICAL: Don't resolve the findings in the code — AUDIT generates stories; the fixes
get built with `/plan` + `/build` like any other.

---

## Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| The pack's detector won't run (no bash / another language) | Pack with no script for the stack | Map manually with the language's find/grep; per-stack detailers live in the pack's `audit-smells.md` |
| `work/active/` doesn't exist | Pipeline never started in this repo | Create it (the spec.md drafts require it) and confirm the profile's `WORKDIR_ACTIVE` |
| Too many findings | Unprioritized report | Only HIGH/MEDIUM generate ACs; LOW stay as a checklist |
| The user wants you to apply the fixes | Mode confusion | That's story work: generate the `spec.md` files and let them go through `/plan` + `/build` — AUDIT never edits code |
| The generated `spec.md` doesn't follow the template | Inconsistent format | Consult `../spec/references/spec-template.md` and the profile's `STORY_ID_MODE` |

---

## CRITICAL: Output Language

**Artifact prose follows `ARTIFACT_LANGUAGE`** (profile, section 5 — falls back to
`OUTPUT_LANGUAGE` if the project doesn't declare it): the ACs of the generated
`spec.md` drafts and the finding descriptions of the report saved under
`docs/audits/`. Never translate them to English on your own.

Section headings stay in English (the pipeline reads them by name), and so do rule
names, severities, paths and layer names — they are identifiers
(`IDENTIFIER_LANGUAGE`).

**Chat interaction follows the user's language** (`OUTPUT_LANGUAGE` in the profile).
