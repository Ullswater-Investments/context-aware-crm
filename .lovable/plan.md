

## Fix: Error "violates check constraint email_templates_entity_check"

### Problema

El error en la esquina inferior derecha dice que la base de datos rechaza el valor de "entidad" porque no coincide con los valores permitidos. La tabla `email_templates` tiene una restriccion (CHECK constraint) que solo acepta estos valores exactos: `'GDC'`, `'NextGen'`, `'General'`.

Sin embargo, el codigo envia los valores en minusculas: `'gdc'`, `'nextgen'`, `'general'`. La base de datos es sensible a mayusculas/minusculas, asi que `'gdc'` no es igual a `'GDC'` y el guardado falla.

### Solucion

Corregir los valores de los `SelectItem` en dos archivos para que coincidan exactamente con los valores que acepta la base de datos:

| Valor actual (incorrecto) | Valor correcto |
|---|---|
| `"gdc"` | `"GDC"` |
| `"nextgen"` | `"NextGen"` |
| `"general"` | `"General"` |

### Archivos a modificar

**1. `src/components/email/ComposeEmail.tsx` (lineas 711-714)**

Cambiar:
```tsx
<SelectItem value="general">General</SelectItem>
<SelectItem value="gdc">GDC</SelectItem>
<SelectItem value="nextgen">NextGen</SelectItem>
```
Por:
```tsx
<SelectItem value="General">General</SelectItem>
<SelectItem value="GDC">GDC</SelectItem>
<SelectItem value="NextGen">NextGen</SelectItem>
```

**2. `src/components/email/TemplateManager.tsx` (lineas dentro del Select de entidad)**

Aplicar el mismo cambio de valores para mantener consistencia entre ambos componentes.

### Impacto

- No se requieren cambios en la base de datos
- Es un cambio minimo y sin riesgo
- Resuelve completamente el error mostrado en la captura

