# context: sm-<number>

## Historia resumida

**Como** <rol>
**Quiero** <acción>
**Para** <beneficio>

## Componentes afectados

- <component-1>
- <component-2>  ← si aplica

---

## <component-1>

### Módulo afectado
`<absolute-path-to-module>/`

### Entidad / modelo de persistencia
**Archivo:** `<absolute-path>` (según `ORM` del profile)
**Campos:**
- `<field_name>`: `<type>` — <constraint si relevante>
- `<field_name>`: `<type>`

### Registro del módulo (providers)
**Archivo:** `<absolute-path>` (según el framework)
**Registrados:**
- `<ProviderName>`
- `<ProviderName>`

### Patrón de inyección (caso de uso de referencia)
**Archivo:** `<absolute-path>`
**Constructor / init:**
```<language>
<dependencias inyectadas, nombre y tipo>
```

### DTOs existentes
**Barrel:** `<absolute-path>/dtos/index`
**Exportados:**
- `<DtoClassName>`
- `<DtoClassName>`

### Puerto / servicio abstracto
**Archivo:** `<absolute-path>`
**Métodos:**
- `<methodName>(<params>): <returnType>`

### Documentación disponible
<path a docs si existe, o "Sin documentación para <component-1>">

---

## <component-2>  ← repetir sección si hay más de uno

<misma estructura>

---

## Gaps detectados

<lista de cosas no encontradas que /design o /plan deberían tener en cuenta>
<o "Ninguno" si todo fue encontrado>
