

## Plan de Saneamiento y Validacion de Emails

### Fase 1: Migracion SQL (remediacion de 94 contactos)

Ejecutar una migracion que:
1. Copie `work_email` a `email` donde `email IS NULL AND work_email IS NOT NULL`
2. Copie `personal_email` a `email` como segundo fallback donde `email IS NULL AND personal_email IS NOT NULL`
3. Extraiga el dominio del email y lo guarde en `company_domain` donde este vacio: `split_part(work_email, '@', 2)`

```text
UPDATE contacts SET email = work_email WHERE email IS NULL AND work_email IS NOT NULL;
UPDATE contacts SET email = personal_email WHERE email IS NULL AND personal_email IS NOT NULL;
UPDATE contacts SET company_domain = split_part(COALESCE(email, work_email), '@', 2) 
  WHERE company_domain IS NULL AND COALESCE(email, work_email) LIKE '%@%';
```

### Fase 2: Prevencion en el importador (`src/components/contacts/ContactImporter.tsx`)

**2a. Funcion `sanitizeEmailFields`**: Antes de construir el registro final en `parseRows()`, una funcion que:
- Reciba el objeto ParsedRow
- Use regex `/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/` para detectar emails
- Si `company_domain` contiene `@`, extraiga solo el dominio y mueva el valor completo a `email` si esta vacio
- Fallback: si `email` queda vacio pero `work_email` o `personal_email` tienen valor, copie al campo `email`
- Extraiga automaticamente `company_domain` del email si esta vacio

**2b. Aplicar en la linea 241-261** del return de `parseRows()`: llamar a `sanitizeEmailFields()` sobre el objeto antes de retornarlo.

**2c. Aplicar en la insercion (linea 417)**: asegurar que `email` siempre tenga valor si hay algun email disponible: `email: row.email || row.work_email || row.personal_email || null`

### Fase 3: Validacion en formulario de edicion (`src/components/contacts/ContactProfile.tsx`)

**3a. Validacion en `saveEdit()`**: Antes de guardar, si `editData.email` esta vacio pero `editData.work_email` o `editData.personal_email` tienen valor, copiar automaticamente al campo principal con un toast informativo.

**3b. Deteccion de email en campo dominio**: En el handler de `company_domain` (linea 440), si el valor contiene `@`, mostrar toast de aviso y mover automaticamente el valor al campo `email`, dejando solo el dominio en `company_domain`.

### Fase 4: Correccion rapida en Kanban (`src/pages/Contacts.tsx`)

**4a. Alerta visual**: Donde aparece "Sin email" (lineas 423-424), si el contacto tiene `work_email` o `personal_email`, mostrar un boton de correccion rapida con icono `Zap` (rayo) en lugar del texto "Sin email".

**4b. Funcion `quickFixEmail`**: Al hacer clic, ejecuta un `UPDATE` que copia `work_email` o `personal_email` al campo `email` y recarga la lista.

**4c. Mismo tratamiento en vista Lista** (linea 520-521).

### Archivos a modificar

| Archivo | Cambios |
|---|---|
| Migracion SQL | 3 sentencias UPDATE para sanear 94+ contactos y extraer dominios |
| `src/components/contacts/ContactImporter.tsx` | Funcion `sanitizeEmailFields`, fallback en insert, deteccion de @ en company_domain |
| `src/components/contacts/ContactProfile.tsx` | Validacion en saveEdit, deteccion de @ en campo dominio |
| `src/pages/Contacts.tsx` | Boton "Correccion rapida" con icono Zap en Kanban y Lista cuando hay email disponible en campo secundario |

### Resultado esperado

- 94 contactos corregidos inmediatamente tras la migracion
- Importaciones futuras nunca dejaran `email` vacio si hay datos en `work_email`/`personal_email`
- Errores de escritura en formularios se corrigen en tiempo real
- Tarjetas Kanban ofrecen correccion con un clic para casos residuales

