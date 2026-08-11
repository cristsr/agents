# Decision authority — cuándo resolver solo y cuándo escalar

Rúbrica que usa la **fase P (Plan)** para decidir, por cada unknown, si lo resuelve
autónomamente o lo escala al desarrollador.

> **Leerla una vez, al inicio de la fase R** — no por unknown. La evidencia se
> recolecta en R; acá se define cómo se interpreta esa evidencia en P.

La pregunta que separa ambos caminos **no es «técnico vs. negocio»**. Es:

> ¿Existe una fuente de autoridad que **determine** la respuesta, o estoy
> eligiendo entre alternativas legítimas donde la preferencia le pertenece al
> dueño del producto?

---

## 1. Jerarquía de fuentes de autoridad

Consultar en orden. La primera que **determina** la respuesta gana y se cita como
`fuente` en el registro. «Determina» significa que la respuesta se deduce de
ella, no que sea meramente compatible.

| # | Fuente | Qué es | Cómo se cita |
|---|---|---|---|
| 1 | **Reglas del proyecto** | `docs/rules.md` — principios no negociables | `rules.md §<sección>` |
| 2 | **Configuración del proyecto** | `CLAUDE.md`, `.agents/profile.md` — stack, convenciones, fase del proyecto | `CLAUDE.md` / `profile.md §<n>` |
| 3 | **Precedente en el código** | Una decisión equivalente ya tomada en el repo | `<path>:<símbolo>` |
| 4 | **Estándar formal** | RFC, spec HTTP, convención del framework declarado en el profile | `RFC <n>` / `<framework> <convención>` |
| 5 | **Invariantes de el propio ítem** | Otro AC o regla de negocio del `spec.md` que ya fija la respuesta | `AC-<n>` / `Regla <n>` |

Si **ninguna** determina la respuesta → pasar al test de escalamiento (§3).

### Reglas de la jerarquía

- **Un nivel superior gana sobre uno inferior.** Si `rules.md` contradice un
  precedente del código, manda `rules.md` — y el conflicto se anota como
  observación en el registro.
- **Un precedente aislado no es autoridad.** Si el repo resolvió lo mismo de dos
  maneras distintas, no hay precedente: hay inconsistencia. Bajar al nivel 4, y
  si tampoco resuelve, escalar como decisión de alcance.
- **«Compatible con» no es «determinado por».** Que un estándar admita la opción
  elegida no basta si admite igual de bien la alternativa.

---

## 2. Sondeo del código (nivel 3) — ocurre en R3, no acá

La evidencia del nivel 3 se recolecta **entera en la fase R3**, en una sola tanda
de consultas paralelas con techo de 5. Esta rúbrica solo dice cómo **interpretar**
lo que R3 trajo:

| Resultado de R3 | Veredicto |
|---|---|
| Un caso análogo claro, con fuente verbatim | **Precedente** — nivel 3, confianza media |
| Varios casos análogos coincidentes | **Precedente fuerte** — nivel 3, confianza media-alta |
| Varios casos que se contradicen | **No hay precedente, hay inconsistencia** — bajar al nivel 4 y registrarla |
| Sin resultados relevantes | **Sin precedente** — bajar al nivel 4 y registrarlo como señal para `/scan` |

Si `CODEGRAPH` es `no` en el profile, R3 no corre y el nivel 3 simplemente no
existe para esa corrida.

---

## 3. Escalamiento obligatorio

Cuando ninguna fuente determina la respuesta, escalar **solo** si el unknown cae
en alguna de estas cuatro categorías. Fuera de ellas, decidir con la mejor
alternativa disponible y marcarla como confianza baja.

| Categoría | Señal | Ejemplo |
|---|---|---|
| **Alcance** | Una de las salidas agranda materialmente el ítem (módulo nuevo, superficie transversal, trabajo que el usuario no pidió) | «¿`dryRun` en todos los commands o solo donde el caso es claro?» |
| **Intención de negocio** | Dos lecturas del dominio igualmente válidas y ninguna regla desempata | «¿El saldo se recalcula o se congela al cerrar el periodo?» |
| **Irreversibilidad** | Contrato público, semántica de un evento ya emitido, esquema que otros consumen, algo caro de deshacer | «¿Este campo del evento cambia de significado?» |
| **Conflicto de reglas** | La única salida viable viola `docs/rules.md` | «Cumplir el AC exige romper el principio X» |

### Contraejemplos — esto NO se escala

- **Convenciones técnicas con estándar claro:** código HTTP, forma del payload,
  paginación, formato de fecha, códigos de error del motor, exit codes de CLI.
