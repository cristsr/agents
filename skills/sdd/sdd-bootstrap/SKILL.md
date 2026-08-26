---
name: sdd-bootstrap
description: >
  Creates or updates a project's `.agents/profile.yaml` by interviewing the
  developer about project identity, story ID pattern, artifact paths, stack,
  language, and conventions, then validating the result against the SDD schema.
  Copies from the SDD template at `~/.agents/contracts/sdd-profile.template.yaml` if
  available, or creates from scratch.
  Use when the user says "/sdd-bootstrap", "create the profile", "initialize SDD",
  "configure the project profile", "setup profile", "crea el perfil",
  "inicializa SDD", "configura el perfil del proyecto", or when a skill reports
  that `.agents/profile.yaml` is missing or invalid. Do NOT use to only validate
  an existing profile (use /healthcheck), to edit individual user story artifacts
  (use /sdd-refine), to create project rules (use /sdd-rules), or to survey the codebase
  (use /sdd-clarify).
---

# bootstrap

Creates `.agents/profile.yaml` for the project, which is required by all SDD
skills to know the project's conventions (story ID pattern, artifact paths,
stack, language, etc.).

**Announce at start:** "Starting `/sdd-bootstrap` for this project."

The file is a YAML map of named blocks — `identity`, `items`, `intake`, `paths`,
`language`, `vcs`, `stack`, `docs`, `mcp` — each holding uppercase keys, plus
`ports`, which wires this project's tools to the capabilities the skills call. `null` means
"not configured, use the skill's fallback"; it never means "unknown". The reasoning
behind the values, and the cross-key rules a project can get wrong, live in
`references/profile-guide.md`; the port catalog is `~/.agents/contracts/PORTS.md`.

## Contract

This skill has no upstream producer — it is where the pipeline's configuration comes
from. Everything downstream reads what it writes, so **the `Produces` rows are the
contract every other SDD skill depends on**.

**Requires**

| Condition | Check | If it fails |
|---|---|---|
| You are at the root of the project being configured | the folder holds the repo's own `.git`, `package.json` or equivalent | `cd` there first — the profile is per project and `WORKING_DIRECTORY` is written from here |
| `node` on PATH, for `~/.agents/scripts/validate-profile.mjs` | `node --version` | See **Degrades** — never declare the profile ready on an unvalidated file |
| Explicit confirmation before overwriting | `.agents/profile.yaml` already exists (PHASE 1, step 1) | Read it and ask what to change; never rewrite an existing profile from scratch unasked |

**Produces** — this is what every other skill looks for

- `.agents/profile.yaml` with `SCHEMA_VERSION: 2` and the ten blocks: `identity`,
  `items`, `intake`, `paths`, `language`, `vcs`, `stack`, `docs`, `mcp`, `ports`
- every **enum** key carrying a listed value, never absent: `STORY_ID_MODE`,
  `REPO_TOPOLOGY`, `ITEM_TYPES`, `EVIDENCE_MODE_TYPES`, `API_CONTRACT_MODE`,
  `DOC_UNIT`, `DIAGRAM_FORMAT`. A skill matches these verbatim and has no
  fallback for a missing one
- `IDENTIFIER_LANGUAGE` set to a real language — it is the one key with no fallback
  anywhere in the ecosystem
- `WORKING_DIRECTORY` as an **absolute** path — every skill checks `pwd` against it
- `validate-profile.mjs` reporting **zero ISSUES** against the written file

**Writes** — `.agents/profile.yaml` and nothing else. It never creates `docs/`,
`work/`, a branch or a commit.

**Never**

- writes anything that describes the system rather than configuring the skills
  (the table below is the full list) — those go to `docs/`, and the profile keeps
  a `DOCS_*` pointer
- invents a value for a key it could not determine: `null` is the answer, because
  every skill declares a fallback for a null key and none can recover from a wrong one
- binds a port to a command it did not find in the repo or in a stack pack
- decides what happens when a capability is missing — that is the consuming skill's
  contract, not the project's

**Degrades**

| Missing | Behavior |
|---|---|
| `~/.agents/contracts/sdd-profile.template.yaml` | Build the file from scratch with the ten blocks, filling every enum key with the default named in PHASE 1 step 2 — a from-scratch profile with enum keys absent is the one failure mode downstream skills cannot report clearly |
| `node` for the validator | Walk the required keys by hand against `references/profile-guide.md`, and say out loud that the profile is unvalidated |
| `STACK_REFS` packs (project on a stack with no pack) | Leave it `null`; skills fall back to their own generic `references/` and inherit no port adapters. Wire the ports from the repo alone (PHASE 1 step 5) |

