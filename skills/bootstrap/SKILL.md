---
name: bootstrap
description: >
  Creates or updates a project's `.agents/profile.yaml` by interviewing the
  developer about project identity, story ID pattern, artifact paths, stack,
  language, and conventions, then validating the result against the SDD schema.
  Copies from the SDD template at `~/.agents/sdd-profile.template.yaml` if
  available, or creates from scratch.
  Use when the user says "/bootstrap", "create the profile", "initialize SDD",
  "configure the project profile", "setup profile", or when a skill reports
  that `.agents/profile.yaml` is missing or invalid. Do NOT use to edit
  individual user story artifacts (use /refine), to create project rules (use
  /rules), or to survey the codebase (use /clarify).
---

# bootstrap

Creates `.agents/profile.yaml` for the project, which is required by all SDD
skills to know the project's conventions (story ID pattern, artifact paths,
stack, language, etc.).

**Announce at start:** "Starting `/bootstrap` for this project."

The file is a YAML map of named blocks — `identity`, `items`, `intake`, `paths`,
`language`, `vcs`, `stack`, `docs`, `mcp` — each holding uppercase keys, plus
`ports`, which wires this project's tools to the capabilities the skills call. `null` means
"not configured, use the skill's fallback"; it never means "unknown". The reasoning
behind the values, and the cross-key rules a project can get wrong, live in
`references/profile-guide.md`; the port catalog is `~/.agents/PORTS.md`.

## CRITICAL: the profile is configuration, not documentation

`.agents/profile.yaml` declares **conventions, paths and tooling**. It never
describes the system. Anything that answers "what does this system do, who uses
it, what is it made of" belongs to `docs/architecture/` (owned by
`/docs`) or to the per-component docs — the profile only **points** at
them through `DOCS_*` keys.

Never write into the profile:

| Forbidden in the profile | Where it belongs |
|---|---|
| Catalog / table of apps, microservices, libs | `docs/architecture/containers.md` (C4 L2) |
| Actors, external systems, integrations | `docs/architecture/context.md` (C4 L1) |
| Runtime topology, flow or sequence descriptions | `/design` output → `DOCS_MODULE` |
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
   - `~/.agents/sdd-profile.template.yaml` — copy and fill it
   - If no template exists, create from scratch with the standard blocks
3. Ask the developer:
   - Story ID prefix / pattern (e.g. `spec-<number>`)
   - Project name
   - Working directory — absolute path where the project lives
     (e.g. `D:\dev\my-project`); all skills verify they are in
     this directory before running any command
   - Base branch
   - Language and framework
   - Interaction language (`OUTPUT_LANGUAGE`) — the language the skills speak in
     chat: announcements, questions, reports.
   - Artifact language (`ARTIFACT_LANGUAGE`) — the language the **prose** of
     `spec.md`, `context.md`, `design.md`, `plan.md`, the flow docs and the OpenAPI
     `summary`/`description` is written in. Offer `OUTPUT_LANGUAGE` as the default and
     state what is not prose and follows the contract instead: structural section
     headings (located by name), identifiers, and the git surface (commit messages /
     the PR).
   - Identifier language (`IDENTIFIER_LANGUAGE`) — normally English.
   - ORM and test framework
   - Architecture pattern
   - Which MCP servers the pipeline should rely on (`mcp.EXPECTED`), if any
   - The docs block — the only block whose default demands a second value, so
     decide it here rather than at validation:
     - `API_CONTRACT_MODE`: `delta` (each story contributes its paths/schemas to
       a canonical `<module>/api.yaml`) or `full` (each story ships its own
       complete `docs/api.yaml`). Under `delta`, `DOCS_MODULE` is required —
       offer the pattern derived from `MODULE_ROOT` as the default
       (e.g. `apps/<app>/docs/`).
     - Whether to adopt docs-as-code: `DESIGN_OUTPUT_MODE: full-flow` with
       `DOCS_UNIT_README`, `DOCS_UNIT_FLOWS` and a `DIAGRAM_CHECK` binding, or
       keep the default per-story Markdown (`full`). Half the set is worse than
       none — the validator refuses it, so don't leave it to stumble on later.
4. Survey the repo to pre-fill what the code already answers (stack, test
   framework, module root, DI pattern, base branch) instead of asking for it —
   ask only what the code cannot tell you. What you learn about the system's
   composition while surveying informs the `DOCS_*` pointers; it does **not**
   get transcribed into the profile.
5. **Wire the ports** (`~/.agents/PORTS.md` is the catalog). Two layers already do
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
     unlisted value, a path that doesn't exist, a half-configured docs-as-code
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
   running `/docs` (bootstrap mode) so the pointers resolve.
5. Suggest running `/clarify` if there are active items.

---

## Output language

**Conversational output** follows `~/.agents/references/chat-conventions.md` — the six blocks (announce, progress, question, summary, stop, handoff).

The profile is configuration, not an artifact — `ARTIFACT_LANGUAGE` doesn't apply
to it. Split the language question the way every file is split:

- **Keys and values are identifiers** — `PROJECT_NAME`, `mono-repo`,
  `docs/architecture/`, a model id. They follow `IDENTIFIER_LANGUAGE` (English) and
  are never translated: the skills locate keys by name and match enums verbatim.
- **Comments are prose.** The template ships English ones, maintained with the
  skills repo; your own clarifying comments follow the user's language. Nothing
  parses a comment — it is only read, never matched.

**Chat interaction (the interview) follows the user's language.**
