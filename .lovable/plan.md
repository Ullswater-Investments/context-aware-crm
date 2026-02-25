

## Plan: Adjuntos y firmas de email en el compositor

### Funcionalidad

1. **Adjuntar archivos** al redactar un email (PDFs, imagenes, documentos)
2. **Gestionar firmas de email** - subir una imagen de firma y seleccionarla al componer
3. La firma se inserta automaticamente al final del cuerpo HTML del email

### Cambios en la base de datos

#### 1. Nuevo bucket de storage: `email-attachments` (publico para URLs de Resend)
Para almacenar los archivos adjuntos temporalmente antes de enviarlos.

#### 2. Nuevo bucket de storage: `email-signatures` (privado)
Para almacenar las imagenes de firma de cada usuario.

#### 3. Nueva tabla: `email_signatures`
```text
id          uuid (PK, default gen_random_uuid())
created_by  uuid (not null)
name        text (not null) -- ej: "Firma principal", "Firma formal"
image_path  text (not null) -- ruta en el bucket email-signatures
is_default  boolean (default false)
created_at  timestamptz (default now())
```
Con RLS policies para que cada usuario solo vea/edite sus propias firmas.

#### 4. Nueva tabla: `email_attachments`
```text
id            uuid (PK, default gen_random_uuid())
email_log_id  uuid (FK -> email_logs.id)
file_name     text (not null)
file_path     text (not null) -- ruta en bucket email-attachments
file_size     bigint
file_type     text
created_at    timestamptz (default now())
created_by    uuid
```
Con RLS policies vinculadas al created_by.

### Cambios en el frontend

#### `src/components/email/ComposeEmail.tsx`
- Agregar input de tipo file (multiple) para adjuntar archivos
- Mostrar lista de archivos adjuntos con opcion de eliminar cada uno
- Los archivos se suben al bucket `email-attachments` antes de enviar
- Agregar selector de firma (dropdown) que carga las firmas del usuario
- Agregar boton "Gestionar firmas" que abre un mini-dialog para subir/eliminar firmas
- La firma seleccionada se convierte a `<img>` y se anade al final del HTML

#### `src/components/email/SignatureManager.tsx` (nuevo)
- Dialog para gestionar firmas: subir imagen, dar nombre, marcar como predeterminada, eliminar
- Preview de la firma antes de guardar
- Permite multiples firmas con una marcada como default

### Cambios en el backend

#### `supabase/functions/send-email/index.ts`
- Aceptar campo `attachments` en el body (array de objetos con `filename`, `path`)
- Descargar cada archivo del bucket `email-attachments` usando el service role client
- Convertir a base64 y pasarlos a la API de Resend como attachments:
  ```text
  attachments: [{ filename: "doc.pdf", content: base64Content }]
  ```
- Aceptar campo `signature_image_url` para incluir la firma como imagen en el HTML
- Guardar referencia de los adjuntos en la tabla `email_attachments`

### Detalles tecnicos

**Limite de archivos adjuntos:** Maximo 5 archivos, 10MB cada uno (limite de Resend)

**Flujo de adjuntos:**
1. Usuario selecciona archivos en el compositor
2. Al pulsar "Enviar", se suben al bucket `email-attachments/{userId}/{timestamp}/`
3. Se pasan las rutas al edge function
4. El edge function descarga los archivos, los codifica en base64, y los envia via Resend
5. Se registran en la tabla `email_attachments`

**Flujo de firmas:**
1. Usuario sube imagen de firma via SignatureManager
2. Se almacena en bucket `email-signatures/{userId}/`
3. Se registra en tabla `email_signatures`
4. Al componer email, se carga la firma default o la seleccionada
5. Se genera URL publica firmada y se inserta como `<img>` al final del HTML

### Archivos a crear/modificar

1. **Migracion SQL** - Crear tablas, buckets y RLS policies
2. **`src/components/email/SignatureManager.tsx`** - Nuevo componente para gestionar firmas
3. **`src/components/email/ComposeEmail.tsx`** - Agregar adjuntos y selector de firma
4. **`supabase/functions/send-email/index.ts`** - Soporte para adjuntos y firma en Resend API

