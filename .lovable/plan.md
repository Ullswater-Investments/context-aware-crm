

## Plan: Rediseno del Compositor de Email - Panel Lateral Profesional

### Objetivo

Transformar el compositor de email de un Dialog (modal centrado) a un Sheet (panel lateral derecho) con layout flex de 3 zonas: header fijo, cuerpo con scroll, y footer fijo. Incluye campos CC/BCC colapsables, firma colapsable, barra de herramientas en el footer y boton de IA con selector de tono integrado.

---

### Cambios en `src/components/email/ComposeEmail.tsx`

**1. Cambio de contenedor: Dialog a Sheet**
- Reemplazar `Dialog`/`DialogContent` por `Sheet`/`SheetContent` de shadcn (side="right")
- Ancho: `w-full sm:max-w-[600px]` con `p-0` para controlar padding manualmente
- Layout interno: `flex flex-col h-full`

**2. Header fijo (sticky top)**
- Titulo "Redactar email" con boton de cerrar
- Campo "Para" con boton "+ CC/BCC" a la derecha
- Estado `showCcBcc` (boolean, default false): al pulsar, se despliegan los campos CC y BCC con animacion
- Campo "Asunto"
- Separado del cuerpo con `border-b`

**3. Cuerpo con scroll (`flex-1 overflow-y-auto`)**
- Editor Tiptap (RichTextEditor) ocupando el espacio disponible
- Firma colapsable debajo del editor:
  - Usa el componente `Collapsible` de shadcn
  - Colapsada: muestra una linea gris con nombre de la firma seleccionada y boton "Ver firma"
  - Expandida: muestra la imagen de la firma con escala reducida (opacity-80, scale-95)
  - Boton "Gestionar firmas" para abrir SignatureManager
- Lista de adjuntos (si hay) debajo de la firma

**4. Footer fijo (sticky bottom)**
- Borde superior + fondo solido (`bg-background border-t`)
- Lado izquierdo: boton adjuntar (icono Paperclip) + contador de adjuntos + selector de firma (Select compacto)
- Lado derecho: 
  - DropdownMenu de IA con selector de tono (Formal, Amigable, Persuasivo, Conciso) - icono Sparkles
  - Boton "Enviar" (primary) con icono Send
- Todo en una sola linea horizontal

**5. Selector de tono IA en el footer**
- Al seleccionar un tono, llama a `supabase.functions.invoke("suggest-reply")` con el subject, body_text y tono
- Muestra Loader2 mientras genera
- Al recibir respuesta, inserta el HTML en el editor (actualiza `body` state)
- Toast de exito/error

**6. Props adicionales**
- No se cambia la interfaz `ComposeEmailProps` (mismos props que antes)
- Se necesita un nuevo estado `showCcBcc` (boolean)
- Se necesita un nuevo estado `suggestingReply` (boolean)

### Cambios en `src/pages/Emails.tsx`

- Eliminar el DropdownMenu de "Sugerir Respuesta" del panel de detalle (ya estara en el compositor)
- Eliminar estado `suggestingReply` y funcion `handleSuggestReply` (se mueve al compositor)
- Mantener el boton "Reenviar" en el panel de detalle

### Archivos a modificar

1. **`src/components/email/ComposeEmail.tsx`** - Rediseno completo: Dialog a Sheet, layout flex 3 zonas, CC/BCC colapsable, firma colapsable, footer fijo con IA + Enviar
2. **`src/pages/Emails.tsx`** - Limpiar logica de suggest-reply (ahora vive en ComposeEmail), quitar imports no usados

### Detalles tecnicos

- El Sheet de shadcn usa `@radix-ui/react-dialog` internamente (ya instalado)
- Se usa `Collapsible` de shadcn para la firma (ya instalado: `@radix-ui/react-collapsible`)
- El DropdownMenu para tonos IA usa `bg-popover` para evitar transparencia (siguiendo guia de dropdowns)
- El `SheetContent` lleva `className="p-0 w-full sm:max-w-[600px]"` para controlar el layout
- La funcion `suggest-reply` ya existe y esta desplegada; solo se mueve la logica de llamada de Emails.tsx a ComposeEmail.tsx

