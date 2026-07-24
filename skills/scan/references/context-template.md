# context: sm-<number>

## Historia resumida

**Como** <rol>
**Quiero** <acción>
**Para** <beneficio>

## Microservicios afectados

- <microservice-1>
- <microservice-2>  ← si aplica

---

## <microservice-1>

### Módulo afectado
`<absolute-path-to-module>/`

### Entidad TypeORM
**Archivo:** `<absolute-path>.entity.ts`
**Campos:**
- `<field_name>`: `<type>` — <column constraint si relevante>
- `<field_name>`: `<type>`

### Module providers
**Archivo:** `<absolute-path>.module.ts`
**Providers registrados:**
- `<ProviderName>`
- `<ProviderName>`

### Patrón de inyección (use case de referencia)
**Archivo:** `<absolute-path>.use-case.ts`
**Constructor:**
```typescript
constructor(
  private readonly <dependency>: <Type>,
  private readonly <dependency>: <Type>,
) {}
```

### DTOs existentes
**Barrel:** `<absolute-path>/dtos/index.ts`
**Exportados:**
- `<DtoClassName>`
- `<DtoClassName>`

### Servicio abstracto
**Archivo:** `<absolute-path>.service.ts`
**Métodos:**
- `<methodName>(<params>): <returnType>`

### Documentación disponible
<path a docs si existe, o "Sin documentación en docs/services/<microservice>/">

---

## <microservice-2>  ← repetir sección si hay más de uno

<misma estructura>

---

## Gaps detectados

<lista de cosas no encontradas que /design o /plan deberían tener en cuenta>
<o "Ninguno" si todo fue encontrado>
