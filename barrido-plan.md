# Barrido de skills — plan de ejecución

Una sesión por fila. Cada sesión arranca en frío: el prompt de abajo contiene todo lo
necesario y no depende de ninguna conversación anterior.

La norma que se aplica vive en `barrido-skills.md`. Este archivo es solo estado:
qué se hizo, qué falta y qué se encontró por el camino.

---

## Estado de un vistazo (2026-08-13)

**Barridas — 17 de 24 skills**, en dos grupos con criterio de cierre distinto:

- **Las 15 con contrato** (`spec` · `clarify` · `design` · `plan` · `build` · `sync` ·
  `commit` · `status` · `forge` · `hotfix` · `refine` · `scan` · `prepare` ·
  `architecture` · `hexagonal-audit`): bloque `## Contract` propio, cero tablas, cero
  `## CRITICAL`.
- **Las 2 meta** (`skill-creator` · `skill-evaluator`, fila S6): **enseñan** el
  formato en vez de llevarlo. No tienen `Contract` propio —son standalone por la
  definición que ellas mismas fijan— pero lo generan y lo puntúan.

**El barrido ya no caduca:** una skill nueva nace con `Contract` si le corresponde, y
`/skill-evaluator` la puntúa contra los siete criterios (grupo `C1`–`C7`).

Comprobación mecánica de que las diecisiete siguen bien:

```bash
# Grupo A — las 15 con contrato
for s in spec clarify design plan build sync commit status forge hotfix refine scan prepare architecture hexagonal-audit; do f=skills/$s/SKILL.md; \
  printf "%-16s Contract:%s tabla:%s CRITICAL:%s\n" "$s" \
  "$(grep -c '^## Contract' $f)" "$(grep -c '^| In this document' $f)" \
  "$(grep -c '^## CRITICAL' $f)"; done
# Esperado: Contract:1 tabla:0 CRITICAL:0

# Grupo B — las 2 meta: enseñan el formato, no lo tienen
for s in skill-creator skill-evaluator; do f=skills/$s/SKILL.md; \
  printf "%-16s enseña:%s tabla:%s CRITICAL:%s\n" "$s" \
  "$(grep -c 'pipeline skills only' $f)" "$(grep -c '^| In this document' $f)" \
  "$(grep -c '^## CRITICAL' $f)"; done
# Esperado: enseña:>=1 tabla:0 CRITICAL:0
```

**Dos avisos sobre este chequeo, o la siguiente sesión "arreglará" lo que está bien:**

- El grep de la tabla es `^| In this document`, **no** `Key in profile.yaml`. Desde S6
  las meta mencionan la tabla para prohibirla, y el grep viejo las marcaba en rojo.
  El nuevo solo detecta encabezados de tabla reales, a principio de línea.
- No busques `^## Contract` en las meta: sale 2 en `skill-creator`, y son los bloques
  de ejemplo dentro de fences. Es correcto — es la plantilla que enseña.

**Pendientes — 7 skills**, inventariadas una por una abajo. Ninguna es bloqueante: el
pipeline está cerrado y el formato se autopropaga.

**El árbol está sin commitear**: ningún `git add`. Si la siguiente sesión no reconoce
los cambios, son estos — no hay nada perdido.

### Territorio cerrado — no tocar sin una fila que lo justifique

Estas diecisiete están OK. Una sesión de S10 que las modifique está pisando trabajo
cerrado; si encuentra un defecto en ellas, **lo anota, no lo arregla** (regla de
handoff):

`spec` · `clarify` · `design` · `plan` · `build` · `sync` · `commit` · `status` ·
`forge` · `hotfix` · `refine` · `scan` · `prepare` · `architecture` ·
`hexagonal-audit` · `skill-creator` · `skill-evaluator`

**Excepción registrada:** S7 editó `build`, ya cerrado en el piloto, para resolver la
colisión que el propio plan le asignaba (`Requires` de rama + comprobación posterior a
Task 0). La regla de handoff cede cuando una fila trae el defecto asignado por escrito
y el arreglo no cabe en un solo lado de la juntura — que era el caso: el gate vivía en
`build` y `forge` lo replicaba.

---

