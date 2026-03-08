

## Actualizar contactos Agentes Digitalizadores con emails del Excel

### Problema

El Excel tiene columnas `Email_1`, `Email_2`, `Email_3` por contacto. La tabla `contacts` tiene 3 campos de email: `email`, `work_email`, `personal_email`. Podemos mapear los 3 emails del Excel a estos 3 campos existentes sin necesidad de ampliar el esquema.

### Mapeo de emails

| Excel | Campo DB | Lógica |
|---|---|---|
| Email_1 | `work_email` + `email` (principal) | Email principal de trabajo |
| Email_2 | `personal_email` | Segundo email |
| Email_3 | `notes` (concatenado) | Tercer email almacenado en notas |

Alternativa: si prefieres no perder Email_3 en notas, añadir columna `additional_emails text` a la tabla. Recomiendo esta opción.

### Plan

#### 1. Migración: añadir campo `additional_emails`

```sql
ALTER TABLE contacts ADD COLUMN additional_emails text;
```

Un campo de texto para almacenar emails extra (separados por coma si hay varios).

#### 2. Actualizar `ContactImporter.tsx`

- Añadir mapeo para columnas `email_1`, `email_2`, `email_3` en `mapColumns`
- Email_1 → `work_email` + `email`
- Email_2 → `personal_email`  
- Email_3 → `additional_emails`
- En el upsert, actualizar estos campos incluso si ya hay datos (forzar actualización de emails desde el Excel)

#### 3. Actualizar `Contact` type y UI

- Añadir `additional_emails?: string | null` a `src/types/contact.ts`
- Mostrar `additional_emails` en `ContactProfile.tsx` si tiene valor

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| Migración SQL | Añadir columna `additional_emails` |
| `src/types/contact.ts` | Añadir campo `additional_emails` |
| `src/components/contacts/ContactImporter.tsx` | Mapeo Email_1/2/3, forzar update de emails |
| `src/components/contacts/ContactProfile.tsx` | Mostrar additional_emails |

### Resultado

El usuario importa el Excel, el sistema matchea por nombre de empresa, y actualiza los 3 emails en cada contacto existente. Los contactos que no existan se crean nuevos con todos los emails.

