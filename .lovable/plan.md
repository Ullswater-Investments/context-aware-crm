

## Plan: Editor de Email Profesional con Estilos Avanzados y BubbleMenu de Imagenes

### Resumen
Transformar el editor TipTap actual en una herramienta de edicion profesional con controles de tipografia (fuente, tamano, color), un BubbleMenu para redimensionar y alinear imagenes, y estilos inline compatibles con Outlook/Gmail.

### 1. Instalar dependencias nuevas

Se necesitan estas extensiones de TipTap que no estan instaladas:
- `@tiptap/extension-text-style` (base para color y font-family)
- `@tiptap/extension-font-family`
- `@tiptap/extension-color`
- `@tiptap/extension-highlight`

No existe una extension oficial de TipTap para font-size, asi que crearemos una extension personalizada.

### 2. Crear: `src/lib/tiptap-font-size.ts`

Extension personalizada de TipTap que registra un mark `fontSize` con un atributo `size`. Usa `renderHTML` para generar `<span style="font-size: Xpx">` (inline style para compatibilidad email). Expone los comandos `setFontSize(size)` y `unsetFontSize()`.

### 3. Crear: `src/components/email/ImageBubbleMenu.tsx`

Componente con `BubbleMenu` de `@tiptap/react` que se muestra solo cuando una imagen esta seleccionada:
- Botones de tamano: 25%, 50%, 100%, Original
- Separador vertical
- Botones de alineacion: AlignLeft, AlignCenter, AlignRight (iconos Lucide)
- Estado activo visual en el boton correspondiente
- Usa `editor.chain().focus().updateAttributes('image', { width, align }).run()`

### 4. Modificar: `src/components/email/RichTextEditor.tsx`

**Cambios principales:**

**A. Imports y extensiones (lineas 1-73):**
- Importar TextStyle, FontFamily, Color, Highlight, la extension FontSize personalizada, y BubbleMenu
- Importar Select, SelectContent, SelectItem, SelectTrigger, SelectValue de shadcn
- Importar Separator de shadcn
- Importar iconos adicionales: AlignLeft, AlignCenter, AlignRight, Type, Palette, Highlighter
- Importar ImageBubbleMenu

**B. Extension Image extendida (linea 70):**
Reemplazar `Image.configure({ inline: false, allowBase64: false })` por una version extendida con dos atributos personalizados:

- `width`: default `'100%'`, renderiza en el atributo `style`
- `align`: default `'center'`, renderiza como:
  - center: `display: block; margin-left: auto; margin-right: auto;`
  - left: `float: left; margin-right: 1rem; margin-bottom: 1rem;`
  - right: `float: right; margin-left: 1rem; margin-bottom: 1rem;`

Ambos atributos se combinan en un unico `style` en `renderHTML`.

**C. Nuevas extensiones en el array:**
Anadir TextStyle, FontFamily, Color, Highlight.configure({ multicolor: true }), y la extension FontSize personalizada.

**D. Barra de herramientas mejorada (lineas 181-270):**
Reemplazar la barra actual por una version premium con:

Fila 1 (selectores):
- Select de tipo de letra (Arial, Times New Roman, Georgia, Verdana, Courier New) - w-[140px]
- Select de tamano (12px, 14px, 16px, 18px, 20px, 24px, 32px) - w-[75px]
- Separador vertical
- Input type="color" nativo para color de texto (w-7 h-7)
- Boton Highlight (resaltador)
- Separador vertical
- Botones existentes: Bold, Italic, Link, BulletList, OrderedList, HorizontalRule
- Separador vertical
- Boton ImagePlus (existente)

**E. BubbleMenu de imagenes (despues de linea 273):**
Renderizar `<ImageBubbleMenu editor={editor} />` justo despues de `<EditorContent />`.

### Archivos afectados

| Archivo | Accion |
|---|---|
| `src/lib/tiptap-font-size.ts` | Crear - extension personalizada fontSize |
| `src/components/email/ImageBubbleMenu.tsx` | Crear - BubbleMenu con controles de tamano y alineacion |
| `src/components/email/RichTextEditor.tsx` | Modificar - extensiones avanzadas + barra premium + BubbleMenu |

### Dependencias a instalar
- `@tiptap/extension-text-style`
- `@tiptap/extension-font-family`
- `@tiptap/extension-color`
- `@tiptap/extension-highlight`

### Compatibilidad email
- Todos los estilos de texto se renderizan como inline styles en spans: `<span style="font-family: Arial; font-size: 18px; color: #ff0000;">`
- Los estilos de imagen usan float/margin para alineacion lateral y display:block/margin:auto para centrado
- No se usan clases CSS que los clientes de email ignoran

### Sin cambios en base de datos
No se requieren migraciones SQL ni cambios en edge functions.