**Reverting** — the profile is a live artifact that other skills read on every run.
Before overwriting an existing one, keep the previous content available (the file is
under version control in every project that has git); a half-written profile leaves
the whole pipeline reading a shape that never existed.

**Profile keys** — this skill writes the entire file, so the authoritative key list is
the template (`~/.agents/contracts/sdd-profile.template.yaml`) and the reasoning behind
each value is `references/profile-guide.md`. It *reads* an existing profile only to
ask what to change.

## CRITICAL: the profile is configuration, not documentation

`.agents/profile.yaml` declares **conventions, paths and tooling**. It never
describes the system. Anything that answers "what does this system do, who uses
it, what is it made of" belongs to `docs/architecture/` (owned by
`/sdd-docs`) or to the per-component docs — the profile only **points** at
them through `DOCS_*` keys.

Never write into the profile:

| Forbidden in the profile | Where it belongs |
|---|---|
| Catalog / table of apps, microservices, libs | `docs/architecture/containers.md` (C4 L2) |
| Actors, external systems, integrations | `docs/architecture/context.md` (C4 L1) |
| Runtime topology, flow or sequence descriptions | `/sdd-design` output → `DOCS_MODULE` |
| Diagrams of any kind | `docs/architecture/` or the module docs |
| Endpoint listings, env-var tables, deploy instructions | `MODULE_ROOT` (stack block) → `<component>/README.md` |
| Business rules, domain narrative, pending work | the story artifacts / the project's backlog |

The rule of thumb: **if it changes when the code changes, it is documentation,
not configuration.** A stack key (`ORM: null`, `TEST_FRAMEWORK: Jest`) is a
convention the skills obey. A list of the five current microservices is a
snapshot that rots — put a pointer instead.

Keep values terse: a key is a value plus, at most, one clarifying comment. If a
value needs a paragraph to justify itself, the paragraph goes in the docs and the
value keeps the pointer.

Stack knowledge is not configuration either, and it does not belong here in any
form. How a project injects a dependency, shapes a DTO or lays out a module is
answered by the convention skills (typescript, hexagonal-architecture, nestjs) and
by the stack packs' `references/` templates — in prose, with the reasoning, where it
can be read properly.
A one-line key summarizing them would only be a second version to keep in sync.

## PHASE 1 — Create or update

1. If `.agents/profile.yaml` exists and the user wants to update it, read it
   first and ask what to change.
2. If it doesn't exist, check for the template:
   - `~/.agents/contracts/sdd-profile.template.yaml` — copy and fill it
   - If no template exists, create from scratch with the ten blocks — and write
     every **enum** key explicitly, because there is no template default to inherit
     and no skill downstream falls back for these:

     | Key | Default when creating from scratch |
     |---|---|
     | `SCHEMA_VERSION` | `2` |
     | `STORY_ID_MODE` | `sequential` (`/sdd-spec` resolves the id through this key) |
     | `ITEM_TYPES` | `[feat, bug, debt, incident, chore]` |
     | `EVIDENCE_MODE_TYPES` | `[debt, chore, incident]` |
     | `REPO_TOPOLOGY` | `mono-repo` |
     | `API_CONTRACT_MODE` | `delta` |
     | `DOC_UNIT` | `story` |
     | `DIAGRAM_FORMAT` | `Mermaid` |
     | `INTAKE_FORMATS` | `[manual-text]` |

