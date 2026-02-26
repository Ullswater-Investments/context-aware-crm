

## Auditoria del Editor de Email: Errores, Correcciones y Mejoras

### Errores encontrados

#### 1. BubbleMenu import incompatible (ImageBubbleMenu.tsx, linea 1)
**Problema**: Se importa `BubbleMenu` desde `@tiptap/react/menus`, pero en TipTap v3 el subpath puede no existir o variar segun la version exacta instalada. La importacion segura es directamente desde `@tiptap/react`.
**Correccion**: Cambiar `import { BubbleMenu } from "@tiptap/react/menus"` a `import { BubbleMenu } from "@tiptap/react"`.

#### 2. Sincronizacion de contenido incompleta (RichTextEditor.tsx, linea 184-188)
**Problema**: El `useEffect` solo sincroniza cuando `content === ""` (reset del formulario). Si se selecciona una plantilla con `setBody(html)`, el editor TipTap no se actualiza porque `content !== ""`. Esto hace que las plantillas NO se apliquen visualmente en el editor.
**Correccion**: Cambiar la condicion para que siempre sincronice cuando el contenido externo difiera del contenido interno del editor:
```typescript
useEffect(() => {
  if (editor && content !== editor.getHTML()) {
    editor.commands.setContent(content);
  }
}, [content, editor]);
```

#### 3. Variable `selectedSig` no utilizada (ComposeEmail.tsx, linea 285)
**Problema**: `const selectedSig = signatures.find(...)` se declara pero nunca se usa. Codigo muerto.
**Correccion**: Eliminar la linea.

#### 4. Icono `Eye` importado pero no usado (ComposeEmail.tsx, linea 15)
**Problema**: `Eye` se importa en ComposeEmail pero no se usa directamente (lo usa EmailPreviewModal internamente).
**Correccion**: Eliminar `Eye` del import.

### Mejoras propuestas

#### 5. Alineacion de texto en la barra de herramientas
**Mejora**: Anadir botones de alineacion de texto (izquierda, centro, derecha, justificado) a la barra de herramientas del editor. Actualmente solo hay alineacion de imagenes pero no de parrafos.
**Implementacion**: Usar `editor.chain().focus().setTextAlign('center').run()` con la extension `@tiptap/extension-text-align`.

#### 6. Boton "Deshacer/Rehacer" en la barra de herramientas
**Mejora**: Anadir botones Undo/Redo (ya soportados por StarterKit) a la barra para que el usuario pueda revertir cambios rapido sin Ctrl+Z.
**Implementacion**: `editor.chain().focus().undo().run()` y `editor.chain().focus().redo().run()` con iconos `Undo2` y `Redo2` de Lucide.

#### 7. Reflejo del valor actual de fuente y tamano en los selectores
**Mejora**: Los selectores de fuente y tamano no muestran el valor actual del texto seleccionado. Si seleccionas texto con Arial 18px, los selectores siguen mostrando el placeholder.
**Implementacion**: Usar `editor.getAttributes('textStyle').fontFamily` y `editor.getAttributes('textStyle').fontSize` como `value` del Select, actualizandose con `editor.on('selectionUpdate')`.

---

### Resumen de cambios por archivo

| Archivo | Tipo | Descripcion |
|---|---|---|
| `src/components/email/ImageBubbleMenu.tsx` | Correccion | Cambiar import de BubbleMenu a `@tiptap/react` |
| `src/components/email/RichTextEditor.tsx` | Correccion | Arreglar useEffect de sincronizacion para que las plantillas se apliquen correctamente |
| `src/components/email/RichTextEditor.tsx` | Mejora | Anadir botones Undo/Redo en la barra |
| `src/components/email/RichTextEditor.tsx` | Mejora | Reflejar fuente/tamano actual en los selectores |
| `src/components/email/ComposeEmail.tsx` | Correccion | Eliminar variable `selectedSig` no usada y import `Eye` no usado |

No se requieren cambios en base de datos ni en edge functions.

