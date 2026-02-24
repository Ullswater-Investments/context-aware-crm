

# Plan: Sistema de Adjuntar Archivos al Chat (hasta 10 archivos)

## Resumen

Restaurar y mejorar el boton de adjuntar archivos en el chat de IA, permitiendo subir hasta 10 archivos simultaneamente junto con el mensaje de texto. Los archivos se suben al bucket `knowledge` de Storage, se registran en `knowledge_items`, y su contenido se envia al modelo multimodal (Gemini 2.5 Pro) para que la IA pueda analizarlos.

---

## Cambios a Implementar

### 1. Frontend - Chat Input (src/pages/Index.tsx)

- Agregar estado `attachedFiles` (array de File, max 10)
- Agregar boton de clip/adjuntar (icono `Paperclip`) junto al textarea
- Input de tipo `file` oculto con `multiple` y `accept` amplio (PDF, imagenes, Word, Excel, CSV, TXT, etc.)
- Validaciones: maximo 10 archivos, maximo 20MB por archivo
- Mostrar previsualizacion compacta de archivos adjuntos debajo del textarea (nombre + tamano + boton X para quitar)
- Al enviar: subir archivos a Storage, registrar en `knowledge_items`, y pasar referencias/contenido al edge function

### 2. Logica de Envio con Archivos

- Subir cada archivo a `knowledge/{user_id}/chat/{conversation_id}/{filename}`
- Registrar en tabla `knowledge_items` con `source_type = 'chat_upload'` y `conversation_id`
- Para imagenes: convertir a base64 y enviar como contenido multimodal al modelo Gemini 2.5 Pro (soporta vision)
- Para texto/CSV/JSON: leer contenido como texto y adjuntarlo al mensaje del usuario
- Para PDFs y otros binarios: mencionar el nombre del archivo en el mensaje y almacenar para referencia futura

### 3. Edge Function (supabase/functions/chat/index.ts)

- Cambiar modelo a `google/gemini-2.5-pro` cuando hay archivos adjuntos (soporta multimodal)
- Aceptar nuevo campo `attachments` en el body: array de `{ name, type, content }` donde content es base64 para imagenes o texto extraido
- Construir mensajes multimodales con partes de tipo `image_url` o texto segun el tipo de archivo

### 4. Chat Stream (src/lib/chat-stream.ts)

- Actualizar la firma para aceptar `attachments` opcionales
- Pasar `attachments` al body del fetch junto con `messages`

### 5. Visualizacion de Archivos en Mensajes

- En los mensajes del usuario que tienen archivos adjuntos, mostrar iconos/badges con los nombres de archivo
- Almacenar metadata de archivos adjuntos en `chat_messages.content` como parte del mensaje (ej: texto + lista de archivos)

---

## Seccion Tecnica

### Archivos a modificar:
1. **src/pages/Index.tsx** - Agregar UI de adjuntar, estado de archivos, logica de subida a Storage
2. **src/lib/chat-stream.ts** - Agregar campo `attachments` al payload
3. **supabase/functions/chat/index.ts** - Soportar mensajes multimodales con imagenes y texto de archivos

### Flujo tecnico:

```text
Usuario selecciona archivos (max 10, max 20MB c/u)
        |
        v
[Previsualizacion inline debajo del textarea]
        |
  Click Enviar
        |
        v
+-- Imagenes --> base64 --> parte multimodal (image_url)
+-- Texto/CSV/JSON --> FileReader.readAsText --> parte de texto
+-- PDF/otros --> solo nombre referenciado
        |
        v
Subir a Storage bucket "knowledge"
Registrar en knowledge_items
        |
        v
POST /chat con { messages, attachments }
        |
        v
Edge function: si hay imagenes usa gemini-2.5-pro
               construye mensaje con partes multimodales
        |
        v
Stream response al usuario
```

### Modelo IA:
- Sin archivos: `google/gemini-3-flash-preview` (rapido, texto puro)
- Con archivos (especialmente imagenes): `google/gemini-2.5-pro` (multimodal, vision)

### Tipos de archivo soportados:
- Imagenes: JPG, PNG, WEBP, GIF
- Documentos: PDF, TXT, CSV, JSON, XML, MD
- Office: DOCX, XLSX, PPTX (referencia por nombre)

### No se necesitan cambios de base de datos:
- La tabla `knowledge_items` ya tiene los campos necesarios (`file_path`, `file_name`, `file_type`, `file_size`, `conversation_id`, `source_type`, `created_by`)
- El bucket `knowledge` ya existe en Storage

