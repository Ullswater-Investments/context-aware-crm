

## Revision del Editor de Email: Errores y Recomendaciones

### BUG 1: `hasDraft` se evalua con `defaultBody` al abrir

**Problema:** En `handleOpenChange`, cuando `isOpen === true`, se asigna `setBody(defaultBody)` (linea 120). Pero `hasDraft` (linea 112) es una variable derivada que lee `body` del estado actual. Si el compositor se abre con `defaultBody` precargado (ej: al responder un email), y el usuario cierra sin modificar nada, `hasDraft` sera `true` y mostrara el dialogo de descarte innecesariamente.

**Solucion:** Comparar el contenido actual contra los valores por defecto antes de considerar que hay borrador. Cambiar la logica de `hasDraft` para excluir contenido que coincida exactamente con `defaultSubject`/`defaultBody`:

```typescript
const hasDraft =
  (subject.trim() !== "" && subject !== defaultSubject) ||
  (body.replace(/<[^>]+>/g, "").trim() !== "" && body !== defaultBody) ||
  attachments.length > 0;
```

**Archivo:** `src/components/email/ComposeEmail.tsx`, linea 112

---

### BUG 2: Doble fetch innecesario al abrir

**Problema:** `fetchSignatures` y `fetchEmailAccounts` se llaman tanto en `handleOpenChange(true)` (lineas 123-124) como en el `useEffect` que observa `open` (lineas 160-165). Cuando se abre el compositor, ambos se ejecutan simultaneamente, duplicando las peticiones a la base de datos.

**Solucion:** Eliminar las llamadas de `handleOpenChange` y dejar solo el `useEffect` que ya las gestiona cuando `open` cambia a `true`.

**Archivo:** `src/components/email/ComposeEmail.tsx`, lineas 123-124

---

### BUG 3: `to` no se incluye en la evaluacion de borrador

**Problema:** Si el usuario solo ha rellenado el campo "Para" (destinatario) sin asunto ni cuerpo, al cerrar no se muestra el dialogo de descarte. Esto puede hacer que pierda un destinatario que ya habia escrito.

**Solucion:** Incluir `to` en la evaluacion de `hasDraft`, pero solo si difiere de `defaultTo`:

```typescript
const hasDraft =
  (to.trim() !== "" && to !== defaultTo) ||
  (subject.trim() !== "" && subject !== defaultSubject) ||
  ...
```

**Archivo:** `src/components/email/ComposeEmail.tsx`, linea 112

---

### MEJORA 1: TemplateManager deberia usar RichTextEditor en vez de Textarea

**Problema actual:** El `TemplateManager` usa un `<Textarea>` para editar el HTML de la plantilla (linea 190). Esto obliga al usuario a escribir HTML manualmente, lo cual es poco practico y propenso a errores.

**Solucion:** Reemplazar el `<Textarea>` por el componente `RichTextEditor` ya existente. Asi el usuario edita las plantillas visualmente, igual que al componer un email. Solo requiere importar `RichTextEditor` y pasarle `contentHtml`/`setContentHtml` como props.

**Archivo:** `src/components/email/TemplateManager.tsx`, lineas 188-195

---

### MEJORA 2: Feedback al usuario cuando la sustitucion inversa detecta variables

**Problema actual:** Cuando el usuario guarda como plantilla, la sustitucion inversa (nombre del contacto por `{{nombre}}`) ocurre en silencio. El usuario no sabe que se ha hecho la sustitucion.

**Solucion:** Tras la sustitucion, mostrar un toast informativo indicando cuantas variables se detectaron automaticamente. Ejemplo: "Se detectaron 2 variables: {{nombre}}, {{empresa}}".

**Archivo:** `src/components/email/ComposeEmail.tsx`, funcion `handleSaveAsTemplate`

---

### MEJORA 3: Boton "Descartar" visible en el header del compositor

**Problema actual:** Para cerrar el compositor, el usuario debe hacer clic fuera del panel o en la X (que esta oculta con `[&>button]:hidden`). No hay un boton explicito de "Cerrar" o "Descartar".

**Solucion:** Anadir un boton de cerrar (icono X) en el `SheetHeader`, al lado del titulo, que llame a `handleOpenChange(false)`. Asi la interaccion es mas clara y accesible.

**Archivo:** `src/components/email/ComposeEmail.tsx`, dentro del `SheetHeader` (linea 408)

---

### Resumen de cambios

| Tipo | Descripcion | Archivo | Prioridad |
|---|---|---|---|
| Bug | `hasDraft` activo con `defaultBody` precargado | ComposeEmail.tsx | Alta |
| Bug | Doble fetch de firmas y cuentas al abrir | ComposeEmail.tsx | Media |
| Bug | `to` no evaluado en `hasDraft` | ComposeEmail.tsx | Baja |
| Mejora | RichTextEditor en TemplateManager | TemplateManager.tsx | Alta |
| Mejora | Toast informativo de variables detectadas | ComposeEmail.tsx | Baja |
| Mejora | Boton de cerrar en header del compositor | ComposeEmail.tsx | Media |