- **Precisión de redacción y testabilidad:** reescribir un AC vago, aplicar EARS.
  No cambia comportamiento; no hay nada que preguntar.
- **Edge cases ya fijados** por un patrón del repo o por `rules.md`.
- **Elección entre alternativas donde una es claramente superior** por una razón
  articulable en una oración. Si podés escribir el fundamento, no necesitás la
  pregunta.

### Presupuesto de escalamiento

Máximo **3 preguntas por corrida**, seleccionadas en P3 sobre la lista **completa**
de candidatos — nunca sobre los primeros que aparecieron. El tope obliga a
jerarquizar en serio en lugar de escalar por comodidad.

Si más de 3 califican, es una **señal sobre el ítem**, no solo un recorte: significa
que hay demasiada decisión de producto abierta y quizás el ítem no está listo para
clarificarse. Escalar los 3 de mayor impacto, resolver el resto con confianza baja,
y advertirlo explícitamente en el cierre.

Si un unknown califica para escalar, la pregunta se formula con
`AskUserQuestion` manteniendo el formato actual: opción recomendada primero con
`" (Recomendado)"` y el fundamento en su `description`.

---

## 4. Niveles de confianza

Cada decisión autónoma se registra con un nivel. Determina el orden del bloque
de revisión final (las bajas primero, para que el ojo caiga ahí).

| Nivel | Cuándo | Ejemplo |
|---|---|---|
| **alta** | Fuente de nivel 1-2, o un estándar formal con verificación objetiva | JCS RFC 8785 (tiene vectores de prueba oficiales) |
| **media** | Precedente único y claro en el repo, o convención del framework sin ambigüedad | `varchar(255)` por consistencia con un campo análogo |
| **baja** | Ninguna fuente determinó; se eligió la mejor alternativa por razonamiento, o el unknown calificaba para escalar pero excedió el presupuesto | Política operacional elegida por criterio |

Toda decisión de confianza **baja** se lista de forma destacada en el cierre.

---

## 5. Casos calibrados (historias reales de este proyecto)

La frontera, con decisiones ya tomadas en `work/done/`:

| Caso | Resolución | Veredicto |
|---|---|---|
| hu-0009 · ¿qué valor de `NODE_ENV` es «producción»? | `NODE_ENV === 'production'` | **Autónoma, alta** — estándar universal del ecosistema (nivel 4) |
| hu-0001 · largo máximo de `Payee` | `255` | **Autónoma, media** — precedente: campo `merchant` en `apps/finances` (nivel 3) |
| hu-0024 · algoritmo de canonicalización | JCS (RFC 8785) | **Autónoma, alta** — RFC con vectores oficiales; la corrección es verificable (nivel 4) |
| hu-0024 · ¿`NOT NULL` desde el día uno? | Sí, reescribiendo la migración | **Autónoma, alta** — `CLAUDE.md` habilita reescribir migraciones sobre base limpia (nivel 2) |
| hu-0024 · ¿se detiene en la primera ruptura o reporta todas? | Recorre todo, exit `1` si hubo alguna | **Autónoma, alta** — convención CLI/CI (nivel 4) |
| hu-0024 · definir el input del hash por exclusión | Payload completo + envelope, menos `recorded_at` y `global_position` | **Autónoma, media** — se deduce de la invariante del AC: un campo nuevo no puede quedar fuera del hash sin que nadie lo note (nivel 5) |
| hu-0002 · `append` con lote vacío | No-op silencioso | **Autónoma, media** — se deduce de las invariantes del ítem (nivel 5) |
| hu-0005 · reintento con `external_ref` distinto | Excepción `LEDGER_ALREADY_INITIALIZED` | **Autónoma, media** — patrón de errores tipados ya establecido (nivel 3) |
| hu-0025 · códigos de PostgreSQL transitorios | Solo `40P01` y `40001` | **Autónoma, alta** — son los canónicos del motor (nivel 4) |
| hu-0025 · `dryRun` ¿body o query param? | Campo del body con `class-validator` | **Autónoma, alta** — `DTO_STYLE` del profile (nivel 2) |
| hu-0025 · **¿`dryRun` en todos los commands de escritura?** | En todos, sin excepciones | **ESCALAR** — categoría *alcance*: define la superficie transversal del ítem |
| hu-0025 · **¿cuántos reintentos y con qué backoff?** | 3 intentos, exponencial con jitter | **ESCALAR** — política operacional con trade-off latencia/resiliencia que ninguna fuente determina |

> Lectura de la tabla: de 12 decisiones reales, 10 tenían fuente de autoridad
> disponible. Las 2 que no, caen limpiamente en las categorías de §3.
