---
name: skill-evaluator
description: >
  Revisa una skill existente contra la guía oficial de Anthropic y produce un
  reporte con hallazgos priorizados por severidad, una batería de tests de
  disparo y las correcciones concretas a aplicar. Valida las reglas duras del
  frontmatter, evalúa la calidad de la description, detecta riesgos de
  sobre-disparo y sub-disparo, revisa la estructura y el uso de progressive
  disclosure, y chequea que las instrucciones sean accionables.
  Use when the user says "/skill-evaluator", "revisar esta
  skill", "evaluar skill", "por qué mi skill no dispara", "la skill dispara de
  más", "auditar SKILL.md", "mejorar esta skill", "revisá mis skills", or points
  at a skill folder or SKILL.md and asks for feedback.
  Do NOT use to create a skill from scratch (use /skill-creator), to review
  application code (use /code-review), or to run automated test suites — esta
  skill diagnostica y propone tests, no los ejecuta.
---

# skill-evaluator

## Overview

Revisa una o varias skills contra la guía oficial de Anthropic y devuelve un
diagnóstico accionable: qué está roto (bloqueante), qué la hace no disparar, y
qué correcciones concretas aplicar.

Esta skill es **agnóstica** — evalúa skills de cualquier proyecto o dominio.

**Announce at start:** "Voy a evaluar la skill contra la guía. Arranco leyendo la carpeta."

**Output:** un reporte en el chat con hallazgos priorizados, batería de tests de
disparo, y — solo si el usuario lo aprueba — las ediciones aplicadas.

**Core principle:** la mayoría de las skills fallan por la `description`, no por
las instrucciones. Priorizar los hallazgos por lo que realmente cambia el
comportamiento: primero lo que impide que la skill cargue o se instale, después
lo que la hace disparar mal, y al final el pulido de redacción.

**CRITICAL: esta skill diagnostica; no reescribe sin permiso.** Mostrar el
reporte primero y pedir confirmación antes de editar archivos.

---

## PHASE 1: Ubicar y cargar la skill

### Step 1 — Resolver el objetivo

Orden de preferencia:
1. El usuario pasó una ruta explícita (carpeta o `SKILL.md`) → usarla.
2. El usuario nombró una skill (ej. "revisá `commit`") → buscarla:

```bash
find ~/.claude/skills ~/.agents/skills .claude/skills -maxdepth 2 -iname "SKILL.md" 2>/dev/null
```

3. El usuario dijo "revisá mis skills" sin especificar → listar las encontradas
   y preguntar con `AskUserQuestion` (`header: "Skill"`) cuál evaluar. Si son
   pocas y lo pide explícitamente, evaluar todas y reportar por skill.

### Step 2 — Inventariar la carpeta

```bash
SKILL_DIR=<ruta resuelta>
ls -la "$SKILL_DIR"
find "$SKILL_DIR" -type f | sort
wc -w "$SKILL_DIR/SKILL.md"
```

Registrar: nombre exacto del archivo principal, subcarpetas presentes,
existencia de `README.md`, cantidad de palabras de `SKILL.md`.

### Step 3 — Leer

Leer `SKILL.md` completo. Leer también los archivos de `references/` **solo si**
`SKILL.md` los enlaza — si no los enlaza, eso ya es un hallazgo (ver D3).

---

## PHASE 2: Reglas duras (bloqueantes)

Consultar `references/rubric.md` para la rúbrica completa con severidades.

Estas son binarias: se cumplen o la skill está rota. Cualquier fallo acá es
severidad **BLOQUEANTE** y va primero en el reporte.

| ID | Regla | Cómo se verifica |
|---|---|---|
| B1 | El archivo se llama exactamente `SKILL.md` (case-sensitive) | `ls` — no `SKILL.MD`, no `skill.md` |
| B2 | Frontmatter con delimitadores `---` de apertura y cierre | Leer las primeras líneas |
| B3 | YAML válido (comillas cerradas, indentación consistente) | Parsear mentalmente; buscar comillas sin cerrar |
| B4 | `name` presente y en kebab-case | Sin espacios, mayúsculas ni guiones bajos |
| B5 | `name` coincide con el nombre de la carpeta | Comparar |
| B6 | `name` no contiene "claude" ni "anthropic" | Reservados |
| B7 | `description` presente | — |
| B8 | `description` bajo 1024 caracteres | Contar |
| B9 | Sin corchetes angulares (`<` `>`) en el frontmatter | Buscar en el bloque completo |
| B10 | Sin `README.md` dentro de la carpeta de la skill | `ls` |

Para contar caracteres de la `description` sin estimar a ojo:

