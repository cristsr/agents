# SDD Profile — plantilla

Copiar a `.agents/profile.md` en la **raíz del proyecto** y rellenar. Las skills
SDD (`spec, prepare, clarify, scan, design, plan, build, refine, hotfix, sync, commit,
architecture, rules`) viven en `~/.agents/skills/` y son globales:
**este archivo es lo único que las adapta a un proyecto**. Sin él, las skills
se detienen.

---

## 1. Identidad del proyecto

| Clave | Valor |
|---|---|
| `PROJECT_NAME` | <nombre> |
| `ORG` | <organización> |

## 2. Identificación de ítems de trabajo

| Clave | Valor | Ejemplo |
|---|---|---|
| `STORY_ID_MODE` | `sequential` (auto: `<prefijo><n>` siguiente libre) / `name` (slug del título) / `tracker-code` (clave del tracker, p.ej. Jira) | |
| `STORY_ID_PREFIX` | `<xx->` | prefijo de carpeta, minúscula |
| `STORY_ID_PATTERN` | `<xx-<number>>` | `spec-0026` |
| `STORY_KEY_PATTERN` | `<XX-<number>>` | `SPEC-0026` (clave del tracker) |
| `STORY_ID_LEGACY_PREFIXES` | <prefijos antiguos que siguen siendo válidos al leer, separados por coma; `—` si no hay> | `hu-` |
| `TRACKER` | <Jira / Linear / GitHub Issues / …> | |

### Tipos de ítem (`ITEM_TYPES`)

El pipeline es agnóstico al tipo de trabajo: lo que consume aguas abajo son
**criterios de aceptación verificables**, no el molde narrativo. El tipo vive como
campo `tipo` en el frontmatter de `spec.md` y solo determina el **bloque de
encuadre** que reemplaza al «Como/Quiero/Para».

| Tipo | Para qué | Bloque de encuadre |
|---|---|---|
| `feat` | Funcionalidad nueva o cambio de comportamiento visible | Como / Quiero / Para |
| `bug` | Defecto en algo ya entregado | Síntoma · Reproducción · Esperado vs. actual · Impacto |
| `debt` | Deuda técnica, refactor, mejora estructural | Situación actual · Riesgo o costo · Estado deseado |
| `incident` | Falla en ejecución que requiere remediación | Impacto · Detección · Mitigación aplicada · Causa raíz |
| `chore` | Mantenimiento sin cambio de comportamiento (deps, tooling, config) | Motivación · Alcance |

Ajustá o recortá la lista según el proyecto. Si un proyecto solo hace features,
declarar `ITEM_TYPES: feat` y el campo `tipo` se vuelve implícito.

## 3. Intake de ítems

`INTAKE_FORMATS`: <`pdf-export`, `manual-text`, `url`, …>

Si hay un export estructurado, mapear cada campo del artefacto a su etiqueta en
el export (título, actor/objetivo, criterios de aceptación, reglas de negocio,
observaciones). Otro tracker o idioma = cambiar solo esta tabla.

## 4. Ubicación de artefactos

| Clave | Valor |
|---|---|
| `WORKING_DIRECTORY` | <ruta absoluta del directorio de trabajo del proyecto, ej. `D:\Cristian\Nest\admin-back`> |
| `WORKDIR_ACTIVE` | `work/active/{{STORY_ID}}/` |
| `WORKDIR_DONE` | `work/done/{{STORY_ID}}/` |
| `ARTIFACT_SPEC` | `{{WORKDIR_ACTIVE}}/spec.md` |
| `ARTIFACT_CONTEXT` | `{{WORKDIR_ACTIVE}}/context.md` |
| `ARTIFACT_DESIGN` | `{{WORKDIR_ACTIVE}}/design.md` |
| `ARTIFACT_PLAN` | `{{WORKDIR_ACTIVE}}/plan.md` |
| `ARTIFACT_API` | `{{WORKDIR_ACTIVE}}/docs/api.yaml` |
| `ARTIFACT_DIAGRAM` | `{{WORKDIR_ACTIVE}}/docs/diagram.md` |
| `ARTIFACT_DATA_MODEL` | `{{WORKDIR_ACTIVE}}/docs/data-model.md` |

## 5. Idioma

