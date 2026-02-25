

## Plan: Enlace de email clicable + cambio automatico a "Contactado" tras enviar email

### Problema actual
1. En las tarjetas de contacto (kanban y lista), el email se muestra como texto plano sin enlace para enviar email directamente.
2. En el perfil del contacto, el email tampoco es clicable (solo hay un boton separado "Enviar email").
3. Tras enviar un email, el contacto permanece en su estado actual (ej: "Nuevo Lead") sin moverse automaticamente a "Contactado".

### Cambios a realizar

#### 1. Hacer el email clicable en las tarjetas (Kanban + Lista)
**Archivo:** `src/pages/Contacts.tsx`

- En la vista Kanban (linea ~362-365): convertir el texto del email en un boton clicable que abra el dialogo de ComposeEmail.
- En la vista Lista (linea ~470): igual, hacer el email clicable.
- Agregar estado para controlar el ComposeEmail desde las tarjetas (contacto seleccionado para email).

#### 2. Hacer el email clicable en el perfil del contacto
**Archivo:** `src/components/contacts/ContactProfile.tsx`

- En la linea ~334-336: convertir el email en un enlace/boton que abra directamente ComposeEmail, en lugar de mostrarlo como texto plano.

#### 3. Cambiar estado a "Contactado" tras enviar email
**Archivo:** `src/components/email/ComposeEmail.tsx`

- Tras enviar exitosamente un email, si el contacto tiene `contactId`, actualizar su estado a `contacted` en la tabla `contacts`.
- Esto se hara dentro del bloque `try` despues de `toast.success`, usando una llamada a `supabase.from("contacts").update(...)`.

### Detalles tecnicos

```text
Flujo actual:
  Tarjeta -> click email (nada) -> abrir perfil -> boton "Enviar email" -> ComposeEmail -> enviar -> OK

Flujo propuesto:
  Tarjeta -> click email -> ComposeEmail -> enviar -> OK + status="contacted"
  Perfil  -> click email -> ComposeEmail -> enviar -> OK + status="contacted"
```

**Archivos modificados:**
1. `src/pages/Contacts.tsx` - Agregar ComposeEmail a nivel de pagina con estado para email rapido desde tarjetas; hacer emails clicables con stopPropagation.
2. `src/components/contacts/ContactProfile.tsx` - Hacer el email clicable (enlace directo al compositor).
3. `src/components/email/ComposeEmail.tsx` - Agregar logica para actualizar `contacts.status` a `contacted` despues de enviar email exitosamente (solo si `contactId` esta presente y el estado actual no es mas avanzado como "client").