## Cómo iterar

En una sesión nueva, pega esto sustituyendo `<SKILL>` y `<PAR>` por la fila que toque:

```
Lee ~/.agents/barrido-skills.md — es la norma del barrido — y aplícala a
skills/<SKILL>/SKILL.md.

Par de traspaso: <PAR>. Lee su bloque `## Contract` y verifica la juntura en ambos
sentidos: que lo que produce el eslabón anterior cubre lo que esta skill exige, y que
lo que esta produce cubre lo que exige el siguiente.

Referencias ya evaluadas, úsalas como modelo: skills/build/SKILL.md y
skills/sync/SKILL.md.

Antes de cerrar, corre `bash scripts/validate-skills.sh` y actualiza la fila de
<SKILL> en ~/.agents/barrido-plan.md: estado, hallazgos y cualquier defecto que
descubras en OTRA skill (no lo arregles allí, anótalo).
```

**Regla de handoff:** un hallazgo que afecte a una skill que no te toca se anota, no se
arregla. Arreglarlo desde fuera de su sesión deja el cambio sin la ficha que lo
justifica, y la siguiente sesión no sabrá por qué está ahí.

**El territorio de una fila es la carpeta entera de la skill, no solo su `SKILL.md`.**
Aprendido en S4: restringir el trabajo al `SKILL.md` dejó
`skills/plan/references/plan-header-template.md` contradiciendo a su propia skill —
seguía pidiendo el nombre de rama en tiempo de ejecución, contra la autonomía de
`/build`. Si tocas el `SKILL.md`, revisa sus `references/`.

### Si se ejecutan varias filas en paralelo

Se hizo así con S1-S5 y funcionó, pero tiene dos costes que hay que cubrir a mano:

- **Cada agente lee a sus vecinos mientras estos se reescriben.** Dos hallazgos de S3
  contra `plan` eran estado intermedio que S4 ya había corregido. Verifica las junturas
  otra vez al final, con ambos lados en su versión definitiva.
- **La consolidación se centraliza.** Ningún agente escribe `barrido-plan.md`,
  `barrido-skills.md` ni `SDD-PIPELINE.md`: devuelven su ficha y quien orquesta escribe
  las filas de una vez. Si no, se pisan.

## Criterios de aceptación

Los mismos para toda skill del pipeline. Una sesión no cierra sin los siete:

- [ ] Bloque `## Contract` con las filas que apliquen: `Requires`, `Produces`, `Writes`,
      `Never`, `Escalates`, `Degrades`, `Profile keys` (+ `Reverting` si sobrescribe)
- [ ] `Profile keys` coherente con la fila de la skill en `SDD-PIPELINE.md` — si
      discrepan, una de las dos está mal: averigua cuál y anótalo. Contrasta siempre
      contra `sdd-profile.template.yaml`, que es la fuente real. En las cinco filas
      contrastadas hasta ahora la equivocada fue **siempre la tabla**, nunca la skill:
      dala por sospechosa, y no la edites (ver hallazgo abierto)
- [ ] Tabla `| In this document | Key in profile.yaml |` eliminada
- [ ] Literales normativos convertidos a su clave; los ilustrativos, entre paréntesis
      o en `## Example`
- [ ] Ningún `## CRITICAL` que el `Contract` ya cubra
- [ ] Juntura verificada con el par: `Produces` del anterior ⊇ `Requires` de esta
- [ ] `bash scripts/validate-skills.sh` en verde

Para las skills de convención (`typescript`, `error-handling`, `design-principles`) la
ficha se reduce a los campos 5 y 6: no tienen traspaso ni territorio, solo exponen
reglas a otras skills. No fuerces un `Contract` donde no hay contrato.

---

## Tramos 1-3 — el pipeline (todo el valor está aquí)

