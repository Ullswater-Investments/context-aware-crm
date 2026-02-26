

## Revision del Editor de Email: Errores y Mejoras

### BUG CRITICO: Dialogo de descarte aparece tras enviar email

**Problema:** Despues de enviar un email correctamente, la linea 301 llama a `handleOpenChange(false)`. En ese momento, `subject` y `body` todavia tienen contenido, asi que `hasDraft` es `true` y se muestra el dialogo "Descartar borrador?" al usuario que acaba de enviar con exito.

**Solucion:** En la funcion `send()`, tras el envio exitoso, llamar directamente a `onOpenChange(false)` y limpiar los campos manualmente, sin pasar por `handleOpenChange` que contiene la logica de proteccion de borrador.

**Archivo:** `src/components/email/ComposeEmail.tsx`, funcion `send()` (lineas 300-302)

---

### BUG MENOR: Entidad vacia al guardar plantilla

**Problema:** El `Select` de entidad en el dialogo "Guardar como plantilla" no tiene opcion para deseleccionar. Si el usuario selecciona "GDC" y luego quiere quitar la seleccion, no puede. Ademas, el valor inicial `""` no coincide con ningun `SelectItem`, lo cual puede causar comportamiento inconsistente en Radix.

**Solucion:** Cambiar el valor por defecto de `templateEntity` a `"none"` y anadir un `SelectItem` con valor `"none"` y label "Ninguna". En `handleSaveAsTemplate`, convertir `"none"` a `null` antes de insertar.

**Archivo:** `src/components/email/ComposeEmail.tsx`

---

### MEJORA 1: Gestor de plantillas (editar y eliminar)

Actualmente las plantillas solo se pueden crear y leer. No hay forma de editarlas o eliminarlas. Propuesta:

- Anadir un boton de engranaje o "Gestionar" junto al boton "Plantillas" en el footer
- Crear un componente `TemplateManager` (similar a `SignatureManager`) con un `Dialog` que liste las plantillas del usuario
- Cada plantilla muestra nombre, categoria y entidad, con botones para editar (abre formulario con los datos precargados + editor TipTap) y eliminar (con confirmacion)
- La tabla `email_templates` ya tiene RLS con CRUD completo, no se necesitan cambios en base de datos

**Archivos:**
- Nuevo: `src/components/email/TemplateManager.tsx`
- Modificar: `src/components/email/ComposeEmail.tsx` (anadir boton para abrir el gestor)

---

### MEJORA 2: Variables adicionales en plantillas

Actualmente solo se soporta `{{nombre}}`. Propuesta de variables adicionales:

- `{{email}}` - email del contacto
- `{{empresa}}` - nombre de la organizacion del contacto
- `{{cargo}}` - posicion/cargo del contacto

La sustitucion se haria en `handleTemplateSelect` consultando los datos del contacto. La sustitucion inversa (al guardar plantilla) tambien detectaria estos campos.

**Archivo:** `src/components/email/ComposeEmail.tsx` (funciones `handleTemplateSelect` y `handleSaveAsTemplate`)

---

### MEJORA 3: Preview de plantilla antes de seleccionar

Actualmente al seleccionar una plantilla en el `CommandDialog` se aplica inmediatamente. Seria util poder ver una vista previa del contenido HTML antes de confirmar la seleccion.

- Anadir un panel lateral o tooltip que muestre el `content_html` renderizado al pasar el cursor sobre una plantilla
- Alternativa mas simple: anadir un pequeno extracto de texto plano (primeros 80 caracteres) debajo del nombre y asunto en cada `CommandItem`

**Archivo:** `src/components/email/TemplatePicker.tsx`

---

### Resumen de cambios

| Tipo | Descripcion | Prioridad |
|---|---|---|
| Bug critico | Dialogo de descarte tras envio exitoso | Alta |
| Bug menor | Select de entidad sin opcion "ninguna" | Media |
| Mejora | Gestor de plantillas CRUD completo | Media |
| Mejora | Variables adicionales en plantillas | Baja |
| Mejora | Preview de plantilla en selector | Baja |

### Detalles tecnicos

**Fix del bug critico (send):**
Reemplazar `handleOpenChange(false)` por:
```typescript
setTo(""); setCc(""); setBcc(""); setSubject(""); setBody(""); setAttachments([]);
onOpenChange(false);
```

**Fix del Select de entidad:**
Cambiar estado inicial a `"none"`, anadir `<SelectItem value="none">Ninguna</SelectItem>`, y en `handleSaveAsTemplate` usar `templateEntity === "none" ? null : templateEntity`.

