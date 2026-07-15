# Plantilla de SKILL.md

Adaptar esta plantilla a la skill concreta. Reemplazar las secciones entre
corchetes con el contenido específico. Las secciones opcionales están marcadas.

---

## Plantilla base

```markdown
---
name: your-skill
description: [qué hace] + [cuándo usarla, con frases literales del usuario] +
  [capacidades clave]. Do NOT use to [alcance vecino excluido].
---

# Nombre de la Skill

## Overview

[Una o dos oraciones: qué resuelve la skill y para quién.]

**Announce at start:** "[Frase corta que Claude dice al arrancar.]"

**Output:** [qué produce concretamente — archivo, PR, reporte, etc.]

**Core principle:** [la regla que gobierna las decisiones dentro de la skill.]

---

## Instructions

### Step 1: [Primer paso mayor]

Explicación clara de qué pasa.

Ejemplo:
```bash
python scripts/fetch_data.py --project-id PROJECT_ID
```
Expected output: [describir cómo se ve el éxito]

### Step 2: [Segundo paso mayor]

[Agregar los pasos que hagan falta.]

---

## Examples

### Example 1: [escenario común]

User says: "Set up a new marketing campaign"

Actions:
1. Traer campañas existentes vía MCP
2. Crear campaña nueva con los parámetros dados

Result: Campaña creada con link de confirmación

[Agregar más ejemplos según haga falta.]

---

## Troubleshooting

### Error: [mensaje de error común]

Cause: [por qué pasa]
Solution: [cómo se arregla]

[Agregar más casos de error.]
```

---

## Secciones opcionales de alto valor

### `## Important` / `## Critical` (recomendada)

Va **arriba**, justo después del Overview. Las instrucciones críticas enterradas
en el medio no se siguen.

```markdown
## Critical

CRITICAL: antes de llamar a `create_project`, verificar:
- El nombre del proyecto no está vacío
- Hay al menos un miembro asignado
- La fecha de inicio no está en el pasado
```

### `## Common Issues` (recomendada)

Tabla de issue / causa / resolución. Más densa que el bloque Troubleshooting y
más fácil de escanear:

```markdown
| Issue | Causa | Resolución |
|---|---|---|
| Falla la conexión al MCP | Servidor no conectado | Settings > Extensions > [Servicio] > Reconnect |
```

### Referencia a recursos empaquetados

Enlazar explícitamente — que el archivo exista no basta:

```markdown
Antes de escribir queries, consultar `references/api-patterns.md` para:
- Guía de rate limiting
- Patrones de paginación
- Códigos de error y manejo
```

### `## Performance Notes` (usar con criterio)

Contra la "pereza" del modelo en tareas largas:

```markdown
## Performance Notes
- Tomate el tiempo necesario para hacerlo a fondo
- La calidad importa más que la velocidad
- No saltear los pasos de validación
```

> Nota de la guía: esto es **más efectivo en el prompt del usuario que en
> SKILL.md**. Incluirlo solo si la tarea es larga y hay evidencia de que se
> saltean pasos.

---

## Manejo de errores — plantilla

```markdown
## Common Issues

### MCP Connection Failed

Si aparece "Connection refused":
1. Verificar que el servidor MCP está corriendo: Settings > Extensions
2. Confirmar que la API key es válida
3. Reconectar: Settings > Extensions > [Servicio] > Reconnect
```

---

## Reglas de redacción

| Regla | Bien | Mal |
|---|---|---|
| Específica y accionable | ``Correr `python scripts/validate.py --input {filename}` para chequear el formato. Si falla, los problemas típicos son: campos requeridos faltantes (agregarlos al CSV), formatos de fecha inválidos (usar YYYY-MM-DD)`` | "Validar los datos antes de proceder" |
| Sin ambigüedad | "CRITICAL: verificar que el nombre no esté vacío" | "Asegurate de validar bien las cosas" |
| Concisa | Bullets y listas numeradas | Párrafos largos |
| Progressive disclosure | Core en `SKILL.md`, detalle en `references/` | Todo inline |

---

## Límites

- `SKILL.md` bajo **5.000 palabras**. Si se pasa, mover contenido a `references/`.
- `description` bajo **1024 caracteres**.
- Sin `README.md` dentro de la carpeta de la skill. (Sí conviene un README a
  nivel repo para humanos, si se distribuye por GitHub — pero fuera de la
  carpeta de la skill.)
