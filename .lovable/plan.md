

## Correcciones y Mejoras Pendientes del Editor de Email

### Estado actual tras la interrupcion

| Elemento | Estado |
|---|---|
| Extension Underline importada y registrada | Completado |
| Icono UnderlineIcon importado | Completado |
| Icono RemoveFormatting importado | Completado |
| Trash2 en ImageBubbleMenu | Completado |
| Boton Underline en la barra de herramientas | PENDIENTE |
| Boton Limpiar Formato en la barra de herramientas | PENDIENTE |
| Confirmacion al cerrar con borrador | PENDIENTE |

### Cambios a implementar

#### 1. Anadir botones Underline y Clear Formatting a la barra (RichTextEditor.tsx)

Insertar dos botones despues del boton Italic (linea 359):

- **Underline**: `editor.chain().focus().toggleUnderline().run()` con icono `UnderlineIcon`, estado activo con `editor.isActive("underline")`
- **Clear Formatting**: `editor.chain().focus().clearNodes().unsetAllMarks().run()` con icono `RemoveFormatting`

Ambos iconos ya estan importados pero no se usan. Solo falta anadir los botones JSX en la barra de herramientas.

#### 2. Confirmacion al cerrar con borrador (ComposeEmail.tsx)

Anadir un `AlertDialog` que intercepte el cierre del compositor cuando hay contenido escrito:

- Nuevo estado `showDiscardDialog` (boolean)
- Modificar `handleOpenChange`: si `isOpen === false` y hay contenido (`body`, `subject`, o `attachments`), mostrar el dialogo en vez de cerrar directamente
- El dialogo tiene dos opciones: "Descartar" (cierra y limpia) y "Seguir editando" (cancela el cierre)
- Importar `AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle` de shadcn

#### 3. Linea vacia innecesaria (ComposeEmail.tsx, lineas 285-286)

Hay dos lineas vacias consecutivas donde antes estaba la variable `selectedSig` eliminada. Limpiar a una sola linea vacia.

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/components/email/RichTextEditor.tsx` | Anadir 2 botones (Underline + Clear Formatting) tras el boton Italic |
| `src/components/email/ComposeEmail.tsx` | Anadir AlertDialog de confirmacion al cerrar con borrador + limpiar linea vacia |

### Sin cambios en base de datos ni edge functions