| # | Skill | Líneas | Par de traspaso | Estado | Hallazgos |
|---|---|---|---|---|---|
| S1 | `spec` | 380 → 460 | `clarify` (produce su entrada) | hecho 2026-08-13 | `Reverting` añadido (sobrescribe `spec.md`); gate contable de ACs y marcadores en el cierre; `## Out of Scope` la escribe `/spec` y `/design` no la menciona |
| S2 | `clarify` | 544 → 631 | `spec` ← → `design` | hecho 2026-08-13 | degradación `CODEGRAPH: no` → `EXPLORER_SUBAGENT`, y `none` → inline, documentada por primera vez en el cuerpo; gate nuevo: un `spec.md` sin ACs detiene la ejecución |
| S3 | `design` | 685 → 751 | `clarify` ← → `plan` | hecho 2026-08-13 | tres defectos internos: PHASE 4 decía `DESIGN_OUTPUT_MODE = delta` (valor inexistente, el modo docs-as-code no se activaba nunca); ese modo se saltaba `design.md` y con él `## Global Architecture Impact`; `TRIGGER_TAXONOMY` era clave fantasma |
| S4 | `plan` | 380 → 446 | `design` ← → `build` | hecho 2026-08-13 | `<flow-artifact>` resuelto por `DESIGN_OUTPUT_MODE`: `/plan` exigía `docs/diagram.md` siempre y se paraba en falso en `full-flow`; Task 0 ramifica desde `BASE_BRANCH` y es re-ejecutable |
| S5 | `commit` + `status` | 260 + 94 → 310 + 138 | `sync` → `commit` | hecho 2026-08-13 | `Reverting` acotada a `reset --soft`/`restore --staged`, válida solo mientras nada se haya empujado; `status` cerrado sin `Escalates` ni `Degrades`, según la norma |

`design` y `clarify` van solas: 1.229 líneas entre las dos no caben con margen en una
sesión compartida.

Las cinco se ejecutaron en paralelo, un agente por fila, con la regla de handoff
activa y la consolidación centralizada. El punto ciego del paralelismo —cada agente
lee a sus vecinos mientras estos se reescriben— se cerró con una verificación cruzada
posterior: dos hallazgos de S3 contra `plan` resultaron ser estado intermedio que S4 ya
había corregido.

## Meta — hacer que el barrido persista

| # | Skill | Líneas | Estado | Hallazgos |
|---|---|---|---|---|
| S6 | `skill-creator` + `skill-evaluator` | 352 + 313 → 480 + 389 (+ `skill-template.md` 163 → 230 y `rubric.md` 285 → 362) | hecho 2026-08-13 | concepto nuevo **pipeline vs standalone** como gate del `Contract`; grupo **C1–C7** en el rubric, mapeado 1:1 con el checklist de cierre de `skill-creator`; **defecto grave en la regla B9** (ver abajo); `## CRITICAL: Output Language` retirado de ambas |

Sin este paso el trabajo caducaba: cada skill nueva nacería sin `Contract` y con su
tabla de literales. Se ejecutó después de S5, con el formato ya probado en las ocho
del flujo — grabarlo en las meta-skills mientras el formato aún se movía habría
obligado a rehacerlo.

S6 fue distinta de las demás filas: no se trataba de darle un `Contract` a
`skill-creator` y `skill-evaluator` —ninguna participa en el pipeline—, sino de que
**enseñen el formato**. Qué quedó:

- **`/skill-creator`**: PHASE 1 pregunta 6 (qué lee, qué escribe, quién va antes y
  después) recoge el material del contrato; **PHASE 2 Step 4** decide pipeline o
  standalone; PHASE 5 enseña el bloque `## Contract`, las claves inline con el
  ejemplo entre paréntesis y los encabezados estructurales en inglés; PHASE 7 cierra
  con siete ítems etiquetados `C1`–`C7`. `references/skill-template.md` trae la
  plantilla del bloque fila por fila.
- **`/skill-evaluator`**: PHASE 1 Step 4 clasifica el objetivo, y la **PHASE 6** nueva
  (renumera las dos últimas a 7 y 8) aplica C1–C7 solo a skills pipeline. El rubric
  gana el grupo C con severidades, cómo leer una juntura en ambos sentidos y cómo
  clasificar un literal.

**El gate importa tanto como el formato.** Sin él, `/skill-creator` le pondría un
`Contract` a cada skill de convención, que es justo lo que la norma prohíbe y lo que
el tramo 5 tendrá que evitar. La definición está afinada para que las dos meta-skills
salgan **standalone** por su propia regla: consumir un archivo arbitrario que el
usuario señala no es un traspaso, por mucho que suela ejecutarse detrás de otra skill.

