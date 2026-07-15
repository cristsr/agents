# Rúbrica de evaluación de skills

Rúbrica completa con severidades. Los IDs se usan en el reporte de
`skill-evaluator`.

---

## Escala de severidad

| Severidad | Significado | Criterio |
|---|---|---|
| **BLOQUEANTE** | La skill no instala, no carga o está mal formada | Viola una regla dura de la guía |
| **IMPORTANTE** | La skill funciona pero dispara mal o no se sigue | Cambia el comportamiento real |
| **MENOR** | Pulido, mantenibilidad, consistencia | No cambia el comportamiento |

Regla de priorización: **primero lo que impide cargar, después lo que impide
disparar, al final la redacción.** Una skill con instrucciones brillantes y una
`description` vaga nunca se ejecuta; el orden inverso al menos funciona cuando
se la invoca a mano.

---

## Grupo B — Reglas duras (BLOQUEANTE)

| ID | Regla | Falla típica | Corrección |
|---|---|---|---|
| B1 | Archivo llamado exactamente `SKILL.md` | `SKILL.MD`, `skill.md`, `Skill.md` | Renombrar. Verificar con `ls -la` |
| B2 | Frontmatter con `---` de apertura y cierre | Faltan delimitadores | Agregarlos |
| B3 | YAML válido | Comilla sin cerrar, indentación rota | Corregir el YAML |
| B4 | `name` en kebab-case | `My Cool Skill`, `my_cool_skill`, `MyCoolSkill` | `my-cool-skill` |
| B5 | `name` coincide con la carpeta | Carpeta `report-builder`, `name: reports` | Alinear ambos |
| B6 | `name` sin "claude"/"anthropic" | `claude-helper` | Renombrar — son reservados |
| B7 | `description` presente | Campo ausente | Escribirla (grupo D) |
| B8 | `description` < 1024 caracteres | Description larguísima | Recortar al núcleo qué+cuándo |
| B9 | Sin `<` ni `>` en el frontmatter | Ejemplo con tags XML en la description | Quitarlos — el frontmatter va al system prompt y es superficie de inyección |
| B10 | Sin `README.md` en la carpeta de la skill | README arrastrado del repo | Borrarlo o moverlo fuera. La doc va en `SKILL.md` o `references/`. Un README a nivel repo (fuera de la carpeta) sí es correcto para humanos |

---

## Grupo D — Description (IMPORTANTE)

| ID | Chequeo | Falla típica | Corrección |
|---|---|---|---|
| D1 | Dice **qué hace** | Solo condiciones de uso | Agregar la capacidad concreta |
| D2 | Dice **cuándo usarla** con frases de usuario | Sin disparadores | Agregar frases literales que el usuario diría |
| D3 | Las frases son las que el usuario **realmente** tipea | Jerga interna | Reemplazar por lenguaje de usuario |
| D4 | Menciona tipos de archivo relevantes | Maneja `.csv` y no lo dice | Nombrarlos |
| D5 | Disparadores negativos si hay skills vecinas | Alcance solapado | `Do NOT use to… (use X skill instead)` |
| D6 | No es genérica | "Ayuda con proyectos" | Reescribir con la fórmula qué + cuándo + capacidades |

### Fórmula

`[qué hace] + [cuándo usarla] + [capacidades clave]`

### Contraste

```yaml
# Bien — específica y accionable
description: Analiza archivos de diseño de Figma y genera documentación de
  handoff. Use when user uploads .fig files, asks for "design specs",
  "component documentation", or "design-to-code handoff".

# Mal — vaga
description: Ayuda con proyectos.

# Mal — sin disparadores
description: Crea sistemas de documentación multi-página sofisticados.

# Mal — técnica, sin lenguaje de usuario
description: Implementa el modelo de entidad Project con relaciones jerárquicas.
```

---

## Diagnóstico de disparo

### Sub-disparo

**Señales:**
- La skill no carga cuando debería.
- El usuario la habilita manualmente.
- Preguntas de soporte sobre cuándo usarla.

**Corrección:** agregar detalle y matices a la `description` — sobre todo
keywords, en particular términos técnicos.

### Sobre-disparo

**Señales:**
- La skill carga en queries irrelevantes.
- El usuario la desactiva.
- Confusión sobre el propósito.

**Correcciones, en orden:**

1. Agregar disparadores negativos:
```yaml
description: Análisis avanzado de datos para archivos CSV. Use for statistical
  modeling, regression, clustering. Do NOT use for simple data exploration
  (use data-viz skill instead).
```

2. Ser más específico:
```yaml
# Demasiado amplia
description: Procesa documentos.
# Más específica
description: Procesa documentos legales en PDF para revisión de contratos.
```

3. Aclarar el alcance:
```yaml
description: PayFlow payment processing for e-commerce. Use specifically for
  online payment workflows, not for general financial queries.
```

### Técnica de debug

Preguntarle a Claude: "¿Cuándo usarías la skill `<nombre>`?". Va a citar la
`description` de vuelta. Ajustar según lo que falte en esa respuesta.

---

## Grupo E — Estructura (IMPORTANTE / MENOR)

| ID | Chequeo | Severidad | Corrección |
|---|---|---|---|
| E1 | Carpeta en kebab-case | IMPORTANTE | Renombrar |
| E2 | `SKILL.md` < 5.000 palabras | IMPORTANTE | Mover detalle a `references/` y enlazar |
| E3 | `references/` enlazados desde `SKILL.md` | IMPORTANTE | Agregar el enlace explícito — sin enlace, nunca se carga |
| E4 | Sin carpetas vacías | MENOR | Borrar el andamiaje sin contenido |
| E5 | Detalle pesado en `references/`, no inline | MENOR | Aplicar progressive disclosure |
| E6 | Los `scripts/` referenciados existen | IMPORTANTE | Corregir rutas o agregar el script |

