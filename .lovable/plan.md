

# Plan: Guardar archivos del chat automaticamente en Documentos

## Resumen

Cuando un usuario adjunta archivos en el chat, actualmente se guardan en un almacenamiento separado (`knowledge`). El cambio hara que **tambien** se guarden automaticamente en la seccion de Documentos del sidebar, de modo que cualquier archivo subido desde el chat sea visible y descargable desde la pagina de Documentos.

## Que cambiara para el usuario

- Al adjuntar un archivo en el chat y enviar el mensaje, el archivo aparecera automaticamente en la seccion "Documentos" del sidebar
- Los documentos subidos desde el chat mostraran una etiqueta "Chat" para distinguirlos de los subidos manualmente
- Se podran descargar y eliminar igual que cualquier otro documento

## Cambios tecnicos

### Archivo: `src/pages/Index.tsx`

Modificar la funcion `uploadFilesToStorage` para que, ademas de guardar en el bucket `knowledge`, tambien suba cada archivo al bucket `documents` e inserte un registro en la tabla `documents`:

```text
uploadFilesToStorage(files, convId)
  |
  Para cada archivo:
  |-- Subir a bucket "knowledge" (existente, sin cambios)
  |-- Insertar en knowledge_items (existente, sin cambios)
  |-- Subir a bucket "documents" con path: userId/chat_timestamp_filename
  |-- Insertar en tabla "documents" con:
       - name: nombre del archivo
       - file_path: path en bucket documents
       - file_type: mime type
       - file_size: tamano
       - created_by: user id
       - conversation_id: id de la conversacion (campo nuevo, opcional)
```

### Archivo: `src/pages/Documents.tsx`

- Agregar una columna/badge visual "Origen: Chat" para documentos que tengan `conversation_id` no nulo
- Mostrar el campo `conversation_id` como indicador de que vino del chat (sin necesidad de nueva columna, ya existe en la tabla pero no se usa)

### Base de datos: Migracion SQL

Agregar columna `conversation_id` (uuid, nullable) a la tabla `documents` para poder identificar que documentos fueron subidos desde el chat:

```sql
ALTER TABLE documents ADD COLUMN IF NOT EXISTS conversation_id uuid;
```

No se necesita foreign key estricta ni cambios de RLS (las politicas existentes ya filtran por `created_by = auth.uid()`).

## Archivos a modificar

1. **src/pages/Index.tsx** - Agregar INSERT en tabla `documents` + upload a bucket `documents` dentro de `uploadFilesToStorage`
2. **src/pages/Documents.tsx** - Mostrar badge "Chat" en documentos con `conversation_id`
3. **Migracion SQL** - Agregar columna `conversation_id` a tabla `documents`

## Orden de ejecucion

1. Crear migracion SQL (agregar columna)
2. Modificar `uploadFilesToStorage` en Index.tsx
3. Actualizar vista de Documents.tsx con badge de origen
