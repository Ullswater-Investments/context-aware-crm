
## Mejoras en el Compositor de Email: Firma apagada por defecto + Generar Plantilla desde email

### 1. Firma apagada por defecto

**Archivo:** `src/components/email/ComposeEmail.tsx`

Cambiar el estado inicial de `includeSignature` de `true` a `false` (linea 83). Ademas, en `fetchSignatures`, eliminar la linea que fuerza `setIncludeSignature(true)` cuando hay firma por defecto (linea 101). El usuario debera activar manualmente el switch de firma si la quiere.

### 2. Boton "Guardar como plantilla" en el footer del compositor

**Archivo:** `src/components/email/ComposeEmail.tsx`

Anadir un boton "Guardar como plantilla" en el footer (lado derecho, antes del boton IA). Al pulsarlo:

1. Se abre un pequeno dialogo (`Dialog`) pidiendo:
   - Nombre de la plantilla (obligatorio)
   - Categoria (opcional, input de texto)
   - Entidad (opcional, select: GDC / NextGen / General)
2. El contenido HTML del body se procesa antes de guardar: se buscan ocurrencias del nombre completo del contacto destinatario (obtenido de la tabla `contacts` por email) y se reemplazan por `{{nombre}}`. Asi, cuando se reutilice la plantilla con otro contacto, el sistema sustituira `{{nombre}}` automaticamente.
3. El asunto actual se guarda como `subject` de la plantilla.
4. Se inserta en la tabla `email_templates` con `created_by = user.id`.
5. Se muestra toast de exito.

### 3. Sustitucion de variables mejorada al aplicar plantilla

**Archivo:** `src/components/email/ComposeEmail.tsx` (funcion `handleTemplateSelect`)

Actualmente solo sustituye `{{nombre}}` buscando por email. Mejorar para:
- Buscar el contacto tambien por `contactId` (prop) si esta disponible, no solo por email.
- Sustituir `{{nombre}}` por `full_name` del contacto encontrado.

### Resumen tecnico de cambios

| Archivo | Cambio |
|---|---|
| `src/components/email/ComposeEmail.tsx` | `includeSignature` default `false`, eliminar auto-activacion en `fetchSignatures` |
| `src/components/email/ComposeEmail.tsx` | Nuevo boton "Guardar como plantilla" + Dialog con formulario nombre/categoria/entidad |
| `src/components/email/ComposeEmail.tsx` | Logica de sustitucion inversa: reemplazar nombre del contacto por `{{nombre}}` al guardar |
| `src/components/email/ComposeEmail.tsx` | Mejorar `handleTemplateSelect` para buscar contacto por `contactId` ademas de por email |

No se requieren cambios en base de datos (la tabla `email_templates` ya existe con las columnas necesarias) ni en edge functions.