**Punto de decisión — aquí estamos.** Con S6 cerrada están hechos todos los traspasos
del pipeline y el formato se autopropaga; con S7 cerrada, también la órbita de
ejecución y el único hallazgo que traía trabajo asignado. Lo que queda (S8-S10) es
opcional por diseño y de menor retorno. Con S9 cerrada **no queda ninguna tabla de
literales viva** y todas las skills que participan en un traspaso —las quince— declaran
su contrato. Lo que resta es el tramo 5: siete skills sin traspaso, 1.454 líneas, cinco
`## CRITICAL` de los que cuatro son de idioma. La ficha se les reduce a los campos 5 y
6 y ninguna lleva `Contract`; es cierre cosmético, no estructural.

## Inventario de lo pendiente (medido 2026-08-13)

Las **12** que quedan, con la carga real de cada una. `tabla` = encabezado
`| In this document |` vivo; `CRITICAL` = encabezados `## CRITICAL`; `refs/` =
archivos en su carpeta `references/`, que **también son territorio de la fila**.

| Fila | Skill | Líneas | tabla | CRITICAL | refs/ |
|---|---|---|---|---|---|
| S10 | `typescript` | 336 | 0 | 0 | 2 |
| S10 | `error-handling` | 233 | 0 | 0 | 1 |
| S10 | `design-principles` | 262 | 0 | 0 | 2 |
| S10 | `hexagonal-architecture` | 200 | 0 | 1 | 1 |
| S10 | `rules` | 258 | 0 | 1 | 1 |
| S10 | `healthcheck` | 61 | 0 | 1 | 0 |
| S10 | `profile` | 104 | 0 | 2 | 0 |
| | **total** | **1.454** | **0** | **5** | **7** |

Cobertura verificada contra el disco: 17 hechas + 7 pendientes = **24 carpetas en
`skills/`**, sin huecos, sin duplicados y sin filas que citen skills inexistentes.

Lo que dice el inventario, y que cambia cómo abordar lo que queda:

- **No queda ninguna tabla de literales viva.** Las siete pendientes son las del tramo
  5, y ninguna leyó nunca el perfil con tabla de traducción.
- **De los 5 `## CRITICAL` que quedan, 4 son `Output Language`** — retirada mecánica:
  la norma §3 los excluye por nombre. El **único que pide criterio** está en `profile`.
- **S10 es más ligera de lo que aparenta.** 1.454 líneas, pero cero tablas y solo 5
  `CRITICAL`, cuatro de ellos de idioma. Sus tres skills de convención (`typescript`,
  `error-handling`, `design-principles`) entran ya limpias: la ficha se les reduce a
  los campos 5 y 6, y por la definición de S6 son **standalone** — no llevan
  `Contract`.

> **Nota de medición.** `profile` cambió durante la sesión de S6 por edición externa,
> ajena al barrido: en `HEAD` son 61 líneas y 1 `## CRITICAL`, y en el árbol de
> trabajo 104 y 2. La tabla recoge el árbol de trabajo. Si alguna cifra no cuadra al
> retomar, vuelve a medir antes de dar por buena la tabla: es una foto, no un
> contrato.

---

## Tramo 4 — órbita del pipeline (opcional)

