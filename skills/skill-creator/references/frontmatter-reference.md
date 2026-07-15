# Referencia de frontmatter YAML

El frontmatter es el **nivel 1 de progressive disclosure**: siempre está cargado
en el system prompt de Claude. Es lo que decide si la skill se activa.

---

## Formato mínimo requerido

```yaml
---
name: your-skill-name
description: Qué hace. Use when user asks to [frases específicas].
---
```

Con eso alcanza para arrancar.

---

## Campos

### `name` (requerido)

- Solo kebab-case.
- Sin espacios ni mayúsculas.
- Debe coincidir con el nombre de la carpeta.
- **No puede contener "claude" ni "anthropic"** (reservados).

```yaml
# Mal
name: My Cool Skill
name: my_cool_skill
name: MyCoolSkill
name: claude-helper

# Bien
name: my-cool-skill
```

### `description` (requerido)

- **DEBE incluir las dos cosas:**
  - Qué hace la skill.
  - Cuándo usarla (condiciones de disparo).
- Menos de 1024 caracteres.
- Sin corchetes angulares XML (`<` o `>`).
- Incluir tareas específicas que el usuario podría decir.
- Mencionar tipos de archivo si son relevantes.

Estructura: `[qué hace] + [cuándo usarla] + [capacidades clave]`

### `license` (opcional)

- Usar si la skill es open source.
- Comunes: `MIT`, `Apache-2.0`.

### `compatibility` (opcional)

- 1–500 caracteres.
- Indica requisitos del entorno: producto previsto, paquetes de sistema
  requeridos, necesidad de acceso a red, etc.

### `allowed-tools` (opcional)

Restringe el acceso a herramientas:

```yaml
allowed-tools: "Bash(python:*) Bash(npm:*) WebFetch"
```

### `metadata` (opcional)

Cualquier par clave-valor. Sugeridos: `author`, `version`, `mcp-server`.

```yaml
metadata:
  author: Company Name
  version: 1.0.0
  mcp-server: server-name
  category: productivity
  tags: [project-management, automation]
  documentation: https://example.com/docs
  support: support@example.com
```

---

## Ejemplo con todos los campos opcionales

```yaml
---
name: skill-name
description: [descripción requerida]
license: MIT
allowed-tools: "Bash(python:*) Bash(npm:*) WebFetch"
metadata:
  author: Company Name
  version: 1.0.0
  mcp-server: server-name
  category: productivity
  tags: [project-management, automation]
---
```

---

## Notas de seguridad

**Permitido:**
- Cualquier tipo estándar de YAML (strings, números, booleanos, listas, objetos).
- Campos de metadata custom.
- Descripciones largas (hasta 1024 caracteres).

**Prohibido:**
- Corchetes angulares XML (`<` `>`) — restricción de seguridad.
- Ejecución de código en YAML (se usa parseo seguro).
- Skills con "claude" o "anthropic" en el nombre (reservados).

**Por qué:** el frontmatter aparece en el system prompt de Claude. Contenido
malicioso podría inyectar instrucciones.

---

## Errores de YAML frecuentes

```yaml
# Mal — faltan los delimitadores
name: my-skill
description: Does things

# Mal — comilla sin cerrar
---
name: my-skill
description: "Does things
---

# Bien
---
name: my-skill
description: Does things
---
```

---

## Ejemplos de descripciones

### Buenas

```yaml
# Específica y accionable
description: Analiza archivos de diseño de Figma y genera documentación de
  handoff para desarrollo. Use when user uploads .fig files, asks for "design
  specs", "component documentation", or "design-to-code handoff".

# Con frases disparadoras
description: Gestiona workflows de proyectos en Linear incluyendo planificación
  de sprint, creación de tareas y seguimiento de estado. Use when user mentions
  "sprint", "Linear tasks", "project planning", or asks to "create tickets".

# Con propuesta de valor clara
description: Workflow end-to-end de onboarding de clientes para PayFlow. Maneja
  creación de cuenta, setup de pago y gestión de suscripción. Use when user says
  "onboard new customer", "set up subscription", or "create PayFlow account".
```

### Malas

```yaml
# Demasiado vaga
description: Ayuda con proyectos.

# Sin disparadores
description: Crea sistemas de documentación multi-página sofisticados.

# Demasiado técnica, sin lenguaje de usuario
description: Implementa el modelo de entidad Project con relaciones jerárquicas.
```

---

## Disparadores negativos

Cuando una skill dispara de más, agregar exclusiones explícitas:

```yaml
# Excluir un dominio vecino
description: Análisis avanzado de datos para archivos CSV. Use for statistical
  modeling, regression, clustering. Do NOT use for simple data exploration
  (use data-viz skill instead).

# Acotar el alcance
description: PayFlow payment processing for e-commerce. Use specifically for
  online payment workflows, not for general financial queries.
```

Y cuando es demasiado amplia, hacerla más específica:

```yaml
# Demasiado amplia
description: Procesa documentos.

# Más específica
description: Procesa documentos legales en PDF para revisión de contratos.
```