3. Ask the developer. Each line below is one question; the reasoning behind the
   value — and what it silently decides for the whole pipeline — is
   `references/profile-guide.md`, read it before defending a default:

   | Ask | Key | Note |
   |---|---|---|
   | Project name | `PROJECT_NAME` | — |
   | Story ID prefix / pattern | `STORY_ID_PREFIX`, `STORY_ID_PATTERN` | e.g. `spec-<number>`; confirm `STORY_ID_MODE` matches how ids are really assigned (`sequential` \| `name` \| `tracker-code`) |
   | Working directory | `WORKING_DIRECTORY` | **Absolute** path (e.g. `D:\dev\my-project`); every skill checks `pwd` against it before running a command |
   | Base branch and repo topology | `BASE_BRANCH`, `REPO_TOPOLOGY` | — |
   | What a deployable unit is called here | `COMPONENT_TERM` | app, service, package — the word the skills use when they talk to the developer |
   | Language, framework, architecture pattern | `LANGUAGE`, `FRAMEWORK`, `ARCHITECTURE` | — |
   | ORM and test framework | `ORM`, `TEST_FRAMEWORK` | — |
   | Which stack packs apply | `STACK_REFS` | Always a **list**, base → specific (`[~/.agents/stacks/typescript, ~/.agents/stacks/nestjs]`) — **including a one-pack project**: `[~/.agents/stacks/generic]`, never a bare path. Step 5 reads `<STACK_REFS>/ports.yaml` as its first wiring layer, so this must be answered **before** it. `null` when the stack has no pack |
   | Which convention skills to load by name | `SKILLS` | e.g. `[typescript, nestjs]` — the knowledge layer, separate from the packs |
   | Interaction language | `OUTPUT_LANGUAGE` | The language the skills speak in chat: announcements, questions, reports |
   | Artifact language | `ARTIFACT_LANGUAGE` | The **prose** of `spec.md`, `context.md`, `design.md`, `plan.md`, the flow docs and the OpenAPI `summary`/`description`. Offer `OUTPUT_LANGUAGE` as the default and state what it does **not** cover: structural section headings (English, located by name), the git surface (commits / the PR), and everything on the code's axis — the next row |
   | Identifier language | `IDENTIFIER_LANGUAGE` | The language of the **code**: paths, classes, fields, endpoints, plus comments and test names. Don't propose one — look at how the codebase already names things and offer that. It has **no fallback anywhere**, so it may not be left null |
   | Which MCP servers the pipeline relies on | `mcp.EXPECTED` | `[]` if none |
   | Which item types may leave the TDD carril | `EVIDENCE_MODE_TYPES` | Default `[debt, chore, incident]` is deliberately restrictive. Widen it only when the deliverables genuinely aren't runtime code, and say out loud that this is the guardrail's first layer. `[]` disables the carril |
   | How the API contract is shipped | `API_CONTRACT_MODE`, `DOCS_MODULE` | `delta` (each story contributes to a canonical `<module>/api.yaml`) or `full` (each story ships its own). Under `delta`, `DOCS_MODULE` is **required** — offer the pattern derived from `MODULE_ROOT` (e.g. `apps/<app>/docs/`) |
   | What one document describes | `DOC_UNIT` + `DOCS_UNIT_README`, `DOCS_UNIT_FLOWS`, `DIAGRAM_CHECK` | `story` (default) or `use-case` — living documents per use case, which needs **all four**; half the set is worse than none — the validator refuses it, so settle it here rather than letting PHASE 2 stumble on it |

4. Survey the repo to pre-fill what the code already answers (stack, test
   framework, module root, DI pattern, base branch) instead of asking for it —
   ask only what the code cannot tell you. What you learn about the system's
   composition while surveying informs the `DOCS_*` pointers; it does **not**
   get transcribed into the profile.
5. **Wire the ports** (`~/.agents/contracts/PORTS.md` is the catalog). Two layers already do
   most of the work, and you only write the third:

   - The **stack packs** (`<STACK_REFS>/ports.yaml` — a list of layers, base →
     specific) supply the stack idiom. Read them first: whatever they bind needs
     nothing here. A NestJS TS project inherits from `typescript` + `nestjs`; a plain
     TS project from `typescript` alone.
   - The **repo** answers the rest. Don't ask the developer for a command the
     project already declares — go read it:

   | Look in | For |
   |---|---|
   | `package.json` → `scripts` | test, lint, build, docs and generator entry points |
   | `nx.json` / `turbo.json` / workspace config | how targets are run across a monorepo |
   | `.github/workflows/*.yml`, `.gitlab-ci.yml` | the real gate sequence CI runs |
   | `pyproject.toml`, `tox.ini`, `pytest.ini` | the test runner and its options |
   | `Makefile`, `justfile`, `go.mod`, `Cargo.toml` | the project's own task entry points |

   **Disambiguation rules — these matter more than the detection itself:**

   - **Never bind a watch script.** A script containing `watch`, `--watch` or
     `serve` never terminates, and it would hang the pipeline on the first TDD turn.
   - **`TESTS.module` wants the narrowest command**, not `npm test`. It runs on every
     red-green-refactor turn, so an e2e or full-suite script here makes every cycle
     cost minutes. If the only scripts available are broad, prefer the pack's runner
     invocation with a path filter.
   - **Prefer the CI entry point for `CI_GATES`**, since the point of that port is
     running what CI would run.
   - **`VERIFY` only matters if the project will use `build_mode: evidence`.** It is
     what closes an AC when no test suite covers the deliverable — a schema or
     artifact validator, a docs link check, a migration dry-run. Bind it when the
     project ships work of that kind (a docs tree, config, a skills or prompt
     library); leave it unbound otherwise. Never point it at something that passes
     regardless of the content: a check that cannot fail is the one adapter worse
     than none, because it launders an unverified story into a green one.
   - When several scripts plausibly fit and the choice changes behavior, **ask** with
     the candidates you found — don't pick silently.

   Leave the list empty (`[]`) only when the project genuinely lacks the capability,
   and `null` to inherit the pack. Inventing a command that doesn't work is the one
   outcome worse than leaving it unbound: the failure then surfaces mid-pipeline
   instead of here.

   Do not ask the developer to choose a fallback: what happens without a capability
   is the skill's decision, not the project's.
