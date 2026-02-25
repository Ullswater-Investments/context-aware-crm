

## Revision: Errores detectados y mejoras sugeridas

### ERRORES a corregir

#### 1. Edge function `enrich-lusha-contact` - Metodo de autenticacion inexistente (CRITICO)

La funcion usa `supabase.auth.getClaims(token)` (linea 37) que **no existe** en supabase-js v2. Esto hace que la funcion falle siempre con un error.

**Solucion**: Reemplazar por `supabase.auth.getUser()` siguiendo el patron ya usado en `send-email`.

#### 2. `Emails.tsx` - Query de conteo descarga TODAS las filas (BUG de rendimiento)

La query de conteo (linea 54-65) usa `{ head: false }` y descarga todas las filas para contarlas con `.length` en JavaScript. Esto:
- Descarga datos innecesarios
- Se rompe al superar 1000 emails (limite por defecto de la base de datos)

**Solucion**: Usar 3 queries ligeras con `{ count: "exact", head: true }` y filtro por status, en lugar de descargar filas.

#### 3. Firma de email con URL temporal de 1 hora (BUG funcional)

Las firmas se insertan en el HTML del email como URLs firmadas que expiran en 1 hora. Los destinatarios que abran el email despues no veran la firma.

**Solucion**: El bucket `email-signatures` ya es publico. Usar `getPublicUrl()` en lugar de `createSignedUrl()` para generar URLs permanentes.

### MEJORAS sugeridas

#### 4. Renombrar columna `resend_id` a `message_id`

Ahora que se usa SMTP en lugar de Resend, el nombre `resend_id` es confuso. Renombrar a `message_id` para claridad.

#### 5. Eliminar `as any` en actualizacion de contacto

En `ComposeEmail.tsx` linea 172, hay un cast `.update({ status: "contacted" } as any)`. Esto sugiere un problema de tipos que se debe resolver correctamente.

### Archivos a modificar

1. **`supabase/functions/enrich-lusha-contact/index.ts`** - Reemplazar `getClaims` por `getUser()`
2. **`src/pages/Emails.tsx`** - Optimizar query de conteo con `head: true`
3. **`src/components/email/ComposeEmail.tsx`** - Usar `getPublicUrl()` para firmas, eliminar `as any`
4. **Nueva migracion SQL** - Renombrar `resend_id` a `message_id` en `email_logs`
5. **`supabase/functions/send-email/index.ts`** - Actualizar referencia de `resend_id` a `message_id`

