---
type: debt
origin: manual
---

# spec-0002: Configuración del pipeline por contrato, reglas y config YAML

## Technical Debt

**Situación actual:** la configuración del pipeline (`tier` y `build_mode`) se
infiere y se escribe dentro de `spec.md` — front matter más `## Tier Rationale`,
`## Change Surface` y `## Build Mode Rationale` — y las reglas que la deciden viven
en prosa repartida (`tier-inference.md`, `contracts/TIERS.md` y cada skill de
etapa). `scripts/status.mjs` guarda además una copia parcial del grafo, y cada
skill re-deriva la matriz en sus comprobaciones de entrada. El artefacto arrastra
prosa de justificación que no es contenido del ítem.

**Riesgo o coste:** cambiar una regla exige editarla en muchos lugares y deriva; el
modelo y las skills pagan contexto re-derivando la matriz; y el artefacto mezcla el
*qué* (el ítem) con el *cómo se lo procesa* (su configuración).

**Estado deseado:** la configuración del pipeline se decide con reglas
declarativas, se registra en un YAML por historia y se mapea a etapas mediante un
único contrato machine-readable. El modelo infiere la configuración desde esas
reglas y solo entrevista al usuario como último recurso. `spec.md` deja de declarar
la configuración y las skills dejan de re-derivarla.

## Acceptance Criteria

### AC-1: Un único contrato machine-readable define el mapping

El mapping de la configuración a todo lo siguiente se declara en un único archivo
machine-readable (YAML) y en ningún otro lugar:

- qué etapas corren, y en qué orden;
- qué requiere y qué produce cada etapa;
- dónde vive `## AC Coverage` y qué etapa cierra la historia;
- los guardrails de elegibilidad (`FAST_TIER_TYPES`, `STANDARD_TIER_TYPES`,
  `EVIDENCE_MODE_TYPES`) y las comprobaciones que `validate-artifacts.mjs` hace
  cumplir.

### AC-2: Las reglas de inferencia viven en un solo lugar y son declarativas

Las reglas que deciden la configuración de una historia — qué señales (tipo,
número de criterios, si toca un contrato, un esquema o varios componentes)
determinan qué configuración — se declaran en un único lugar: un juego global que
el ecosistema distribuye, y que cada proyecto puede extender o sobrescribir desde
su perfil.

### AC-3: El modelo infiere desde las reglas y entrevista solo como último recurso

Dada una historia, el modelo aplica las reglas y escribe la configuración
resultante; no decide por fuera de ellas. Cuando ninguna regla determina la
configuración, la define entrevistando al usuario en una única ronda, con la opción
recomendada primero.

### AC-4: La configuración seleccionada se registra en un YAML por historia

Cada historia registra la configuración resuelta en un archivo YAML propio dentro
de su workspace (no en `spec.md`), junto con la regla que la determinó. Saber qué
configuración se seleccionó es leer ese YAML, no re-inferir.

### AC-5: spec.md deja de declarar la configuración

El front matter de `spec.md` deja de llevar `tier` y `build_mode`, y las secciones
`## Tier Rationale`, `## Change Surface` y `## Build Mode Rationale` se eliminan de
la plantilla y de los artefactos producidos. La justificación de la configuración
es la regla que la determinó, registrada en la config YAML, no prosa en el spec.

### AC-6: Las skills, los validadores y el status leen contrato y config

Las skills de etapa (`sdd-clarify`, `sdd-plan`, `sdd-build`, `sdd-sync`,
`sdd-commit`, `sdd-forge`), `status.mjs` y `validate-artifacts.mjs` obtienen los
requires/produces/handoff/guardrails de su etapa desde el contrato y la config de
la historia, sin re-derivar la matriz y sin una copia privada de la lógica.

### AC-7: La prosa documenta el qué, nunca re-enuncia el mapping

`README.md` y `contracts/TIERS.md` dejan de re-enunciar la matriz completa y en su
lugar referencian el contrato, o se generan a partir de él. Las tablas legibles de
tier y build-mode siguen disponibles como render del contrato, nunca como una
segunda fuente.

### AC-8: Un cambio en el pipeline es una edición en un solo lugar

Cambiar una regla — qué configuración omite una etapa, dónde cierra la historia, o
una allowlist de guardrail — exige editar el contrato (y a lo sumo las reglas), sin
editar ninguna skill, validador ni el README, y `npm test` pasa.

### AC-9: El ecosistema queda en verde y los resultados se preservan

`npm test`, `npm run skills:check` y `/healthcheck --all` pasan después del
refactor. Para una misma configuración, la secuencia de etapas y el lugar de cierre
son los de hoy, verificado extendiendo el test demo de tiers
(`scripts/test/demo-tiers.mjs`) a la matriz completa.

[NEEDS CLARIFICATION: ¿las historias existentes que hoy llevan `tier`/`build_mode`
en `spec.md` se migran de una sola vez a su config YAML, o se mantiene lectura
retrocompatible del front matter durante un período de transición? ¿Quién ejecuta
esa migración y qué la verifica?]

## Out of Scope

- Cambiar los *valores* de los ejes (agregar o quitar configuraciones) — este ítem
  externaliza y centraliza lo que ya existe.
- Cambiar la *política* de guardrails (qué tipos de ítem pueden entrar a una
  configuración) — solo mover dónde se declara.
- Construir un orchestrator determinista o un sistema de plugins — es una fase
  posterior, y consumirá este contrato como su fuente de verdad.
- Los defectos concretos catalogados por separado (el párrafo duplicado en
  `sdd-clarify`, la referencia obsoleta a `skills/design/SKILL.md` en
  `catalogo-guardrails-skills.md`, y el manejo legacy de `hu.md`) — salvo que
  caigan al quitar la matriz duplicada.