```bash
python -c "import sys,re,io; t=io.open(sys.argv[1],encoding='utf-8').read(); m=re.search(r'^---\n(.*?)\n---', t, re.S); d=re.search(r'^description:\s*(.*?)(?=^\w+:|\Z)', m.group(1), re.S|re.M); print(len(' '.join(d.group(1).split())))" "$SKILL_DIR/SKILL.md"
```

---

## PHASE 3: Calidad de la `description`

Es el análisis de mayor impacto. La `description` es lo único siempre cargado y
es lo que decide el disparo.

### Chequeos

| ID | Chequeo | Falla si… |
|---|---|---|
| D1 | Dice **qué hace** la skill | Solo dice cuándo, o es puro nombre de dominio |
| D2 | Dice **cuándo usarla** con frases de usuario reales | No hay frases disparadoras, solo descripción técnica |
| D3 | Las frases son las que un usuario **realmente diría** | Usa jerga interna que el usuario nunca tipearía |
| D4 | Menciona tipos de archivo si son relevantes | Maneja `.csv`/`.fig`/`.pdf` y no los nombra |
| D5 | Tiene disparadores negativos si hay skills vecinas | Alcance solapado sin `Do NOT use…` |
| D6 | No es genérica | "Ayuda con proyectos", "Procesa documentos" |

### Diagnóstico de disparo

Clasificar el riesgo en una de tres:

| Riesgo | Señales | Corrección |
|---|---|---|
| **Sub-disparo** | Description genérica; sin frases disparadoras; el usuario tiene que invocarla a mano | Agregar detalle y matices a la description — sobre todo keywords y términos técnicos que el usuario usa |
| **Sobre-disparo** | Description demasiado amplia; carga en queries no relacionadas; el usuario la desactiva | Agregar disparadores negativos, ser más específico, acotar el alcance |
| **OK** | Frases concretas, alcance acotado, exclusiones donde hace falta | — |

### Técnica de debug (recomendarla al usuario)

> Preguntale a Claude en una sesión limpia: "¿Cuándo usarías la skill
> `<nombre>`?". Claude va a citar la description de vuelta. Lo que falte en esa
> respuesta es exactamente lo que falta en la description.

---

## PHASE 4: Estructura y progressive disclosure

| ID | Chequeo | Umbral |
|---|---|---|
| E1 | Carpeta en kebab-case | Sin espacios, guiones bajos ni mayúsculas |
| E2 | `SKILL.md` bajo 5.000 palabras | Si se pasa → mover detalle a `references/` |
| E3 | Los `references/` están enlazados explícitamente desde `SKILL.md` | Un archivo que nadie enlaza no se carga nunca |
| E4 | No hay carpetas vacías (`scripts/`, `assets/`, `references/`) | Andamiaje sin contenido = ruido |
| E5 | El detalle pesado vive en `references/`, no inline | Nivel 3 de progressive disclosure |
| E6 | Los `scripts/` referenciados existen y el comando es correcto | Verificar rutas |

Recordar los tres niveles: frontmatter (siempre cargado) → cuerpo de `SKILL.md`
(cuando Claude cree que es relevante) → archivos enlazados (solo cuando navega).

---

## PHASE 5: Calidad de las instrucciones

Síntoma que ataca esta fase: *la skill carga pero Claude no sigue las
instrucciones*.

| ID | Causa común | Chequeo | Corrección |
|---|---|---|---|
| I1 | Instrucciones demasiado verbosas | ¿Párrafos largos donde iría una lista? | Bullets y listas numeradas; detalle a `references/` |
| I2 | Instrucciones enterradas | ¿Lo crítico está al principio? | Mover arriba; usar encabezados `## Important` / `## Critical` |
| I3 | Lenguaje ambiguo | ¿Dice "validar bien" en vez de qué validar? | Reemplazar por criterios verificables |
| I4 | Sin manejo de errores | ¿Hay sección de issues comunes con causa y solución? | Agregarla |
| I5 | Sin ejemplos | ¿Hay al menos un escenario end-to-end? | Agregar user says / actions / result |
| I6 | No accionable | ¿Los comandos son literales y copiables? | ``Correr `python scripts/validate.py --input {file}` `` |

Ejemplo del contraste que hay que buscar:

```
# Mal
Make sure to validate things properly

# Bien
CRITICAL: Before calling create_project, verify:
- Project name is non-empty
- At least one team member assigned
- Start date is not in the past
```

**Señal avanzada:** si una validación crítica depende de que el modelo
interprete texto, marcarlo como oportunidad — recomendar un script que la haga
programáticamente. El código es determinista; la interpretación del lenguaje no.

---

## PHASE 6: Generar la batería de tests de disparo

Derivar los casos de prueba de la `description` y de los ejemplos de la skill —
no inventar de la nada.

```
Debería disparar:
- "<frase literal de la description>"
- "<parafraseo natural de esa frase>"
- "<caso de uso descrito en los Examples de la skill>"

NO debería disparar:
- "<query del dominio vecino que la description excluye>"
- "<query genérica no relacionada>"
- "<query que otra skill del sistema debería tomar>"
```