| Clave | Valor |
|---|---|
| `OUTPUT_LANGUAGE` | <idioma de los artefactos> |
| `IDENTIFIER_LANGUAGE` | <idioma de identificadores/código — normalmente inglés> |

## 6. Control de versiones

| Clave | Valor |
|---|---|
| `VCS` | git |
| `REPO_TOPOLOGY` | <mono-repo / multi-repo (un repo por componente)> |
| `BASE_BRANCH` | `<main / develop>` |
| `PREP_SKILL` | `prepare` — skill que hace checkout+pull de la rama base (`/prepare` si no hay una propia) |

## 7. Stack y arquitectura

> La sección que más consultan `scan`, `design`, `plan` y `build`: define **qué
> buscar en el código y qué generar**. Es el corazón del desacople de stack.

| Clave | Valor |
|---|---|
| `COMPONENT_TERM` | <microservicio / módulo / paquete / app> |
| `LANGUAGE` | <TypeScript / Python / Go / …> |
| `FRAMEWORK` | <NestJS / FastAPI / Spring / …> |
| `ARCHITECTURE` | <hexagonal / MVC / features / …> |
| `MODULE_ROOT` | <ruta donde viven los módulos> |
| `ORM` | <TypeORM / Prisma / SQLAlchemy / ninguno> |
| `DATABASES` | <PostgreSQL / MongoDB / …> |
| `MIGRATIONS` | <SQL manual / CLI del ORM / ninguna> |
| `STACK_REFS` | <ruta del pack de templates por stack, ej. `~/.agents/stacks/typescript-nestjs/`> — si no está definida, las skills usan sus `references/` locales (genéricas) |
| `DI_TOKENS` | <cómo se inyectan dependencias> |
| `DTO_STYLE` | <cómo se organizan los DTOs> |
| `TEST_FRAMEWORK` | <Jest / pytest / … + patrón de archivos> |
| `API_CONTRACT` | <OpenAPI 3.1 / GraphQL SDL / gRPC proto> |
| `DIAGRAM_FORMAT` | Mermaid (default) / PlantUML / LikeC4 (solo si el proyecto adopta docs-as-code) |

### Artefactos de código a ubicar por módulo (guía para `scan`)
Listar qué debe encontrar el scan en este stack. Ej.: entidad + campos, registro
del módulo + providers, caso de uso canónico + patrón de inyección, DTOs
expuestos, puerto/servicio abstracto + firmas.

## 8. Documentación del proyecto

| Clave | Valor |
|---|---|
| `DOCS_COMPONENTS_INDEX` | <catálogo para identificar componentes afectados> |
| `DOCS_COMPONENT_README` | <doc por componente> |
| `DOCS_COMPONENT_ARCH` | <arquitectura por componente> |
| `DOCS_MODULE_ARTIFACTS` | <ruta por módulo para los artefactos que `/sync` promueve desde cada historia, ej. `apps/<app>/docs/<module>/<artifact>.md`> |
| `DOCS_MODULE_API` | <OpenAPI canónico del módulo, ej. `apps/<app>/docs/<module>/api.yaml`> — solo si `API_CONTRACT_MODE=delta` |
| `DOCS_ARCHITECTURE` | <ruta del modelo C4 a nivel sistema (context.md Nivel 1 + containers.md Nivel 2) que gestiona `/architecture`, ej. `docs/architecture/`> |

| Clave | Default | Cuándo cambiarlo |
|---|---|---|
| `API_CONTRACT_MODE` | `delta` — `/design` emite `docs/api.delta.yaml` (solo paths/schemas del ítem); `/sync` lo mergea en el `api.yaml` canónico del módulo (lo crea si no existe) | `full` — si se prefiere un `docs/api.yaml` completo por historia que `/sync` copia tal cual |
| `DESIGN_OUTPUT_MODE` | `full` — diagramas en Markdown/Mermaid (`docs/diagram.md` + `docs/component.md`) por historia | `delta` — solo si el proyecto adoptó docs-as-code LikeC4 (`model.delta.c4` + `flows/*.md`) |
| `SYNC_MODE` | `promote` — `/sync` copia los artefactos | `reconcile` — mergea por artefacto: contrato si `API_CONTRACT_MODE=delta`, modelo si `DESIGN_OUTPUT_MODE=delta` |

