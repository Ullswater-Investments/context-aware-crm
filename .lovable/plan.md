

## Auditoria Completa: Estado del Editor de Email

### Estado general: TODO COMPLETADO CORRECTAMENTE

Tras una revision exhaustiva del codigo, las dependencias instaladas, los imports, y la configuracion, el sistema esta completo y funcional. A continuacion el detalle:

### Verificacion de errores

#### 1. Import de BubbleMenu (ImageBubbleMenu.tsx) - SIN ERROR
El import `from "@tiptap/react/menus"` es CORRECTO. TipTap v3.20.0 exporta `BubbleMenu` desde ese subpath (`./menus` en el package.json de `@tiptap/react`). No requiere cambio.

#### 2. Sincronizacion de contenido (RichTextEditor.tsx) - CORREGIDO
La condicion del `useEffect` ya sincroniza correctamente: `content !== editor.getHTML()`. Las plantillas se aplican visualmente al editor. Correcto.

#### 3. Selectores reactivos de fuente y tamano - CORREGIDO
Los selectores reflejan los valores actuales de la seleccion gracias al `useEffect` con `editor.on("selectionUpdate")` y `editor.on("transaction")`. Correcto.

#### 4. Undo/Redo - IMPLEMENTADO
Botones presentes con estados `disabled` correctos. Correcto.

#### 5. Alineacion de texto - IMPLEMENTADO
Cuatro botones (Left, Center, Right, Justify) con `TextAlign` extension configurada. Correcto.

#### 6. Limpieza de codigo muerto (ComposeEmail.tsx) - CORREGIDO
La variable `selectedSig` y el import `Eye` fueron eliminados correctamente.

#### 7. Plantillas de email - COMPLETO
La tabla `email_templates` existe en la base de datos con tipos generados. El componente `TemplatePicker` carga plantillas, las agrupa por categoria, y al seleccionar una, el asunto y cuerpo se actualizan con sustitucion de variables.

#### 8. Extension FontSize personalizada - CORRECTO
Genera `<span style="font-size: Xpx">` como inline style para compatibilidad con clientes de email.

#### 9. Extension EmailImage - CORRECTO
Genera estilos inline para width, float y margin, asegurando compatibilidad con Outlook/Gmail.

### Mejoras propuestas

#### 1. Boton de Subrayado (Underline) en la barra de herramientas
Falta soporte para subrayado, una funcion basica de cualquier editor profesional. StarterKit no incluye Underline por defecto, se necesita instalar `@tiptap/extension-underline` y anadir un boton con el icono `Underline` de Lucide.

**Archivos afectados:** `RichTextEditor.tsx` (import + extension + boton)

#### 2. Boton para limpiar formato (Clear Formatting)
No existe forma de quitar todos los estilos de una seleccion. Seria util un boton "Limpiar formato" que ejecute `editor.chain().focus().clearNodes().unsetAllMarks().run()`.

**Archivos afectados:** `RichTextEditor.tsx` (boton nuevo con icono `RemoveFormatting` de Lucide)

#### 3. Eliminar imagen desde el BubbleMenu
Actualmente el BubbleMenu de imagen permite redimensionar y alinear, pero no eliminar la imagen. Anadir un boton "Eliminar" con icono `Trash2` que ejecute `editor.chain().focus().deleteSelection().run()`.

**Archivos afectados:** `ImageBubbleMenu.tsx` (boton nuevo)

#### 4. Gestor de plantillas (CRUD)
Actualmente las plantillas solo se pueden leer. No existe interfaz para crear, editar o eliminar plantillas. Crear una pagina o modal de gestion de plantillas con formulario (nombre, asunto, categoria, entidad, contenido HTML con el mismo editor TipTap).

**Archivos afectados:** Nuevo componente `TemplateManager.tsx`, posible nueva ruta o modal

#### 5. Confirmacion antes de cerrar el compositor con contenido
Si el usuario tiene texto escrito y cierra el panel lateral (Sheet), pierde todo sin confirmacion. Anadir un dialogo de confirmacion "Tienes un borrador sin enviar. Descartar?" usando `AlertDialog`.

**Archivos afectados:** `ComposeEmail.tsx` (logica de intercepcion del cierre)

### Resumen

| Area | Estado |
|---|---|
| BubbleMenu import | Correcto |
| Sincronizacion de contenido | Corregido |
| Selectores reactivos | Corregido |
| Undo/Redo | Implementado |
| Alineacion de texto | Implementado |
| Codigo muerto limpiado | Corregido |
| Plantillas de email | Completo |
| FontSize inline styles | Correcto |
| EmailImage inline styles | Correcto |

### Mejoras recomendadas (por prioridad)

1. Confirmacion al cerrar con borrador (evita perdida de trabajo)
2. Boton de eliminar imagen en BubbleMenu (usabilidad critica)
3. Subrayado en la barra de herramientas (funcion basica esperada)
4. Limpiar formato (productividad)
5. Gestor de plantillas CRUD (funcionalidad completa)