Apuntar a 10–20 queries si el usuario quiere medir en serio: la meta de la guía
es que dispare en el **90% de las queries relevantes**. Se mide corriéndolas y
contando cuántas veces carga sola vs. requiere invocación explícita.

Si hay otras skills instaladas con alcance vecino, nombrarlas explícitamente en
el reporte como riesgo de colisión.

---

## PHASE 7: Reporte y cierre

### Formato del reporte

```markdown
## Evaluación: <nombre-skill>

**Veredicto:** <Lista para usar | Necesita ajustes | Rota>
**Riesgo de disparo:** <Sub-disparo | Sobre-disparo | OK>

### Bloqueantes (N)
| ID | Hallazgo | Corrección |
|---|---|---|

### Importantes (N)
| ID | Hallazgo | Corrección |
|---|---|---|

### Menores (N)
| ID | Hallazgo | Corrección |
|---|---|---|

### Tests de disparo sugeridos
Debería disparar: …
NO debería disparar: …

### Qué haría primero
1. <la corrección de mayor impacto>
2. …
```

Reglas del reporte:
- **Ordenar por severidad**, no por orden de aparición en el archivo.
- Cada hallazgo trae la corrección concreta, no solo el diagnóstico.
- Si no hay hallazgos en una categoría, decirlo en una línea — no inflar.
- No reportar como problema lo que la guía deja a criterio del autor.

### Handoff

Preguntar con `AskUserQuestion` (`header: "Correcciones"`):
- `"Aplicar los bloqueantes e importantes"` / `"Aplicar todo"` /
  `"Solo el reporte, no toques nada"`.

Si el usuario aprueba, aplicar las ediciones y mostrar qué cambió. Si no, parar.

Decir:
> "Evaluación lista. Corré las queries de disparo en una sesión limpia para
> verificar el comportamiento real — el reporte predice el disparo, no lo mide."

---

## CRITICAL: Output Language

El reporte en el idioma del usuario (para este workspace: español). Los IDs de
hallazgo (B1, D3, E2, I4), los nombres de campos del frontmatter, rutas y código
siempre en inglés.

Al proponer correcciones de una `description`, respetar el idioma en que está
escrita la skill y en el que el usuario realmente habla — los disparadores solo
sirven si coinciden con lo que el usuario tipea.

---

## Common Issues

| Issue | Causa | Resolución |
|---|---|---|
| No se encuentra la skill | Ruta mal escrita o skill en otro scope | Correr el `find` de PHASE 1 Step 1 sobre los tres scopes (proyecto, `~/.claude`, `~/.agents`) |
| `SKILL.md` es un symlink | Skills globales enlazadas desde `~/.claude/skills` | Resolver el destino real antes de editar: `readlink -f`; editar el original, no el link |
| La skill parece bien pero no dispara | Description técnicamente correcta pero sin lenguaje de usuario | Aplicar la técnica de debug de PHASE 3 y comparar con lo que el usuario realmente tipea |
| Dos skills evaluadas se pisan | Alcances solapados | Reportar la colisión y proponer disparadores negativos cruzados en ambas |
| Usuario pide "arreglala y ya" | Quiere saltear el reporte | Mostrar igual el resumen de bloqueantes antes de editar — es el único momento de decidir alcance |
| Skill enorme pero coherente | Progressive disclosure sin usar | No pedir recortar contenido: pedir **mover** a `references/` y enlazar |

---

## Example

**Input:** `/skill-evaluator ~/.claude/skills/report-builder`

**Flujo:**
1. PHASE 1: resuelve el symlink a `~/.agents/skills/report-builder`. Encuentra
   `SKILL.md` (6.200 palabras), `references/` (2 archivos), `README.md`.
2. PHASE 2: B10 falla → hay `README.md` dentro de la carpeta. B1–B9 OK.
3. PHASE 3: D2 y D6 fallan → `description: Genera reportes.` Sin frases
   disparadoras. Diagnóstico: **sub-disparo**.
4. PHASE 4: E2 falla (6.200 > 5.000 palabras). E3 falla → uno de los
   `references/` no está enlazado desde `SKILL.md`.
5. PHASE 5: I4 falla → sin sección de manejo de errores.
6. PHASE 6: genera 3 queries positivas y 3 negativas a partir de los Examples.
7. PHASE 7: reporte — 1 bloqueante, 3 importantes, 1 menor. Prioridad 1:
   reescribir la description con las frases del usuario.

**Salida:**
> "Evaluación lista: 1 bloqueante (`README.md` dentro de la carpeta), riesgo de
> **sub-disparo** por description genérica. Lo de mayor impacto es reescribir la
> description. ¿Aplico las correcciones?"