| # | Skill | Líneas | Par de traspaso | Estado | Hallazgos |
|---|---|---|---|---|---|
| S7 | `forge` + `hotfix` | 225 + 305 → 281 + 363 | encadena `plan`/`build`/`sync` | hecho 2026-08-13 | colisión `/build` ↔ `Task 0` **resuelta** (ver abajo); dos defectos de juntura nuevos: `forge` prometía cero pausas y `/plan` sí pregunta la rama; `hotfix` añadía ACs sin tocar `## AC Coverage`, dejando la historia incerrable para `/sync` |
| S8 | `refine` + `scan` | 368 + 180 → 486 + 256 | reescriben artefactos de otras | hecho 2026-08-13 | `scan` hereda ya el `Degrades` de `clarify`; **`refine` guiaba por secciones que no existen** — su lista para `context.md` y `design.md` no coincidía con las plantillas reales, y omitía `## Global Architecture Impact`, con lo que un refinamiento podía dejar el C4 desalineado sin que `/sync` se enterara |
| S9 | `prepare` + `architecture` + `hexagonal-audit` | 171 + 278 + 115 → 231 + 332 + 189 | `prepare`→`clarify`; `sync`→`architecture`; `hexagonal-audit`→`clarify` | hecho 2026-08-13 | `prepare` prometía fast-forward en prosa y el comando era `git pull` a secas — ahora `--ff-only`; `hexagonal-audit` podía sobrescribir un `work/active/<id>/` existente y emitir un `spec.md` sin ACs, que `/clarify` rechaza (juntura muerta); tampoco comprobaba que el proyecto declare arquitectura hexagonal |

`forge` merece atención: encadena tres skills sin pausa, así que hereda sus contratos y
es donde un `Requires` mal declarado se nota antes. Se confirmó en S7 — los dos defectos
de juntura que salieron solo eran visibles desde la cadena, no leyendo cada skill sola.

**Cómo quedó la colisión de la rama (S7).** Un único dueño: `Task 0` crea la rama de
trabajo, y el gate de `/build` existe para impedir que se escriba código sobre la base,
no para impedir que Task 0 corra. En concreto:

- `/build` `Requires`: la rama base solo detiene la ejecución **si no hay un `Task 0`
  pendiente** que vaya a salir de ella; y `/build` **vuelve a comprobar la rama justo
  después de Task 0**, antes de tocar ningún fuente. El gate se cierra con el resultado
  de Task 0, no con el estado inicial.
- `/forge`: arrancar en `BASE_BRANCH` es el estado **normal** (lo deja `/prepare`), así
  que ya no para por ello. Para si el árbol está sucio, avisa si la base está vieja, y
  aborta si el `plan.md` que devolvió `/plan` no abre con `Task 0` — es la única
  comprobación estructural que `forge` posee.
- `/hotfix`: el gate sí es estricto (`∉ {main, master, BASE_BRANCH}`), porque post-build
  no queda ningún Task 0 que justifique estar en la base.

## Tramo 5 — convención y meta (menor retorno)

| # | Skill | Líneas | Estado | Hallazgos |
|---|---|---|---|---|
| S10 | `typescript`, `error-handling`, `design-principles`, `hexagonal-architecture`, `rules`, `healthcheck`, `profile` | 1.411 | pendiente | |

Estas no tienen contratos de traspaso. La ficha se limita a comprobar que no
contradigan el catálogo ni a las skills que las invocan.

---

## Ya hecho

