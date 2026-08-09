# SDD Pipeline — catálogo central

Fuente de verdad de cómo se compone el flujo SDD: orden, dependencias, y qué lee
cada skill del profile. Los detalles operativos viven en cada `SKILL.md` — acá el
mapa. Validá el ecosistema con `/healthcheck`.

## Flujo

```
/hu → /prepare → /clarify → /scan → /design → /plan → /build → /sync → /commit
        (solo si    (recomendado)
         la base
         no está
         fresca)
```

- **`/forge`** encadena `/plan` → `/build` → `/sync` sin pausas (requiere design aprobado).
- **`/hotfix`** corrige defectos post-build originados en ACs ambiguos.
- **`/refine`** ajusta artefactos existentes sin regenerar.
- **`/status`** diagnostica en qué etapa está una historia.
- **`/healthcheck`** valida consistencia de skills ↔ profile ↔ packs.

## Skills del pipeline

| Skill | Entrada | Salida | Siguiente |
|---|---|---|---|
| `/hu` | texto crudo o PDF | `hu.md` | `/prepare` o `/clarify` |
| `/prepare` | historia o componentes | base fresca (`BASE_BRANCH`) | `/clarify` o `/scan` |
| `/clarify` | `hu.md` | ACs precisados + Technical Context | `/scan` |
| `/scan` | `hu.md` | `context.md` | `/design` |
| `/design` | `hu.md` + `context.md` | `design.md` + `docs/` (contrato, modelo, diagramas) | `/plan` |
| `/plan` | artefactos de diseño | `plan.md` (tareas TDD) | `/build` |
| `/build` | `plan.md` | código + tests verdes, tareas `[X]` | `/sync` |
| `/sync` | historia cerrada | docs del módulo reconciliadas, `work/done/` | `/commit` |
| `/commit` | `work/done/` | commits + PR redactado (sin push) | usuario |

## Skills de soporte

| Skill | Rol |
|---|---|
| `/profile` | crea/actualiza `.agents/profile.md` |
| `/rules` | reglas no-negociables (`docs/rules.md`) |
| `/architecture` | C4 Nivel 1/2 (`docs/architecture/`) — invocado por `/sync` |
| `/healthcheck` | valida el ecosistema (script + checks) |
| `/status` | diagnóstico de etapa de una historia |

## Claves del profile por skill

| Skill | Claves que lee |
|---|---|
| `hu` | `STORY_ID_MODE`, `STORY_ID_PATTERN`, `STORY_KEY_PATTERN`, `TRACKER`, `INTAKE_FORMATS`, `WORKDIR_ACTIVE`, `OUTPUT_LANGUAGE` |
| `prepare` | `WORKING_DIRECTORY`, `BASE_BRANCH`, `REPO_TOPOLOGY`, `PREP_SKILL`, `STORY_ID_PATTERN`, `WORKDIR_ACTIVE` |
| `clarify` | `STORY_ID_PATTERN`, `WORKDIR_ACTIVE`, `OUTPUT_LANGUAGE`, stack (sección 7) |
| `scan` | `STORY_ID_PATTERN`, `WORKDIR_ACTIVE`, `BASE_BRANCH`, `COMPONENT_TERM`, stack (7), docs (8), `EXPLORER_SUBAGENT`/`EXPLORER_MODEL`, `CODEGRAPH`, `STACK_REFS` |
| `design` | `STORY_ID_PATTERN`, `WORKDIR_ACTIVE`, `OUTPUT_LANGUAGE`, `API_CONTRACT`, `DIAGRAM_FORMAT`, `DESIGN_OUTPUT_MODE`, `API_CONTRACT_MODE`, stack (7), `STACK_REFS`, `MODEL_VALIDATE_CMD`, `YAML_VALIDATE_CMD`, `API_DIFF_TOOL` |
| `plan` | diseño completo + `TEST_FRAMEWORK`, `API_CONTRACT`, `STACK_REFS`, `MODULE_TEST_CMD` |
| `build` | `plan.md`, `TEST_FRAMEWORK`, `STACK_REFS`, `MODULE_TEST_CMD`, `FULL_TEST_CMD`, `POSTMAN_GEN_CMD` |
| `sync` | `STORY_ID_PATTERN`, `WORKDIR_ACTIVE`/`WORKDIR_DONE`, `BASE_BRANCH`, `SYNC_MODE`, `API_CONTRACT_MODE`, `DESIGN_OUTPUT_MODE`, docs (8), `CI_GATES_CMD`, `API_DIFF_TOOL`, `MODEL_VALIDATE_CMD` |
| `commit` | `STORY_ID_PATTERN`, `WORKDIR_DONE`, `BASE_BRANCH`, `OUTPUT_LANGUAGE` |
| `forge` | inputs de plan/build/sync + `BASE_BRANCH` |
| `hotfix` | `plan.md`/`hu.md`, stack (7), `STACK_REFS`, `MODULE_TEST_CMD` |
| `refine` | artefactos + `API_CONTRACT_MODE` (para `<api-artifact>`) |
| `architecture` | `PROJECT_NAME`, `DIAGRAM_FORMAT`, `OUTPUT_LANGUAGE`, `WORKDIR_DONE`, `DOCS_ARCHITECTURE`, `PROJECT_GRAPH_CMD` |

## Tooling (sección 10 del profile)

Todas las herramientas del pipeline se declaran en el profile, con fallback por
proyecto: `CODEGRAPH`, `MODEL_VALIDATE_CMD`, `API_DIFF_TOOL`, `POSTMAN_GEN_CMD`,
`YAML_VALIDATE_CMD`, `CI_GATES_CMD`, `MODULE_TEST_CMD`, `FULL_TEST_CMD`,
`PROJECT_GRAPH_CMD`. Clave en `—`/`no` → la skill usa el modo manual/legado.

## Packs por stack (`STACK_REFS`)

Templates por stack en `~/.agents/stacks/<stack>/references/`:
`api-template`, `data-model-template`, `scan-guide`, `context-template`,
`task-structure-template`, `openapi-to-dto-mapping`. Packs actuales:
`generic` (default), `typescript-nestjs`. Sin `STACK_REFS` → las `references/`
locales de cada skill (genéricas).

## Cambios recientes

Ver el historial de git de `~/.agents` (los commits del ecosistema).
