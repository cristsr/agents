# SDD Profile — template

Copy to `.agents/profile.md` at the **project root** and fill it in. The SDD skills
(`spec, prepare, clarify, scan, design, plan, build, refine, hotfix, sync, commit,
architecture, rules`) live in `~/.agents/skills/` and are global:
**this file is the only thing that adapts them to a project**. Without it, the skills
stop.

---

## 1. Project identity

| Key | Value |
|---|---|
| `PROJECT_NAME` | <name> |
| `ORG` | <organization> |

## 2. Work item identification

| Key | Value | Example |
|---|---|---|
| `STORY_ID_MODE` | `sequential` (auto: next free `<prefix><n>`) / `name` (title slug) / `tracker-code` (tracker key, e.g. Jira) | |
| `STORY_ID_PREFIX` | `<xx->` | folder prefix, lowercase |
| `STORY_ID_PATTERN` | `<xx-<number>>` | `spec-0026` |
| `STORY_KEY_PATTERN` | `<XX-<number>>` | `SPEC-0026` (tracker key) |
| `STORY_ID_LEGACY_PREFIXES` | <old prefixes still valid when reading, comma-separated; `—` if none> | `us-` |
| `TRACKER` | <Jira / Linear / GitHub Issues / …> | |

### Item types (`ITEM_TYPES`)

The pipeline is agnostic to the type of work: what it consumes downstream are
**verifiable acceptance criteria**, not the narrative mold. The type lives as the
`type` field in `spec.md`'s frontmatter and only determines the **framing block**
that replaces the "As a / I want / So that".

| Type | What for | Framing block |
|---|---|---|
| `feat` | New functionality or a visible behavior change | As a / I want / So that |
| `bug` | A defect in something already delivered | Symptom · Reproduction · Expected vs. actual · Impact |
| `debt` | Technical debt, refactor, structural improvement | Current situation · Risk or cost · Desired state |
| `incident` | A production failure requiring remediation | Impact · Detection · Mitigation applied · Root cause |
| `chore` | Maintenance with no behavior change (deps, tooling, config) | Motivation · Scope |

Adjust or trim the list per project. If a project only ships features, declare
`ITEM_TYPES: feat` and the `type` field becomes implicit.

## 3. Item intake

`INTAKE_FORMATS`: <`pdf-export`, `manual-text`, `url`, …>

If there's a structured export, map each artifact field to its label in the export
(title, actor/goal, acceptance criteria, business rules, notes). A different tracker
or language = change only this table.

## 4. Artifact locations

| Key | Value |
|---|---|
| `WORKING_DIRECTORY` | <absolute path of the project's working directory, e.g. `D:\dev\my-project`> |
| `WORKDIR_ACTIVE` | `work/active/{{STORY_ID}}/` |
| `WORKDIR_DONE` | `work/done/{{STORY_ID}}/` |
| `ARTIFACT_SPEC` | `{{WORKDIR_ACTIVE}}/spec.md` |
| `ARTIFACT_CONTEXT` | `{{WORKDIR_ACTIVE}}/context.md` |
| `ARTIFACT_DESIGN` | `{{WORKDIR_ACTIVE}}/design.md` |
| `ARTIFACT_PLAN` | `{{WORKDIR_ACTIVE}}/plan.md` |
| `ARTIFACT_API` | `{{WORKDIR_ACTIVE}}/docs/api.yaml` |
| `ARTIFACT_DIAGRAM` | `{{WORKDIR_ACTIVE}}/docs/diagram.md` |
| `ARTIFACT_DATA_MODEL` | `{{WORKDIR_ACTIVE}}/docs/data-model.md` |

## 5. Language

| Key | Value |
|---|---|
| `OUTPUT_LANGUAGE` | <language the skills speak in chat — announcements, questions, reports> |
| `ARTIFACT_LANGUAGE` | <language the artifacts' **prose** is written in; if unset, it follows `OUTPUT_LANGUAGE`> |
| `IDENTIFIER_LANGUAGE` | <language of identifiers/code — normally English> |

