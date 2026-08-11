---
name: profile
description: >
  Creates or updates a project's `.agents/profile.md` by interviewing the
  developer about project identity, story ID pattern, artifact paths, stack,
  language, and conventions. Copies from the SDD template at
  `~/.agents/sdd-profile.template.md` if available, or creates from scratch.
  Use when the user says "/profile", "crear profile", "inicializar SDD",
  "configurar perfil del proyecto", "setup profile", or when a skill reports
  that `.agents/profile.md` is missing. Do NOT use to edit individual user
  story artifacts (use /refine), to create project rules (use /rules), or to
  survey the codebase (use /clarify).
---

# profile

Creates `.agents/profile.md` for the project, which is required by all SDD
skills to know the project's conventions (story ID pattern, artifact paths,
stack, language, etc.).

## PHASE 1 — Create or update

1. If `.agents/profile.md` exists and the user wants to update it, read it
   first and ask what to change.
2. If it doesn't exist, check for the template:
   - `~/.agents/sdd-profile.template.md` — copy and fill it
   - If no template exists, create from scratch with the standard sections
3. Ask the developer:
   - Story ID prefix / pattern (e.g. `spec-<number>`)
   - Project name
   - Working directory — absolute path where the project lives
     (e.g. `D:\Cristian\Nest\admin-back`); all skills verify they are in
     this directory before running any command
   - Base branch
   - Language and framework
   - Output language for artifacts
   - ORM, database, test framework
   - Architecture pattern
4. Write `.agents/profile.md` with all the gathered info.

## PHASE 2 — Verify

1. Confirm the file was written correctly.
2. List the key values the skills will read from it.
3. Suggest running `/clarify` if there are active items.
