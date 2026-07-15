# SDD Profile — plantilla

Copiar a `.agents/profile.md` en la **raíz del proyecto** y rellenar. Las skills
SDD (`hu, clarify, scan, design, plan, build, refine, hotfix, constitution`) viven
en `~/.agents/skills/` y son globales: **este archivo es lo único que las adapta a
un proyecto**. Sin él, las skills se detienen.

---

## 1. Identidad del proyecto

| Clave | Valor |
|---|---|
| `PROJECT_NAME` | <nombre> |
| `ORG` | <organización> |

## 2. Identificación de historias

| Clave | Valor | Ejemplo |
|---|---|---|
| `STORY_ID_PREFIX` | `<xx->` | prefijo de carpeta, minúscula |
| `STORY_ID_PATTERN` | `<xx-<number>>` | `sm-1933` |
| `STORY_KEY_PATTERN` | `<XX-<number>>` | `SM-1933` (clave del tracker) |
| `TRACKER` | <Jira / Linear / GitHub Issues / …> | |

## 3. Intake de historias

`INTAKE_FORMATS`: <`pdf-export`, `manual-text`, `url`, …>

Si hay un export estructurado, mapear cada campo del artefacto a su etiqueta en
el export (título, actor/objetivo, criterios de aceptación, reglas de negocio,
observaciones). Otro tracker o idioma = cambiar solo esta tabla.

## 4. Ubicación de artefactos

| Clave | Valor |
|---|---|
| `WORKDIR_ACTIVE` | `work/active/{{STORY_ID}}/` |
| `WORKDIR_DONE` | `work/done/{{STORY_ID}}/` |
| `ARTIFACT_HU` | `{{WORKDIR_ACTIVE}}/hu.md` |
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
| `PREP_SKILL` | <skill que hace checkout+pull, si existe> |

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
| `DI_TOKENS` | <cómo se inyectan dependencias> |
| `DTO_STYLE` | <cómo se organizan los DTOs> |
| `TEST_FRAMEWORK` | <Jest / pytest / … + patrón de archivos> |
| `API_CONTRACT` | <OpenAPI 3.1 / GraphQL SDL / gRPC proto> |
| `DIAGRAM_FORMAT` | <Mermaid / PlantUML> |

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

## 9. Subagentes / herramientas auxiliares

| Clave | Valor |
|---|---|
| `EXPLORER_SUBAGENT` | `code-explorer` (default: agente global agnóstico en `~/.claude/agents/`) o `ninguno` |
| `EXPLORER_MODEL` | `sonnet` (default) — el modelo que este proyecto quiere para explorar |

> `code-explorer` ya es global y sirve para cualquier repo/lenguaje: no hay que
> instalarlo por proyecto. `EXPLORER_MODEL` es el único punto donde el proyecto
> elige el modelo — `scan` lo pasa como parámetro `model`, que tiene precedencia
> sobre el frontmatter del agente. NO dupliques el agente en `.claude/agents/`
> para cambiarle el modelo: Claude Code reemplaza la definición entera, no la
> mergea.
>
> Si `EXPLORER_SUBAGENT` es `ninguno` o el agente anfitrión no soporta
> subagentes, `scan` explora inline.
