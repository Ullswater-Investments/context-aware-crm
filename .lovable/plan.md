

## Correccion Total de Emails en postal_address

### Diagnostico de la base de datos (datos reales)

| Metrica | Valor |
|---|---|
| Total contactos | 509 |
| Sin email principal | 329 |
| **Email en postal_address (sin email principal)** | **92** -- ESTE ES EL PROBLEMA PRINCIPAL |
| Email en postal_address (con email principal ya existente) | 13 (solo limpiar postal_address) |
| Email en company_domain | 0 |
| Email en notes | 0 |
| Email en full_name (ya tienen email) | 11 (ya corregidos) |

**Ejemplo real:** Adrian Sanchez tiene `postal_address = "adrian@velezylozano.com"`, `email = NULL`, `company_domain = "velezylozano.com"`. El email esta atrapado en el campo de direccion.

**Causa raiz:** El importador mapea la columna "address" del Excel a `postal_address`, pero esa columna en algunos archivos contiene emails en lugar de direcciones fisicas. La funcion `sanitizeEmailFields` no revisa `postal_address`.

---

### Fase 1: Migracion SQL -- Remediar 92 + 13 contactos

Ejecutar un UPDATE con regex para:

**Paso 1:** Contactos SIN email pero con email en postal_address (92 registros):
```text
UPDATE contacts
SET email = (regexp_match(postal_address, '([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})', 'i'))[1],
    company_domain = COALESCE(company_domain, split_part((regexp_match(postal_address, '([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})', 'i'))[1], '@', 2)),
    postal_address = NULL
WHERE COALESCE(NULLIF(TRIM(email), ''), '') = ''
  AND postal_address ~ '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}';
```

**Paso 2:** Contactos que YA tienen email pero postal_address tambien contiene un email (13 registros):
- Si el email en postal_address es distinto al principal, guardarlo en `work_email` o `personal_email` (el que este vacio)
- Limpiar postal_address a NULL

```text
-- Si postal_address tiene email y coincide con email principal, solo limpiar
UPDATE contacts
SET postal_address = NULL
WHERE email IS NOT NULL AND email <> ''
  AND postal_address ~ '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  AND LOWER(TRIM(postal_address)) = LOWER(TRIM(email));

-- Si postal_address tiene email diferente, moverlo a work_email/personal_email
UPDATE contacts
SET work_email = COALESCE(work_email, TRIM(postal_address)),
    postal_address = NULL
WHERE email IS NOT NULL AND email <> ''
  AND postal_address ~ '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  AND LOWER(TRIM(postal_address)) <> LOWER(TRIM(email));
```

### Fase 2: Corregir sanitizeEmailFields en ContactImporter.tsx

Anadir deteccion de email en `postal_address` dentro de la funcion `sanitizeEmailFields` (linea 173-199):

```text
// Nuevo: si postal_address contiene un email, moverlo
if (row.postal_address && EMAIL_REGEX.test(row.postal_address.trim())) {
  if (!row.email) row.email = row.postal_address.trim();
  else if (!row.work_email) row.work_email = row.postal_address.trim();
  row.postal_address = undefined;
}
```

### Fase 3: Corregir saveEdit en ContactProfile.tsx

Anadir deteccion de email en `postal_address` dentro de `saveEdit()` (linea 170-196):

```text
// Nuevo: si postal_address contiene un email, moverlo
if (finalData.postal_address && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(finalData.postal_address.trim())) {
  if (!finalData.email) finalData.email = finalData.postal_address.trim();
  finalData.postal_address = "";
  toast.info("Se detecto un email en Direccion postal. Movido a Email.");
}
```

### Fase 4: Listener en tiempo real para el campo postal_address (ContactProfile.tsx)

En el input de "Direccion postal" (linea 476), anadir deteccion reactiva igual que el campo "Dominio empresa" ya tiene:

```text
<Input value={editData.postal_address} onChange={(e) => {
  const v = e.target.value;
  if (v.includes("@") && EMAIL_REGEX.test(v.trim())) {
    setEditData({ ...editData, email: editData.email || v.trim(), postal_address: "" });
    toast.info("Se detecto un email en Direccion postal. Movido a Email.");
  } else {
    setEditData({ ...editData, postal_address: v });
  }
}} />
```

### Fase 5: Misma validacion en formulario de creacion (Contacts.tsx)

En el input de "Direccion postal" (linea 363), anadir deteccion reactiva.
Tambien en la funcion `create()`, anadir validacion antes de guardar.

### Fase 6: Ampliar quickFixEmail y bulkFixEmails (Contacts.tsx)

Actualmente `quickFixEmail` solo busca en `work_email` y `personal_email`. Anadir `postal_address` como fuente adicional con deteccion regex:

```text
const quickFixEmail = async (c: Contact) => {
  const fallback = c.work_email || c.personal_email
    || (c.postal_address && EMAIL_REGEX.test(c.postal_address.trim()) ? c.postal_address.trim() : null);
  // ... resto igual, pero tambien limpiar postal_address si fue la fuente
};
```

Misma logica para `bulkFixEmails`.

### Fase 7: Ampliar condicion del boton "Corregir email" en Kanban y Lista

Actualmente el boton solo aparece si `work_email || personal_email` existe. Anadir condicion para postal_address con email:

```text
// Funcion helper
const hasRecoverableEmail = (c: Contact) =>
  !!(c.work_email || c.personal_email ||
    (c.postal_address && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(c.postal_address.trim())));
```

---

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| Migracion SQL | UPDATE de 92 contactos (postal_address a email) + limpieza de 13 con postal_address duplicada |
| `src/components/contacts/ContactImporter.tsx` | Anadir postal_address a sanitizeEmailFields (3 lineas) |
| `src/components/contacts/ContactProfile.tsx` | Deteccion en saveEdit + listener reactivo en input postal_address |
| `src/pages/Contacts.tsx` | Validacion en create(), listener en input postal_address, ampliar quickFixEmail/bulkFixEmails, ampliar condicion del boton Corregir |

### Resultado esperado

- **92 contactos** recuperan su email inmediatamente tras la migracion
- **13 contactos** se limpian (postal_address deja de contener emails duplicados)
- **105 correcciones totales** en la base de datos
- Futuras importaciones con emails en columna "address" se interceptan automaticamente
- Formularios de edicion/creacion detectan emails escritos en Direccion postal en tiempo real
- Boton "Corregir email" aparece para contactos con email atrapado en postal_address