> **`ARTIFACT_LANGUAGE` governs the prose** of `spec.md`, `context.md`, `design.md`,
> `plan.md`, the flow docs, the architecture docs, `docs/decisions.md`, `docs/rules.md`
> and the OpenAPI `summary`/`description` fields. No skill translates to English on
> its own: what a project writes in its artifacts is this key's decision.
>
> Three things stay in English **regardless of this key**, because they are not prose:
>
> 1. **Structural section headings.** The skills locate them by name
>    (`## Acceptance Criteria`, `## Ambiguity Resolution`, `## Global Architecture
>    Impact`, `## Design Decisions`, `Task N`), so translating them breaks the
>    pipeline. Only the text **under** each heading follows `ARTIFACT_LANGUAGE`.
> 2. **Identifiers** — paths, class names, fields, endpoints, YAML/frontmatter keys,
>    error codes, table and column names: `IDENTIFIER_LANGUAGE`.
> 3. **Git surface** — commit messages, PR title and body, branch descriptions: always
>    English, since they are shared history read outside the project.

## 6. Version control

| Key | Value |
|---|---|
| `VCS` | git |
| `REPO_TOPOLOGY` | <mono-repo / multi-repo (one repo per component)> |
| `BASE_BRANCH` | `<main / develop>` |
| `PREP_SKILL` | `prepare` — the skill that does checkout+pull of the base branch (`/prepare` if there's no custom one) |

## 7. Stack and architecture

> The section `scan`, `design`, `plan` and `build` consult most: it defines **what to
> look for in the code and what to generate**. It's the heart of the stack decoupling.

| Key | Value |
|---|---|
| `COMPONENT_TERM` | <microservice / module / package / app> |
| `LANGUAGE` | <TypeScript / Python / Go / …> |
| `FRAMEWORK` | <NestJS / FastAPI / Spring / …> |
| `ARCHITECTURE` | <hexagonal / MVC / features / …> |
| `MODULE_ROOT` | <path where the modules live> |
| `ORM` | <TypeORM / Prisma / SQLAlchemy / none> |
| `DATABASES` | <PostgreSQL / MongoDB / …> |
| `MIGRATIONS` | <manual SQL / ORM CLI / none> |
| `STACK_REFS` | <path of the per-stack template pack, e.g. `~/.agents/stacks/typescript-nestjs/`> — if unset, the skills use their local (generic) `references/` |
| `DI_TOKENS` | <how dependencies are injected> |
| `DTO_STYLE` | <how DTOs are organized> |
| `TEST_FRAMEWORK` | <Jest / pytest / … + file pattern> |
| `API_CONTRACT` | <OpenAPI 3.1 / GraphQL SDL / gRPC proto> |
| `DIAGRAM_FORMAT` | Mermaid (default — inline blocks in `.md`) / PlantUML |

### Code artifacts to locate per module (guidance for `scan`)
List what the scan must find in this stack. E.g.: entity + fields, module
registration + providers, canonical use case + injection pattern, exposed DTOs,
port/abstract service + signatures.

## 8. Project documentation

| Key | Value |
|---|---|
| `DOCS_COMPONENTS_INDEX` | <catalog for identifying affected components> |
| `DOCS_COMPONENT_README` | <per-component doc> |
| `DOCS_COMPONENT_ARCH` | <per-component architecture> |
| `DOCS_MODULE_ARTIFACTS` | <per-module path for the artifacts `/sync` promotes from each story, e.g. `apps/<app>/docs/<module>/<artifact>.md`> |
| `DOCS_MODULE_API` | <the module's canonical OpenAPI, e.g. `apps/<app>/docs/<module>/api.yaml`> — only if `API_CONTRACT_MODE=delta` |
| `DOCS_ARCHITECTURE` | <path of the system-level C4 model (context.md Level 1 + containers.md Level 2) managed by `/architecture`, e.g. `docs/architecture/`> |

| Key | Default | When to change it |
|---|---|---|
| `API_CONTRACT_MODE` | `delta` — `/design` emits `docs/api.delta.yaml` (only the item's paths/schemas); `/sync` merges it into the module's canonical `api.yaml` (creating it if absent) | `full` — if you prefer a complete `docs/api.yaml` per story that `/sync` copies as is |
| `DOCS_UNIT_README` | `—` (default — no docs-as-code) | `<unit>/README.md` — arc42-lite + component `flowchart` (C4 L3) |
| `DOCS_UNIT_FLOWS` | `—` (default — no docs-as-code) | `<unit>/flows/<use-case>.md` — prose + frontmatter + inline `sequenceDiagram` (C4 L4) |
| `DESIGN_OUTPUT_MODE` | `full` — diagrams in Markdown/Mermaid (`docs/diagram.md` + `docs/component.md`) per story | `full-flow` — only if the project adopted docs-as-code: complete `flows/*.md` with their inline `sequenceDiagram` |
| `SYNC_MODE` | `promote` — `/sync` copies the artifacts | `replace` — replaces each `flows/*.md` whole; the contract is merged if `API_CONTRACT_MODE=delta` |

> The two modes are **independent axes**. The OpenAPI contract is **delta by default
> in any project** (incremental contracts, merged into the module's canonical
> `api.yaml`). The docs-as-code flow (`DESIGN_OUTPUT_MODE=full-flow`,
> `SYNC_MODE=replace`, `DOCS_UNIT_FLOWS`, `DOCS_UNIT_README`,
> `MODEL_VALIDATE_CMD`) is **optional and per project**: by default the
> documentation is per-story Markdown. If a project adopts it, copy the
> "Documentation as code" block from a project that already adopted it as a reference.

## 9. Subagents / auxiliary tools

| Key | Value |
|---|---|
| `EXPLORER_SUBAGENT` | `code-explorer` (default: the global agnostic agent in `~/.claude/agents/`) or `none` |
| `EXPLORER_MODEL` | `sonnet` (default) — the model this project wants for exploring |

> `CODEGRAPH` moved to **section 10 — Tooling**.

> `code-explorer` is already global and works for any repo/language: no per-project
> installation needed. `EXPLORER_MODEL` is the only point where the project picks
> the model — `scan` passes it as the `model` parameter, which takes precedence over
> the agent's frontmatter. Do NOT duplicate the agent in `.claude/agents/` just to
> change its model: Claude Code replaces the whole definition, it doesn't merge it.
>
> If `EXPLORER_SUBAGENT` is `none` or the host agent doesn't support subagents,
> `scan` explores inline.

## 10. Pipeline tooling (wired per project)

> Each project declares which tools it uses and what to do when one **isn't there**.
> The skills read these keys **always** — they never assume a hardcoded tool.
> When a key is `—` (or `no`), the skill uses the declared fallback or the manual
> mode. The `<module>`, `<apps>`, `<api.yaml>`, `<out>` placeholders are resolved by
> context in each skill.

| Key | Purpose | Value (default) | Fallback (key at `—` / `no`) |
|---|---|---|---|
| `CODEGRAPH` | Code-graph-based exploration | `no` (default) — `/scan` uses `EXPLORER_SUBAGENT` / explores inline | `yes` → `codegraph_explore` MCP tool / `codegraph explore` CLI |
| `MODEL_VALIDATE_CMD` | Validate that every identifier in the diagrams names a real symbol in the code | `—` (default — no gate, manual review) | `npm run docs:validate` — the project's own script; only if it adopted docs-as-code |
| `API_DIFF_TOOL` | Classify contract breakage when reconciling | `—` (default) → manual diff comparison + a note in the PR body | `oasdiff` — if the project wants an automatic diff |
| `POSTMAN_GEN_CMD` | Generate a Postman collection | `npx -y openapi-to-postmanv2 -s <api.yaml> -o <out> -p` | `—` → import `api.yaml` straight into Postman |
| `YAML_VALIDATE_CMD` | Validate YAML syntax | chain: `python` + PyYAML → `node` + js-yaml → `npx js-yaml` | `—` → manual review of the file |
| `CI_GATES_CMD` | lint/test/build gates before closing a story | `npx nx run-many -t lint,test,build --projects=<apps>` | `—` → run the gates per app, or continue with an explicit warning |
| `MODULE_TEST_CMD` | A module's tests (TDD cycle) | `npx jest src/modules/<module>/ --no-coverage` | `—` → run the component's full suite |
| `FULL_TEST_CMD` | The component's full suite | `npx jest --no-coverage` | `—` → `MODULE_TEST_CMD` per affected module |
| `PROJECT_GRAPH_CMD` | Project graph (optional reference for `/architecture`) | `npx nx graph --file=<out>.json` | `—` → manual survey of `apps/` / `libs/` |
