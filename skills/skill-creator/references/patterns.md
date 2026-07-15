# Patrones de skills

Estos patrones surgieron de skills creadas por early adopters y equipos internos
de Anthropic. Son enfoques que funcionaron bien, **no plantillas prescriptivas**.

---

## Elegir el framing: problem-first vs tool-first

Analogía de Home Depot: podés entrar con un problema ("necesito arreglar un
mueble de cocina") y que un empleado te apunte a las herramientas correctas; o
podés elegir un taladro nuevo y preguntar cómo usarlo para tu trabajo.

- **Problem-first:** "necesito armar un workspace de proyecto" → la skill
  orquesta las llamadas MCP correctas en la secuencia correcta. El usuario
  describe resultados; la skill maneja las herramientas.
- **Tool-first:** "tengo Notion MCP conectado" → la skill le enseña a Claude los
  workflows y buenas prácticas óptimas. El usuario ya tiene el acceso; la skill
  aporta el expertise.

La mayoría de las skills se inclinan hacia un lado. Saber cuál encaja ayuda a
elegir el patrón.

---

## Patrón 1: Orquestación secuencial de workflow

**Usar cuando:** el usuario necesita procesos multi-paso en un orden específico.

```markdown
## Workflow: Onboard New Customer

### Step 1: Create Account
Call MCP tool: `create_customer`
Parameters: name, email, company

### Step 2: Setup Payment
Call MCP tool: `setup_payment_method`
Wait for: payment method verification

### Step 3: Create Subscription
Call MCP tool: `create_subscription`
Parameters: plan_id, customer_id (del Step 1)

### Step 4: Send Welcome Email
Call MCP tool: `send_email`
Template: welcome_email_template
```

**Técnicas clave:**
- Orden explícito de pasos
- Dependencias entre pasos
- Validación en cada etapa
- Instrucciones de rollback ante fallas

---

## Patrón 2: Coordinación multi-MCP

**Usar cuando:** el workflow abarca varios servicios.

Ejemplo — handoff de diseño a desarrollo:

```markdown
### Phase 1: Design Export (Figma MCP)
1. Exportar assets de diseño desde Figma
2. Generar especificaciones de diseño
3. Crear manifiesto de assets

### Phase 2: Asset Storage (Drive MCP)
1. Crear carpeta del proyecto en Drive
2. Subir todos los assets
3. Generar links compartibles

### Phase 3: Task Creation (Linear MCP)
1. Crear tareas de desarrollo
2. Adjuntar links de assets a las tareas
3. Asignar al equipo de ingeniería

### Phase 4: Notification (Slack MCP)
1. Postear resumen del handoff en #engineering
2. Incluir links de assets y referencias de tareas
```

**Técnicas clave:**
- Separación clara de fases
- Paso de datos entre MCPs
- Validación antes de avanzar de fase
- Manejo de errores centralizado

---

## Patrón 3: Refinamiento iterativo

**Usar cuando:** la calidad del output mejora iterando.

Ejemplo — generación de reportes:

```markdown
## Iterative Report Creation

### Initial Draft
1. Traer datos vía MCP
2. Generar primer borrador del reporte
3. Guardar en archivo temporal

### Quality Check
1. Correr script de validación: `scripts/check_report.py`
2. Identificar problemas:
   - Secciones faltantes
   - Formato inconsistente
   - Errores de validación de datos

### Refinement Loop
1. Resolver cada problema identificado
2. Regenerar las secciones afectadas
3. Re-validar
4. Repetir hasta alcanzar el umbral de calidad

### Finalization
1. Aplicar formato final
2. Generar resumen
3. Guardar versión final
```

**Técnicas clave:**
- Criterios de calidad explícitos
- Mejora iterativa
- Scripts de validación
- **Saber cuándo parar de iterar**

---

## Patrón 4: Selección contextual de herramienta

**Usar cuando:** mismo resultado, distintas herramientas según el contexto.

Ejemplo — almacenamiento de archivos:

```markdown
## Smart File Storage

### Decision Tree
1. Chequear tipo y tamaño del archivo
2. Determinar la mejor ubicación:
   - Archivos grandes (>10MB): usar MCP de cloud storage
   - Documentos colaborativos: usar MCP de Notion/Docs
   - Archivos de código: usar MCP de GitHub
   - Archivos temporales: usar almacenamiento local

### Execute Storage
Según la decisión:
- Llamar a la herramienta MCP apropiada
- Aplicar metadata específica del servicio
- Generar link de acceso

### Provide Context to User
Explicar por qué se eligió ese almacenamiento
```

**Técnicas clave:**
- Criterios de decisión claros
- Opciones de fallback
- Transparencia sobre las decisiones tomadas

---

## Patrón 5: Inteligencia de dominio

**Usar cuando:** la skill aporta conocimiento especializado más allá del acceso
a herramientas.

Ejemplo — compliance financiero:

```markdown
## Payment Processing with Compliance

### Before Processing (Compliance Check)
1. Traer detalles de la transacción vía MCP
2. Aplicar reglas de compliance:
   - Chequear listas de sanciones
   - Verificar permisos por jurisdicción
   - Evaluar nivel de riesgo
3. Documentar la decisión de compliance

### Processing
IF compliance passed:
  - Llamar a la herramienta MCP de procesamiento de pagos
  - Aplicar los chequeos de fraude correspondientes
  - Procesar la transacción
ELSE:
  - Marcar para revisión
  - Crear caso de compliance

### Audit Trail
- Loggear todos los chequeos de compliance
- Registrar las decisiones de procesamiento
- Generar reporte de auditoría
```

**Técnicas clave:**
- Expertise de dominio embebido en la lógica
- Compliance antes de la acción
- Documentación exhaustiva
- Gobernanza clara

---

## Categorías de casos de uso

### Categoría 1: Creación de documentos y assets

**Para:** output consistente y de alta calidad — documentos, presentaciones,
apps, diseños, código.

Ejemplo real: skill `frontend-design` (también las de docx, pptx, xlsx).

**Técnicas clave:**
- Style guides y estándares de marca embebidos
- Estructuras de plantilla para output consistente
- Checklists de calidad antes de finalizar
- Sin herramientas externas — usa capacidades built-in de Claude

### Categoría 2: Automatización de workflow

**Para:** procesos multi-paso que se benefician de metodología consistente,
incluyendo coordinación entre varios servidores MCP.

Ejemplo real: la propia skill `skill-creator`.

**Técnicas clave:**
- Workflow paso a paso con validation gates
- Plantillas para estructuras comunes
- Revisión y sugerencias de mejora incorporadas
- Loops de refinamiento iterativo

### Categoría 3: Enhancement de MCP

**Para:** guía de workflow que potencia el acceso a herramientas que da un
servidor MCP.

Ejemplo real: skill `sentry-code-review` (de Sentry).

**Técnicas clave:**
- Coordina múltiples llamadas MCP en secuencia
- Embebe expertise de dominio
- Aporta contexto que el usuario tendría que especificar
- Manejo de errores para problemas comunes del MCP

---

## MCP y skills: la analogía de la cocina

- **MCP provee la cocina profesional:** acceso a herramientas, ingredientes y equipamiento. Es *qué puede hacer* Claude.
- **Las skills proveen las recetas:** instrucciones paso a paso para crear algo valioso. Es *cómo debería hacerlo* Claude.

| MCP (conectividad) | Skills (conocimiento) |
|---|---|
| Conecta Claude a tu servicio (Notion, Asana, Linear) | Le enseña a Claude a usar tu servicio efectivamente |
| Da acceso a datos en tiempo real e invocación de herramientas | Captura workflows y buenas prácticas |
| Qué puede hacer Claude | Cómo debería hacerlo Claude |