| Fecha | Qué | Resultado |
|---|---|---|
| 2026-08-13 | Piloto `build` + `sync` | `Contract` en ambas, `## AC Coverage` como contrato nuevo entre las dos, tablas de literales eliminadas, 7 `## CRITICAL` retirados |
| 2026-08-13 | Preámbulo de perfil en las 15 skills que lo tenían | Redacción única; 15 falsos `CRITICAL — Working directory` eliminados |
| 2026-08-13 | Tramos 1-3 completos (S1-S5) | `Contract` en las ocho skills del flujo; cero tablas de literales y cero `## CRITICAL` en las ocho; cuatro defectos de contrato corregidos (ver filas) |
| 2026-08-13 | Consolidación posterior a S1-S5 | `plan-header-template.md` alineado con su `SKILL.md` (pedía el nombre de rama en ejecución, contra la autonomía de `/build`, y usaba `develop` literal); `WORKING_DIRECTORY` añadido a `Profile keys` de `build` y `sync`; el `Produces` de `sync` enumera ya que `spec.md` y `plan.md` viajan dentro de `work/done/` |
| 2026-08-13 | S6 — las meta-skills enseñan el formato | El barrido deja de caducar: `/skill-creator` genera el `Contract` (con gate pipeline/standalone) y `/skill-evaluator` lo puntúa con el grupo C1–C7. Territorio completo: los dos `SKILL.md`, `skill-template.md`, `frontmatter-reference.md` y `rubric.md` |
| 2026-08-13 | S9 — órbita de entrada y salida (`prepare` + `architecture` + `hexagonal-audit`) | Las tres últimas tablas de literales eliminadas y 7 `## CRITICAL` retirados. `prepare` gana `--ff-only` (la prosa lo exigía, el comando no) y un `Writes` que dice lo que ninguna otra skill puede decir: no escribe ningún archivo. `hexagonal-audit` deja de poder pisar un `work/active/<id>/` existente y declara el gate que la une a `/clarify`: cada `spec.md` que genera lleva al menos un AC numerado |
| 2026-08-13 | S8 — las que reescriben artefactos ajenos (`refine` + `scan`) | `Contract` en ambas; `Writes` acotado a un artefacto por invocación en `refine` y a `context.md` en `scan`, con `plan.md` prohibido explícitamente. `refine` deja de guiar por secciones inexistentes: sus listas se alinearon con `context-template.md` y `design-template.md`, y `## Global Architecture Impact` pasa a ser refinable con su propia regla de coherencia (Rule 9) |
| 2026-08-13 | S7 — órbita de ejecución (`forge` + `hotfix`) | `Contract` en ambas; 6 `## CRITICAL` y 2 tablas retirados. Colisión `/build` ↔ `Task 0` cerrada con un dueño único de la rama (Task 0 la crea; el gate se cierra *después* de ejecutarlo). `forge` declara su única pregunta; `hotfix` mantiene ya `## AC Coverage`, sin lo cual `/sync` rechazaba la historia |
| 2026-08-13 | Regla B9 corregida (hallazgo de S6) | `B9` decía «no `<` ni `>` en el frontmatter» y el `description: >` de **las 24 skills del repo** es un escalar plegado de YAML: la regla marcaba el ecosistema entero como BLOCKING. Reescrita en los cinco sitios donde vivía para prohibir etiquetas XML y no la sintaxis YAML |

### Hallazgos abiertos

- ~~**Colisión de contrato entre `/build` y `Task 0`.**~~ **Cerrada en S7.** El gate de
  `/build` es ahora condicional al `Task 0` pendiente y se vuelve a comprobar justo
  después de ejecutarlo; `forge` deja de parar en la rama base y valida en su lugar que
  el plan abra con `Task 0`; `hotfix` mantiene el gate estricto. Detalle en el tramo 4.
- ~~**`/build` comprobaba la rama base como `∉ {main, master}`**, ignorando
  `BASE_BRANCH`.~~ **Cerrado en S9.** Corregido en el piloto, en `plan` (S4), en
  `hotfix` (S7) y revisado en `prepare` (S9): allí el patrón ya era correcto —`prepare`
  *lleva* el repo a `BASE_BRANCH`, no lo prohíbe—, pero salió otro defecto del mismo
  tipo: la prosa exigía fast-forward y el comando era `git pull` a secas. Ahora
  `--ff-only`, que es lo que hace comprobable «nunca pierdas trabajo».
- **`docs/audits/<date>-<scope>.md` es la única ruta de documentación sin clave de
  perfil.** Todas las demás tienen su `DOCS_*`; el destino del informe de
  `/hexagonal-audit` está escrito a mano. Añadir `DOCS_AUDITS` toca
  `sdd-profile.template.yaml` y el validador, así que queda fuera de S9. Mientras no
  exista, la ruta es un literal consciente, no un descuido.
- **`SDD-PIPELINE.md` mantiene a mano una tabla "Profile keys per skill"** que nadie
  sincroniza. Cerrado el pipeline, las ocho skills declaran ya sus claves y **las cinco
  filas contrastadas resultaron incompletas** (`spec`:86, `clarify`:88, `design`:90,
  `plan`:91, `commit`:94), y las filas siguientes añadieron cinco más: `forge`:95 y
  `hotfix`:96 (S7), `refine`:97 (S8), `prepare`:87 y `architecture`:98 (S9).
  **Diez de diez filas contrastadas salieron incompletas**, aunque el margen varía
  mucho: a `refine` le falta casi todo, y a `prepare` solo `DOCS_COMPONENTS_INDEX` y
  `COMPONENT_TERM` — es la única que casi acierta. `status` y `hexagonal-audit` no
  tienen fila; la de `scan` remite a la de `clarify`, que es la única forma sostenible
  de mantenerla a mano y aun así hereda su error. `IDENTIFIER_LANGUAGE` no aparece en
  ninguna ni en la nota al pie pese a declararlo trece skills. En los diez casos el
  lado equivocado fue la tabla, nunca la skill. **Decisión pendiente:** eliminarla y
  dejar el `Contract` de cada skill como única fuente, o conservarla como índice y
  derivarla con `scripts/validate-skills.sh`. Mantenerla a mano ya está descartado por
  la evidencia.
