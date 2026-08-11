# Template: Technical Context Section

Sección `## Technical Context` de `spec.md`. Lleva **exclusivamente lo que el
desarrollador declaró** en R5 — lo que no está escrito en ningún archivo ni es
deducible del código.

Todo lo relevado del repositorio (módulo, entidades, providers, DTOs, puertos, gaps)
va a **`context.md`**, no acá. Desde que `/clarify` produce los dos artefactos en la
misma pasada, no hay razón para duplicar el inventario en `spec.md`.

**Si el desarrollador no declaró nada, omitir la sección entera.** Una sección vacía
o rellenada con inferencias es peor que su ausencia: invita a `/design` a tratar una
suposición como un requisito.

---

```markdown
## Technical Context

### Restricciones técnicas
- <lo que NO debe hacerse o limitación conocida>
[Un bullet por restricción]

### Deuda técnica relevante
- <módulo o área + descripción del problema conocido>
[Un bullet por ítem de deuda]

### Integraciones planeadas
- <protocolo + destino + endpoint/topic que todavía NO existe en el código>
  Ejemplo: HTTP GET a capabilities-ms: `/zones/{id}` (aún no implementado)
[Un bullet por integración; omitir si todas ya están en el código — esas las
 releva context.md]
```

---

## Qué va acá y qué no

| Información | Dónde vive | Por qué |
|---|---|---|
| «No toques la tabla `X` directamente» | **Aquí** | Solo el desarrollador lo sabe |
| «El módulo `Y` tiene un bug conocido con Z» | **Aquí** | No está escrito en ningún lado |
| «Vamos a integrar con `capabilities-ms`, todavía no existe» | **Aquí** | No hay código que relevar |
| Módulo afectado, entidades, campos | `context.md` | Se releva del código |
| Artefactos a reutilizar, firmas de puertos | `context.md` | Se releva del código |
| Patrones obligatorios del proyecto | `docs/rules.md` | Es transversal, no por ítem |
| Gaps de documentación | `context.md` | Salen del relevamiento |

## Reglas

- **Nunca inferir contenido para esta sección.** Si el desarrollador respondió `-` en
  R5, la sección no existe. No hay marca `(inferido)` porque no hay nada inferido acá.
- **Nunca se pisa al re-ejecutar.** Lo declarado es fuente de verdad: una corrida
  posterior de `/clarify` puede agregar ítems, nunca reemplazar ni degradar los
  existentes.
- Omitir cualquier subsección sin contenido.

## Language rules

- Encabezados de sección: español
- Nombres de componentes, clases, rutas, identificadores, endpoints: inglés
- Texto descriptivo de los bullets: español