### Estructura esperada

```
<skill-name>/
├── SKILL.md          # Requerido
├── scripts/          # Opcional — código ejecutable
├── references/       # Opcional — doc cargada bajo demanda
└── assets/           # Opcional — plantillas, fuentes, íconos
```

### Los tres niveles

| Nivel | Qué | Cuándo se carga |
|---|---|---|
| 1 | Frontmatter | Siempre, en el system prompt |
| 2 | Cuerpo de `SKILL.md` | Cuando Claude cree que es relevante |
| 3 | Archivos enlazados | Solo cuando Claude los navega |

### Síntoma de contexto grande

Si la skill se siente lenta o las respuestas se degradan:
- Contenido de la skill demasiado grande → mover a `references/`.
- Demasiadas skills habilitadas a la vez → evaluar si hay más de 20–50 activas;
  recomendar habilitación selectiva o "packs" de skills relacionadas.
- Todo cargado en vez de progressive disclosure → enlazar en vez de inline.

---

## Grupo I — Instrucciones (IMPORTANTE / MENOR)

Síntoma: la skill carga pero Claude no sigue las instrucciones.

| ID | Causa | Severidad | Corrección |
|---|---|---|---|
| I1 | Instrucciones demasiado verbosas | IMPORTANTE | Bullets y listas numeradas; detalle a archivos aparte |
| I2 | Instrucciones críticas enterradas | IMPORTANTE | Ponerlas arriba; usar `## Important` / `## Critical`; repetir lo clave si hace falta |
| I3 | Lenguaje ambiguo | IMPORTANTE | Criterios verificables |
| I4 | Sin manejo de errores | IMPORTANTE | Agregar sección de issues comunes |
| I5 | Sin ejemplos | MENOR | Agregar user says / actions / result |
| I6 | No accionable | IMPORTANTE | Comandos literales y copiables |

### Contraste de ambigüedad

```
# Mal
Make sure to validate things properly

# Bien
CRITICAL: Before calling create_project, verify:
- Project name is non-empty
- At least one team member assigned
- Start date is not in the past
```

### Contraste de accionabilidad

```
# Mal
Validate the data before proceeding.

# Bien
Run `python scripts/validate.py --input {filename}` to check data format.
If validation fails, common issues include:
- Missing required fields (add them to the CSV)
- Invalid date formats (use YYYY-MM-DD)
```

### Oportunidad: validación por script

Si una validación crítica depende de que el modelo interprete texto, marcarlo
como oportunidad de mejora: bundlear un script que la haga programáticamente.
El código es determinista; la interpretación del lenguaje no.

### Nota sobre "pereza" del modelo

Si la skill tiene un bloque tipo:
```
## Performance Notes
- Take your time to do this thoroughly
- Quality is more important than speed
- Do not skip validation steps
```
No es un error, pero vale señalar que **es más efectivo en el prompt del usuario
que dentro de `SKILL.md`**.

---

## Criterios de éxito (para recomendar medición)

Son objetivos aspiracionales — benchmarks aproximados, no umbrales precisos.
Hay un componente de evaluación por criterio propio.

### Cuantitativos

| Métrica | Cómo se mide |
|---|---|
| Dispara en el 90% de queries relevantes | Correr 10–20 queries de prueba; contar cargas automáticas vs. invocación explícita |
| Completa el workflow en X llamadas | Comparar la misma tarea con y sin la skill; contar llamadas y tokens |
| 0 llamadas fallidas por workflow | Monitorear logs del MCP; trackear reintentos y códigos de error |

### Cualitativos

| Métrica | Cómo se evalúa |
|---|---|
| El usuario no necesita indicar próximos pasos | Anotar cuántas veces hay que redirigir o aclarar |
| El workflow completa sin corrección | Correr el mismo pedido 3–5 veces; comparar consistencia estructural y de calidad |
| Resultados consistentes entre sesiones | ¿Un usuario nuevo logra la tarea al primer intento con guía mínima? |

### Comparación contra baseline

```
Sin skill:
- El usuario da instrucciones cada vez
- 15 mensajes de ida y vuelta
- 3 llamadas fallidas con reintento
- 12.000 tokens consumidos

Con skill:
- Ejecución automática del workflow
- 2 preguntas aclaratorias solamente
- 0 llamadas fallidas
- 6.000 tokens consumidos
```

---

## Checklist rápida

### Durante el desarrollo
- [ ] Carpeta en kebab-case
- [ ] `SKILL.md` existe (spelling exacto)
- [ ] Frontmatter con delimitadores `---`
- [ ] `name`: kebab-case, sin espacios, sin mayúsculas
- [ ] `description` incluye QUÉ y CUÁNDO
- [ ] Sin tags XML (`<` `>`) en ninguna parte
- [ ] Instrucciones claras y accionables
- [ ] Manejo de errores incluido
- [ ] Ejemplos provistos
- [ ] References claramente enlazados

### Antes de subir
- [ ] Probado el disparo en tareas obvias
- [ ] Probado el disparo con pedidos parafraseados
- [ ] Verificado que NO dispara en temas no relacionados
- [ ] Tests funcionales pasan
- [ ] La integración con herramientas funciona (si aplica)

### Después de subir
- [ ] Probar en conversaciones reales
- [ ] Monitorear sub/sobre-disparo
- [ ] Recolectar feedback
- [ ] Iterar sobre description e instrucciones
- [ ] Actualizar la versión en `metadata`