> Los dos modos son **ejes independientes**. El contrato OpenAPI es **delta por
> default en cualquier proyecto** (contratos incrementales, mergeados en el
> `api.yaml` canónico del módulo). El flujo LikeC4 (`DESIGN_OUTPUT_MODE=delta`,
> `DOCS_MODULE_MODEL`, `DOCS_MODULE_FLOWS`, `DOCS_MODULE_README`,
> `MODEL_VALIDATE_CMD`) es **opcional y por proyecto**: por defecto la
> documentación es Markdown (Mermaid). Si el proyecto lo adopta, se copia el
> bloque «Documentación como código» del profile de admin-back como referencia.

## 9. Subagentes / herramientas auxiliares

| Clave | Valor |
|---|---|
| `EXPLORER_SUBAGENT` | `code-explorer` (default: agente global agnóstico en `~/.claude/agents/`) o `ninguno` |
| `EXPLORER_MODEL` | `sonnet` (default) — el modelo que este proyecto quiere para explorar |

> `CODEGRAPH` se movió a la **sección 10 — Tooling**.

> `code-explorer` ya es global y sirve para cualquier repo/lenguaje: no hay que
> instalarlo por proyecto. `EXPLORER_MODEL` es el único punto donde el proyecto
> elige el modelo — `scan` lo pasa como parámetro `model`, que tiene precedencia
> sobre el frontmatter del agente. NO dupliques el agente en `.claude/agents/`
> para cambiarle el modelo: Claude Code reemplaza la definición entera, no la
> mergea.
>
> Si `EXPLORER_SUBAGENT` es `ninguno` o el agente anfitrión no soporta
> subagentes, `scan` explora inline.

## 10. Tooling del pipeline (cableado por proyecto)

> Cada proyecto declara qué herramientas usa y qué hacer cuando una **no está**.
> Las skills leen estas claves **siempre** — nunca asumen una tool hardcodeada.
> Cuando una clave vale `—` (o `no`), la skill usa el fallback declarado o el
> modo manual. Los placeholders `<module>`, `<apps>`, `<api.yaml>`, `<out>` se
> resuelven por contexto en cada skill.

| Clave | Propósito | Valor (default) | Fallback (clave en `—` / `no`) |
|---|---|---|---|
| `CODEGRAPH` | Exploración con grafo de código | `no` (default) — `/scan` usa `EXPLORER_SUBAGENT` / explora inline | `yes` → tool MCP `codegraph_explore` / CLI `codegraph explore` |
| `MODEL_VALIDATE_CMD` | Validar el modelo LikeC4 | `—` (default — sin LikeC4, no aplica) | `npx likec4 validate` — solo si el proyecto adoptó docs-as-code; si falta, revisión manual del `.c4` |
| `API_DIFF_TOOL` | Clasificar breaking del contrato al reconciliar | `—` (default) → comparación manual del diff + nota en el PR body | `oasdiff` — si el proyecto quiere diff automático |
| `POSTMAN_GEN_CMD` | Generar colección Postman | `npx -y openapi-to-postmanv2 -s <api.yaml> -o <out> -p` | `—` → importar `api.yaml` directo en Postman |
| `YAML_VALIDATE_CMD` | Validar sintaxis YAML | cadena: `python` + PyYAML → `node` + js-yaml → `npx js-yaml` | `—` → revisión manual del archivo |
| `CI_GATES_CMD` | Gates lint/test/build pre-cierre de historia | `npx nx run-many -t lint,test,build --projects=<apps>` | `—` → correr gates por app, o continuar con aviso explícito |
| `MODULE_TEST_CMD` | Tests de un módulo (ciclo TDD) | `npx jest src/modules/<module>/ --no-coverage` | `—` → correr la suite completa del componente |
| `FULL_TEST_CMD` | Suite completa del componente | `npx jest --no-coverage` | `—` → `MODULE_TEST_CMD` por módulo afectado |
| `PROJECT_GRAPH_CMD` | Grafo de proyectos (referencia opcional para `/architecture`) | `npx nx graph --file=<out>.json` | `—` → relevamiento manual de `apps/` / `libs/` |
