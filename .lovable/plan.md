

## Plan: Editor de email enriquecido con soporte para imagenes inline

### Objetivo

Reemplazar el `<Textarea>` actual por un editor de texto enriquecido (rich text) que permita:
- Pegar imagenes directamente desde el portapapeles (Ctrl+V)
- Arrastrar y soltar imagenes
- Insertar imagenes con un boton
- Formateo basico de texto (negrita, cursiva, listas, enlaces)

### Solucion: Tiptap Editor

Tiptap es el editor rich text mas popular para React. Es modular, extensible y tiene soporte nativo para imagenes.

### Paso 1: Instalar dependencias

- `@tiptap/react` - Core del editor para React
- `@tiptap/starter-kit` - Extensiones basicas (negrita, cursiva, listas, headings, etc.)
- `@tiptap/extension-image` - Soporte para imagenes inline
- `@tiptap/extension-link` - Soporte para enlaces
- `@tiptap/extension-placeholder` - Placeholder text

### Paso 2: Crear bucket de storage `email-images`

Migracion SQL para crear un bucket publico donde se almacenaran las imagenes pegadas/arrastradas en el editor. Con politicas RLS para que solo usuarios autenticados puedan subir, y cualquiera pueda leer (necesario para que los destinatarios vean las imagenes).

### Paso 3: Crear componente `RichTextEditor`

Nuevo archivo `src/components/email/RichTextEditor.tsx`:

- Editor Tiptap con extensiones: StarterKit, Image, Link, Placeholder
- Barra de herramientas con botones: Negrita, Cursiva, Lista, Enlace, Insertar imagen
- Handler de paste que detecta imagenes del portapapeles, las sube al bucket `email-images` y las inserta como `<img>` con URL publica permanente
- Handler de drop para arrastrar imagenes
- Boton para seleccionar imagen desde el explorador de archivos
- Estilos con Tailwind para que encaje con el diseno actual del CRM

### Paso 4: Actualizar `ComposeEmail.tsx`

- Reemplazar el `<Textarea>` por el nuevo `<RichTextEditor>`
- El estado `body` pasa a almacenar HTML en vez de texto plano
- Al enviar, el HTML del editor se usa directamente como `html` del email
- Se genera una version `text` limpia (sin tags HTML) como fallback
- La firma se sigue anadiendo al final del HTML generado

### Paso 5: Actualizar la edge function `send-email`

No requiere cambios significativos. Ya acepta `html` como parametro y lo envia tal cual. Las imagenes inline seran URLs publicas del bucket, que los clientes de email renderizaran directamente.

### Archivos a crear/modificar

1. **`src/components/email/RichTextEditor.tsx`** (NUEVO) - Componente del editor rico
2. **`src/components/email/ComposeEmail.tsx`** - Reemplazar Textarea por RichTextEditor
3. **Nueva migracion SQL** - Bucket `email-images` con politicas RLS

### Detalles tecnicos

**Flujo de una imagen pegada:**
1. Usuario pega imagen (Ctrl+V) en el editor
2. Se detecta el evento paste con contenido de imagen
3. Se sube la imagen al bucket `email-images/{userId}/{timestamp}.png`
4. Se obtiene la URL publica permanente
5. Se inserta un nodo `<img src="url_publica">` en el editor
6. Al enviar, el HTML incluye las imagenes como URLs absolutas

**Barra de herramientas del editor:**
- Negrita (B) | Cursiva (I) | Lista | Lista numerada | Enlace | Imagen | Separador