6. Write `.agents/profile.yaml` with the gathered info, honoring the
   configuration-not-documentation rule above. Leave a key `null` rather than
   inventing a value — every skill declares a fallback for a null key, and none
   of them can recover from a wrong one.

## PHASE 2 — Validate and verify

1. Run the schema validator and fix whatever it reports:

   ```bash
   node ~/.agents/scripts/validate-profile.mjs .agents/profile.yaml
   ```

   - **ISSUES** block the handoff — a required key left null, an enum with an
     unlisted value, a path that doesn't exist, a half-configured `use-case`
     set. Fix them and re-run before telling the user the profile is ready.
   - **WARNINGS** are judgment calls: an unknown key is usually a typo, a missing
     one is usually an oversight. Review each with the user; if a warning is the
     intended configuration, say so and move on.
   - If the command fails because the file isn't valid YAML, the error carries
     the line — fix it there.
2. Re-read what you wrote and strip anything that describes the system rather
   than configuring the skills — component catalogs, integration lists,
   endpoint tables, diagrams. Each removal must leave a `DOCS_*` pointer in its
   place, so nothing becomes unreachable.
3. List the key values the skills will read from it.
4. If `DOCS_ARCHITECTURE` points at a folder that doesn't exist yet, suggest
   running `/sdd-docs` (bootstrap mode) so the pointers resolve.
5. Suggest running `/sdd-clarify` if there are active items.

---

## Output language

**Conversational output** follows `~/.agents/references/chat-conventions.md` — the six blocks (announce, progress, question, summary, stop, handoff).

The profile is configuration, not an artifact — `ARTIFACT_LANGUAGE` doesn't apply
to it. Split the language question the way every file is split:

- **Keys and enum values are schema literals** — `PROJECT_NAME`, `mono-repo`,
  `docs/architecture/`, a model id. Write them exactly as the template does and
  never translate one: the skills locate keys by name and match enums verbatim.
  `IDENTIFIER_LANGUAGE` is a value the profile *declares*, not a rule that governs
  the profile's own keys — the code it describes is what follows it.
- **Comments are prose.** The template ships English ones, maintained with the
  skills repo; your own clarifying comments follow the user's language. Nothing
  parses a comment — it is only read, never matched.

**Chat interaction (the interview) follows the user's language.**

---

## Common Issues

| Issue | Cause | Resolution |
|---|---|---|
| `validate-profile.mjs` fails before reporting any key | The file isn't valid YAML — usually an unquoted Windows path or a tab | The error carries the line; quote the whole path in double quotes and re-indent with spaces |
| Every skill reports it isn't in the working directory | `WORKING_DIRECTORY` written as a relative path, or with the wrong separator | It is compared against `pwd` verbatim — write it absolute, exactly as the shell prints it |
| The validator rejects a `use-case` profile | `DOC_UNIT: use-case` with `DOCS_UNIT_README`, `DOCS_UNIT_FLOWS` or the `DIAGRAM_CHECK` binding left null | The four move together. Either complete the set or go back to `story` |
| `/sdd-plan` stops on a story declaring `build_mode: evidence` | `EVIDENCE_MODE_TYPES` lists eligible types while the `VERIFY` port is unbound | Bind `VERIFY` to a check that can actually fail, or narrow the list. A check that always passes is worse than none |
| The pipeline hangs on the first red-green turn | A watch script bound to `TESTS.module` | Never bind a command containing `watch`, `--watch` or `serve`; use the pack's runner invocation with a path filter |
| Every TDD turn costs minutes | `TESTS.module` bound to the full suite or an e2e script | That port runs on every turn — it wants the narrowest command that can run one module's tests |
| A skill reports a `references/` template it can't find | `STACK_REFS` null or pointing at a pack that doesn't exist | Resolution walks the packs last → first, then falls back to each skill's own generic `references/`. Verify each path exists before writing the list |
| Skills write code in the wrong language | `IDENTIFIER_LANGUAGE` left null | It is the one key with no fallback anywhere — it may not be null. Read how the codebase already names things and set it to that |
| The profile keeps growing with system descriptions | Component catalogs and endpoint tables written in instead of pointed at | Apply the rule of thumb: if it changes when the code changes, it is documentation. Strip it and leave the `DOCS_*` pointer |

---

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
