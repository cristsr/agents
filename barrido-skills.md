# Barrido de skills — procedimiento de evaluación

Cómo se evalúa cada `SKILL.md` contra `catalogo-guardrails-skills.md`. Compañero
operativo del catálogo: el catálogo dice qué controles existen, este documento dice
cómo se aplican skill por skill y qué forma final tiene una skill ya evaluada.

**Decisión de alcance vigente:** los guardrails se refuerzan en nivel `blando`
únicamente — sin scripts nuevos ni hooks del harness. Los bloques `Contract` quedan
escritos de forma que un validador pueda leerlos más adelante, pero hoy nadie los
verifica automáticamente. Al elevar esa decisión, el primer paso es extender
`scripts/validate-skills.sh` con el checkpoint entre eslabones (guardrail 4.1).

---

## Estado y orden de ejecución

Viven en **`barrido-plan.md`**: qué está hecho, qué falta, el prompt de arranque de
cada sesión y los criterios de aceptación. Este documento es la norma —lo que no
cambia entre sesiones—; el plan es el estado.

**Se evalúa por pares de traspaso, no por skill suelta.** Un defecto de contrato solo
es visible en la juntura: el hueco de cobertura de ACs entre `/build` y `/sync` no
aparecía leyendo ninguna de las dos por separado.

---

## Ficha de evaluación

Seis campos, calibrados contra el piloto. La ficha es para que las evaluaciones sean
comparables entre sí, no una opinión distinta por skill.

1. **Contrato de entrada** — qué artefactos exige que ya existan (guardrail 1.4) y qué
   valida del argumento recibido (1.1). La distinción importa: `spec-0042` puede ser un
   identificador válido y aun así no tener `plan.md`.
2. **Contrato de salida** — qué garantiza para el siguiente eslabón (2.1) y qué señal
   contable cierra la etapa (2.4). Contable significa verificable por conteo, no por
   juicio del modelo.
3. **Territorio y verbos** — qué rutas escribe (3.5) y qué acciones tiene vedadas (3.3).
4. **Escalada y degradación** — cuándo se detiene y pregunta (3.1) y cuándo continúa por
   una ruta alterna dejando marca (4.2).
5. **Control de flujo** — qué estructura de la sección 5 usa realmente, y cuál debería.
6. **Inventario de guardrails** — por cada control: id del catálogo · nivel actual ·
   nivel suficiente · acción. Este campo es el que produce trabajo accionable; los
   cinco anteriores lo alimentan.

Criterio de §6 del catálogo en todo momento: poner el guardrail cuando el coste del
fallo supere al del falso positivo, y en el **nivel más bajo que sea suficiente**. Un
bucle acotado sobre N tareas conocidas no necesita presupuesto de recursos; un
`while` sí.

---

## Forma final de una skill evaluada

### 1. Bloque `## Contract`

Va inmediatamente después del bloque de perfil, antes del primer paso. Consolida lo que
antes estaba disperso en varias secciones `CRITICAL`. Es índice, no copia: cuando el
detalle ya vive en un paso, lo referencia en vez de duplicarlo — repetirlo reintroduce
la saturación que el bloque venía a resolver.

```markdown
## Contract

**Requires** — tabla de precondiciones, cada una con su acción si falla.
             Se verifican TODAS antes de cualquier trabajo.
**Produces** — qué encontrará la siguiente skill, en términos verificables.
**Writes**   — lista cerrada de rutas escribibles, y qué queda explícitamente fuera.
**Never**    — verbos vedados, pase lo que pase.
**Escalates**— cuándo para y pregunta.
**Degrades** — qué hace cuando una herramienta del perfil está en `—`.
**Profile keys** — las claves del perfil que esta skill lee, agrupadas por para qué.
```

Filas opcionales según la skill: **Reverting**, cuando sobrescribe artefactos vivos
(guardrail 3.7) — nombrar el mecanismo real de vuelta atrás, no prometer uno inexistente.

Referencias del piloto: `skills/build/SKILL.md` y `skills/sync/SKILL.md`.

### 2. Claves del perfil, no literales de ejemplo

**La tabla `| In this document | Key in profile.yaml |` se elimina.** Sustituye a dos
piezas mejores:

- la fila **Profile keys** del `Contract`, que documenta qué lee la skill;
- la clave escrita **inline en el cuerpo**, con el ejemplo entre paréntesis.

```diff
- 1. Run the full test suite: cd <microservice> && npx jest --no-coverage
+ 1. Run `FULL_TEST_CMD` for each affected <component> (e.g. `npx jest --no-coverage`)
```

El ejemplo concreto sobrevive donde ayuda a entender, pero deja de ser el sujeto de la
frase. Los ejemplos puros se quedan en `## Example`, donde el marco ya declara que son
ilustrativos.

**Por qué se va la tabla.** No era redundante — era el único sitio donde aparecían
unas cinco claves por skill. Pero es un mapa que hay que acordarse de consultar, y eso
no es un guardrail. Evidencia del propio repo: `/build` tenía `| develop | BASE_BRANCH |`
en su tabla y aun así comprobaba `∉ {main, master}`, dejando pasar un proyecto cuya
rama base es `develop`. La única skill que resolvía bien la rama era `/forge`, que
escribe `` `BASE_BRANCH` (`develop`) `` inline y no depende de tabla alguna.

Al reescribir, cada literal se clasifica: **normativo** (la acción depende del valor →
se sustituye por la clave) o **ilustrativo** (aclara una frase → se queda, entre
paréntesis o en `## Example`). Es lectura frase a frase; no admite pasada mecánica.

### 3. `CRITICAL` reservado

Un encabezado `## CRITICAL` solo se justifica si su incumplimiento rompe algo
irreversible y no está ya cubierto por el `Contract`. Convenciones de idioma, rutas de
lectura y precondiciones ordinarias no lo son. Cuando todo es crítico, nada lo es.

### 4. Encabezados estructurales

Los que forman contrato entre skills van siempre en inglés y se registran en
`SDD-PIPELINE.md`: `## Ambiguity Resolution`, `## Design Decisions`,
`## Global Architecture Impact`, `## AC Coverage`, `Task N`. Traducir uno rompe el
pipeline.

---

## Patrones a replicar

Salieron del piloto y valen para el resto:

- **Idempotencia por clave de identidad** (`sync`, Step 3): antes de escribir, comprobar
  si la entidad ya existe por su clave estable (`use_case`, `operationId`) y distinguir
  modificación de duplicado. Es el mejor guardrail del ecosistema; varias skills ganan
  más copiándolo que inventando controles nuevos.
- **Lista explícita permitido/prohibido** para verbos vedados (`sync`, bloque `Never`),
  en vez de una prohibición en prosa.
- **Gate contable en vez de autoevaluación** (`design`, *ambiguity gate*; `build`,
  `## AC Coverage`): cero marcadores sin resolver, cero líneas en `✗`.

## Qué no hacer

- **No centralizar el preámbulo compartido en un archivo referenciado.** Obliga a una
  lectura extra por invocación y queda fuera del validador, que comprueba rutas
  `references/<f>` locales a cada skill (`scripts/validate-skills.sh`). Lo que sobra son
  copias del mismo nivel: la cura es borrar, no añadir un sitio más donde mirar.
- **No añadir guardrails porque el catálogo los enumera.** Cada control `blando` nuevo
  degrada el cumplimiento de los que ya existen.
- **No medir el éxito en líneas ahorradas.** La deduplicación del bloque de perfil
  ahorró 3 líneas en 13 skills; lo que arregló fue que quince avisos falsamente marcados
  `CRITICAL` dejaran de competir con los verdaderos.