- **La única pregunta de la cadena `/forge` es la rama de `Task 0`** (`Escalates` de
  `plan`: «never invented»). S7 lo declaró en el `Contract` de `forge` en vez de
  taparlo —«sin pausas» significa sin pausa de revisión, no cero preguntas—, pero queda
  la decisión de fondo: `/plan` podría derivar el nombre de `STORY_KEY_PATTERN` y
  ofrecerlo como default confirmable. Es territorio de `plan`, cerrado en S4; no se
  tocó.
- **`hotfix` puede dejar una historia incerrable** si el proyecto tiene planes
  anteriores a `## AC Coverage`: al añadir un AC nuevo no hay sección donde escribir su
  línea, y `/sync` exige una por AC. S7 optó por no escribir una sección parcial y
  avisar en el cierre. Si aparece a menudo, la salida es que `/sync` acepte la ausencia
  total como hoy pero exija completitud cuando exista — ya lo hace; el hueco es solo
  para historias mixtas.
- **Los literales del `description` del frontmatter no se sustituyen por claves.** En
  `refine` se dejaron a propósito (`docs/api.yaml`, `docs/diagram.md`, «fix the
  api.yaml»): son frases de disparo, lo que el usuario teclea, no instrucciones
  normativas. La norma §2 aplica al cuerpo del documento; el frontmatter se rige por el
  criterio de disparadores de `/skill-evaluator`. No «arreglar» esto en S9-S10.
- **La `description` del frontmatter de `design`** describe solo el modo `full-flow`
  como si fuera el comportamiento normal, cuando el default del perfil es `full`. No
  afecta a los disparadores.
- ~~**`scan` debería heredar literalmente el bloque `Degrades` de `clarify`**~~
  **Cerrado en S8.** El `Contract` de `scan` lo declara como «la misma cadena de
  `/clarify`, menos la mitad de precedentes que no ejecuta», y el cuerpo remite al
  bloque en vez de repetirlo.
- **`skills/scan/references/` es territorio compartido.** `scan-guide.md` y
  `context-template.md` viven físicamente ahí, pero `/clarify` los lee por ruta
  relativa (`../scan/references/…`, `clarify:298` y `clarify:504`) y son la razón de
  que el `context.md` de las dos skills salga idéntico. **No mover ni renombrar esos
  dos archivos** sin tocar `clarify` en la misma sesión.
- **Notación de placeholder divergente**: `spec` usa `<story-id>` y el resto del flujo
  `spec-<number>`. Resuelven a lo mismo; la juntura se lee peor de lo que es.
- **Las meta-skills están excluidas del validador** (`NOT_META` en
  `scripts/validate-skills.sh`). La exclusión está justificada —contienen rutas de
  ejemplo como `references/api-patterns.md` que darían falso positivo— pero el coste
  es que un enlace `references/` roto de verdad en ellas no se detectaría nunca. Los
  cuatro reales se verificaron a mano en S6 y resuelven. Si algún día molesta, la
  salida es marcar los ejemplos con un prefijo que el validador ignore, no quitar la
  exclusión.

### Diferido por decisión de alcance

El barrido refuerza guardrails en nivel `blando` únicamente. Queda fuera, disponible
cuando se quiera garantía en vez de intención: extender `scripts/validate-skills.sh`
con el checkpoint entre eslabones (guardrail 4.1) — parsear los bloques `Contract` y
comprobar que el `Produces` de cada skill cubre el `Requires` de la siguiente. Sin eso,
ningún contrato de este barrido es verificable.
