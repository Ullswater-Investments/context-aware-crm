

## Plan: Editor Expandido con Firma Oculta y Vista Previa Avanzada

### Objetivo

Redisenar el compositor de emails para maximizar el espacio de escritura, ocultar la firma del area visible (inyectandola solo al enviar), y anadir una vista previa profesional con modo escritorio/movil.

---

### 1. Ampliar el Sheet y redisenar el layout

**Archivo:** `src/components/email/ComposeEmail.tsx`

- Cambiar `sm:max-w-[600px]` a `sm:max-w-4xl` (800px) para un lienzo mas amplio
- Asunto: usar `text-xl font-semibold` sin bordes visibles (estilo "canvas")
- Aumentar el min-height del editor y el font-size del contenido a `text-base` (16px) en lugar de `prose-sm`

### 2. Firma oculta con Switch "Firma automatica"

**Archivo:** `src/components/email/ComposeEmail.tsx`

- Eliminar el bloque `Collapsible` de la firma del area de scroll del editor
- Anadir un `Switch` en el footer sticky con label "Firma automatica" (activado por defecto si hay firma seleccionada)
- Anadir indicador visual: punto verde + texto "Se anadira al enviar" cuando el switch esta activo
- Mantener el selector de firma y boton de gestionar firmas en el footer, pero de forma compacta
- En la funcion `send()`: concatenar el HTML de la firma al final del `htmlBody` solo si el switch esta activo (logica actual se mantiene, solo se mueve la visibilidad)

### 3. Nuevo componente: Vista Previa Avanzada

**Archivo nuevo:** `src/components/email/EmailPreviewModal.tsx`

- Dialog que ocupa casi toda la pantalla (`max-w-5xl h-[90vh]`)
- Header con:
  - Titulo "Previsualizacion Profesional"
  - Info del destinatario y asunto
  - `Tabs` con dos opciones: "Escritorio" (icono Monitor) y "Movil" (icono Smartphone)
- Area de contenido:
  - Modo escritorio: contenedor al 100% del ancho
  - Modo movil: contenedor de 375px centrado con borde grueso redondeado simulando smartphone, con "notch" decorativo
  - Transicion suave entre modos (`transition-all duration-500`)
- Renderiza `body + firma` usando `dangerouslySetInnerHTML`
- CSS inline para imagenes: `max-width: 100%, height: auto`
- Pie con nota informativa sobre responsiveness

### 4. Integrar boton Vista Previa en el footer

**Archivo:** `src/components/email/ComposeEmail.tsx`

- Anadir boton con icono `Eye` + "Vista Previa" entre el boton IA y el boton Enviar
- Al hacer clic, abre `EmailPreviewModal` pasando: `subject`, `body`, firma HTML (construida igual que en send), y `recipient`

### 5. Actualizar RichTextEditor para texto mas grande

**Archivo:** `src/components/email/RichTextEditor.tsx`

- Cambiar `prose-sm` a `prose` y `min-h-[140px]` a `min-h-[300px]` en los atributos del editor
- El padding del editor pasa de `px-3 py-2` a `px-6 py-4` para sensacion de documento

### 6. CSS global para imagenes en preview

**Archivo:** `src/index.css`

- Anadir regla `.email-content-preview img { max-width: 100% !important; height: auto !important; display: block; }`

---

### Archivos a crear/modificar

1. **`src/components/email/EmailPreviewModal.tsx`** (NUEVO) - Dialog con vista previa desktop/movil
2. **`src/components/email/ComposeEmail.tsx`** - Sheet mas ancho, firma oculta con Switch, boton Vista Previa, asunto estilo canvas
3. **`src/components/email/RichTextEditor.tsx`** - Editor mas grande con texto 16px
4. **`src/index.css`** - Regla CSS para imagenes en preview

### Flujo del usuario

```text
1. Abre el compositor -> Sheet ancho (800px), editor limpio sin firma visible
2. Escribe el mensaje en un area amplia con texto de 16px
3. En el footer: Switch "Firma automatica" activado con punto verde
4. Pulsa "Vista Previa" -> Dialog con el email completo + firma
5. Cambia entre "Escritorio" y "Movil" para ver como se adaptan los logos
6. Cierra la preview y pulsa "Enviar" -> la firma se concatena automaticamente
```

