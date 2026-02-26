

## Integrar Findymail como 4to servicio de enriquecimiento

### Resumen
Anadir Findymail como un nuevo proveedor de enriquecimiento de contactos, siguiendo exactamente el mismo patron que ya existe para Hunter.io, Apollo.io y Lusha. Incluye: secreto API, Edge Function, boton en el perfil de contacto, campo de estado en la base de datos, e integracion en el enriquecimiento masivo (bulk).

### 1. Guardar el API Key como secreto

Solicitar al usuario que introduzca su `FINDYMAIL_API_KEY` usando la herramienta de secretos. El token ya no estara expuesto en el codigo.

### 2. Migracion de base de datos

Anadir columna `findymail_status` a la tabla `contacts` con valor por defecto `'pending'`, igual que las otras tres columnas de estado:

```sql
ALTER TABLE contacts ADD COLUMN findymail_status text NOT NULL DEFAULT 'pending';
```

### 3. Edge Function: `supabase/functions/enrich-findymail-contact/index.ts`

Crear una nueva Edge Function siguiendo el patron de `enrich-hunter-contact`:

- Validar JWT con `getUser()`
- Verificar que el contacto pertenece al usuario autenticado
- Recibir `contact_id`, `full_name`, `domain` (y opcionalmente `linkedin_url`)
- Llamar a `POST https://api.findymail.com/v1/find_email` con `first_name`, `last_name`, `domain`
- Si encuentra email: actualizar `work_email` (si vacio), marcar `findymail_status = 'enriched'`
- Si no encuentra: marcar `findymail_status = 'not_found'`
- Actualizar `last_enriched_at`

Registrar en `supabase/config.toml`:
```toml
[functions.enrich-findymail-contact]
verify_jwt = false
```

### 4. Modificar `src/components/contacts/ContactProfile.tsx`

- Anadir estado `enrichingFindymail` (useState)
- Anadir funcion `enrichWithFindymail()` que invoque la Edge Function
- Anadir Badge de estado Findymail en el header (junto a los de Lusha, Hunter, Apollo)
- Anadir boton "Enriquecer con Findymail" debajo de los existentes, visible cuando `findymail_status` es `pending` o `not_found` y el contacto tiene `full_name` + `company_domain`

### 5. Modificar `src/types/contact.ts`

Anadir `findymail_status?: string | null` a la interfaz Contact.

### 6. Integrar en Bulk Enrich (`supabase/functions/bulk-enrich/index.ts`)

Anadir Findymail como 4to servicio en el flujo de enriquecimiento masivo:
- Incluir `findymail_status` en la query de seleccion
- Anadir logica `enrichWithFindymail()` similar a las existentes
- Permitir `"findymail"` en el array de servicios

### Archivos afectados

| Archivo | Accion |
|---|---|
| Migracion SQL | Anadir columna `findymail_status` |
| `supabase/config.toml` | Registrar nueva Edge Function |
| `supabase/functions/enrich-findymail-contact/index.ts` | Crear - llamada a API Findymail |
| `supabase/functions/bulk-enrich/index.ts` | Modificar - anadir Findymail como 4to servicio |
| `src/types/contact.ts` | Modificar - anadir campo `findymail_status` |
| `src/components/contacts/ContactProfile.tsx` | Modificar - boton + badge + logica |

### Flujo de usuario
1. Abre un contacto con nombre y dominio de empresa pero sin email
2. Pulsa "Enriquecer con Findymail"
3. La Edge Function llama a la API con nombre + dominio
4. Si encuentra email verificado, se rellena automaticamente en `work_email`
5. Toast de exito: "Email encontrado y verificado con Findymail!"

