

## Auditoria de Errores y Mejoras del CRM

### Estado actual de los datos

| Metrica | Valor |
|---|---|
| Total contactos | 509 |
| Con email principal | 180 (migracion ya ejecutada correctamente) |
| Sin ningun email (ni principal ni secundario) | 329 |
| Con work_email pero sin email principal | 0 (corregidos) |
| Sin company_domain | 0 de los que tienen email |

La migracion SQL se ejecuto correctamente. Los 94 contactos fueron saneados.

---

### BUG 1: Logica muerta en "Corregir email" del Kanban (Media)

**Problema:** En `Contacts.tsx` linea 438, el bloque que muestra el boton "Corregir email" tiene una condicion imposible:

```text
} : (c.work_email || c.personal_email) ? (
```

Este bloque solo se alcanza si la condicion anterior `(c.email || c.work_email || c.personal_email)` fue falsa, lo cual significa que ni `work_email` ni `personal_email` tienen valor. Por tanto, este segundo `else if` nunca se ejecutara. Es codigo muerto.

**Solucion:** Cambiar la primera condicion a solo `c.email`:
```text
{c.email ? (
  // mostrar email clickable
) : (c.work_email || c.personal_email) ? (
  // mostrar boton corregir
) : (
  // sin email
)}
```

Mismo bug existe en la vista Lista (linea 535-544).

### BUG 2: `whatsappOpen` no definido en ContactProfile (Media)

**Problema:** En `ContactProfile.tsx` linea 77, se define `whatsappOpen` como estado, pero en linea 503 se usa `setWhatsappOpen(true)` al hacer clic en el boton de WhatsApp. Sin embargo, el componente `WhatsAppChat` en linea 696 tambien usa `whatsappOpen`. Esto funciona correctamente - no es un bug. Verificado.

### BUG 3: `as any` innecesarios (Baja)

**Problema:** Multiples usos de `as any` para castear objetos al hacer `update()` o `insert()` en Supabase. Esto suprime errores de tipo y puede ocultar problemas reales.

**Ubicaciones:**
- `Contacts.tsx` lineas 193, 211
- `ContactProfile.tsx` lineas 115, 210, 233, 263

**Solucion:** Importar los tipos generados de Supabase y usar tipos correctos, o al menos tipar los objetos con `Record<string, any>` en lugar de castear todo el objeto.

### BUG 4: Deduplicacion de contactos solo por nombre exacto (Media)

**Problema:** En `ContactImporter.tsx` linea 401, la deduplicacion se hace por `full_name.toLowerCase()`. Esto significa que "Juan Perez" y "juan perez" se detectan como duplicados, pero "Juan Pérez" (con tilde) no. Tampoco se deduplica por email, que seria mas fiable.

**Solucion:** Anadir deduplicacion secundaria por email: si `row.email` coincide con algun contacto existente, tratarlo como actualizacion aunque el nombre difiera.

### MEJORA 1: Boton "Corregir todos los emails" masivo (Alta)

**Problema:** Actualmente el boton de correccion rapida solo funciona contacto a contacto. Si quedan contactos con `work_email` pero sin `email` (por futuras importaciones), no hay forma de corregirlos todos de golpe.

**Solucion:** Anadir un boton junto a "Enriquecer todos" que ejecute un UPDATE masivo via edge function o directamente:
```text
UPDATE contacts SET email = work_email WHERE email IS NULL AND work_email IS NOT NULL AND created_by = user_id
```

### MEJORA 2: Validacion de email en campo "Email principal" del formulario (Baja)

**Problema:** El formulario de creacion de contacto (`Contacts.tsx` linea 320) tiene `type="email"` en el input pero no valida el formato antes de guardar. Un usuario podria escribir texto invalido.

**Solucion:** Validar con regex antes de `create()` y mostrar error si el formato no es valido.

### MEJORA 3: Limite de 2000 contactos en la carga (Media)

**Problema:** En `Contacts.tsx` linea 84, la query tiene `.limit(2000)`. Si el usuario tiene mas de 2000 contactos, los restantes no se muestran ni se procesan.

**Solucion:** Implementar paginacion o scroll infinito, o al menos mostrar un aviso si se alcanza el limite.

### MEJORA 4: WhatsApp no se abre al usar boton del perfil sin telefono principal (Baja)

**Problema:** En `ContactProfile.tsx`, el componente `WhatsAppChat` recibe `contact` que puede tener `phone` vacio pero `mobile_phone` con valor. El componente WhatsApp deberia usar el primer telefono disponible.

**Solucion:** Verificar que `WhatsAppChat` use `contact.phone || contact.mobile_phone || contact.work_phone` internamente.

---

### Resumen de cambios propuestos

| Archivo | Cambio | Prioridad |
|---|---|---|
| `src/pages/Contacts.tsx` L433-444 | Corregir condicion de "Corregir email" en Kanban (codigo muerto) | Media |
| `src/pages/Contacts.tsx` L535-544 | Misma correccion en vista Lista | Media |
| `src/components/contacts/ContactImporter.tsx` | Deduplicacion por email ademas de nombre | Media |
| `src/pages/Contacts.tsx` | Boton masivo "Corregir emails" | Alta |
| `src/pages/Contacts.tsx` | Validacion regex en formulario de creacion | Baja |
| Varios archivos | Eliminar `as any` innecesarios | Baja |

