

## Revision: Fallos detectados y mejoras propuestas

### FALLOS a corregir

#### 1. SignatureManager usa URLs temporales (1h) para previsualizar firmas (BUG)

En `SignatureManager.tsx` (lineas 129-141), las miniaturas de firmas se cargan con `createSignedUrl(..., 3600)` - URLs que expiran en 1 hora. El bucket `email-signatures` ya es publico, por lo que deberia usarse `getPublicUrl()` como ya se hace en `ComposeEmail.tsx`.

**Impacto**: Si el usuario deja el dialogo abierto mucho tiempo, las imagenes dejan de mostrarse. Ademas es inconsistente con el patron usado en ComposeEmail.

**Solucion**: Reemplazar `createSignedUrl` por `getPublicUrl` y simplificar eliminando el estado `signedUrls` y el useEffect asociado.

#### 2. SignatureManager usa `as any` en multiples inserts/updates (Problema de tipos)

En `SignatureManager.tsx` lineas 82-87, 108 y 113, hay casts `as any` en operaciones de base de datos. Esto oculta posibles errores de tipos.

**Solucion**: Eliminar los `as any` y usar los tipos correctos del schema.

#### 3. RichTextEditor no sincroniza contenido externo (BUG potencial)

El editor Tiptap se inicializa con `content` pero no se actualiza si el prop `content` cambia externamente (por ejemplo al resetear el formulario con `setBody("")`). Cuando se cierra y reabre el compositor, el editor podria mantener el contenido anterior.

**Solucion**: Agregar un efecto que llame a `editor.commands.setContent(content)` cuando el contenido externo cambie y sea diferente del contenido actual del editor (por ejemplo, cuando se resetea a cadena vacia).

#### 4. Emails.tsx - query de busqueda vulnerable a inyeccion de caracteres especiales

En `Emails.tsx` linea 77, el valor de `search` se interpola directamente en la query `.or(...)`. Caracteres como `%`, `_` o comillas pueden romper o alterar la query.

**Solucion**: Escapar los caracteres especiales de PostgreSQL (`%`, `_`) antes de interpolarlos en la query ilike.

### MEJORAS propuestas

#### 5. Anadir campo BCC (copia oculta) al compositor

Actualmente solo hay To y CC. Anadir un campo BCC que se envie al backend y se pase a nodemailer como `bcc`.

#### 6. Anadir boton "Reenviar" en la vista previa de emails

En el panel derecho de `Emails.tsx`, cuando se ve un email enviado, anadir un boton para reenviar ese email (abre el compositor con los datos pre-rellenados).

### Archivos a modificar

1. **`src/components/email/SignatureManager.tsx`** - Reemplazar signedUrls por publicUrls, eliminar `as any`
2. **`src/components/email/RichTextEditor.tsx`** - Sincronizar contenido al resetear
3. **`src/pages/Emails.tsx`** - Escapar caracteres especiales en busqueda
4. **`src/components/email/ComposeEmail.tsx`** - Anadir campo BCC
5. **`supabase/functions/send-email/index.ts`** - Soportar parametro `bcc`

