# sdd-bootstrap — worked example

What a real run looks like: a full interview and the profile it writes.
Read it when the shape of the output is in doubt; the rules themselves are in
`SKILL.md`.

## Example

**Input:** `/sdd-bootstrap` in a NestJS monorepo that has no `.agents/profile.yaml`.

**Flow:**

1. **PHASE 1 step 2** — the template exists at `~/.agents/contracts/sdd-profile.template.yaml`;
   copy it, so every enum key arrives with its default already set.
2. **PHASE 1 step 4 first** — survey before asking. `package.json` answers
   `LANGUAGE: TypeScript`, `TEST_FRAMEWORK: Jest`, `ORM: Mongoose`; `nx.json` gives
   `MODULE_ROOT: apps/`; `git` gives `BASE_BRANCH: main`. None of these get asked.
3. **PHASE 1 step 3** — ask only what the code can't answer: `PROJECT_NAME`,
   `WORKING_DIRECTORY: D:\dev\billing`, `STORY_ID_PATTERN: spec-<number>`,
   `COMPONENT_TERM: app`, `STACK_REFS: [~/.agents/stacks/typescript, ~/.agents/stacks/nestjs]`,
   `SKILLS: [typescript, nestjs]`, `OUTPUT_LANGUAGE: Spanish`,
   `ARTIFACT_LANGUAGE: Spanish`, `IDENTIFIER_LANGUAGE: English` (offered because the
   existing classes are named in English). The docs block: `API_CONTRACT_MODE: delta`
   → `DOCS_MODULE: apps/<app>/docs/` is required, offered from `MODULE_ROOT` and
   accepted. Docs-as-code declined → `DOC_UNIT: story`.
   `EVIDENCE_MODE_TYPES` left at `[debt, chore, incident]` — the repo ships runtime code.
4. **PHASE 1 step 5** — the `typescript` pack already binds the Jest adapters, so
   `TESTS` inherits (`null`). `package.json` has `test`, `test:e2e` and `test:watch`:
   `test:watch` is never a candidate, `test:e2e` is too broad for `TESTS.module`, and
   the pack's filtered runner wins. `CI_GATES.run` is bound to the command
   `.github/workflows/ci.yml` actually runs. `VERIFY` left unbound — nothing here
   ships non-code deliverables.
5. **PHASE 2** — `node ~/.agents/scripts/validate-profile.mjs .agents/profile.yaml`
   reports one ISSUE: `DOCS_ARCHITECTURE: docs/architecture/` points at a folder that
   doesn't exist. Fixed by suggesting `/sdd-docs` in bootstrap mode, then re-run: clean.

**Output:**

> "Profile written and validated: `spec-<number>` ids, base branch `main`,
> TypeScript + NestJS with Jest, artifacts in Spanish and code in English,
> `delta` API contract against `apps/<app>/docs/`. `TESTS` inherits from the
> typescript pack; `VERIFY` is unbound, so `build_mode: evidence` isn't available yet.
> `docs/architecture/` doesn't exist — run `/sdd-docs` to create it. After that, `/sdd-spec`
> to open the first item."
