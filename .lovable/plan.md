

## Plan: Formulario completo de nuevo contacto + Documentos adjuntos en perfil

### Problema detectado

1. **Contactos de los CSVs no importados**: Los 186 contactos de Apollo y 25 de Lusha que subiste **nunca se importaron** a la base de datos. Solo existen los 333 contactos anteriores, la mayoria sin email ni telefono. Para importarlos, necesitas usar el boton "Importar" en la pagina de Contactos y subir primero el archivo Apollo (`Export_Contacts_2026-02-25.csv`) y luego el de Lusha (`Export_User_Data_2026-02-25.csv`).

2. **Formulario "Nuevo contacto" incompleto**: El formulario actual solo captura 8 campos (nombre, email, telefono, cargo, empresa, LinkedIn, dominio, direccion). Faltan campos importantes: work_email, personal_email, mobile_phone, work_phone, tags y notas.

3. **No se ven documentos adjuntos en el perfil del contacto**: La tabla `documents` tiene un campo `contact_id` pero el perfil del contacto no muestra ni permite gestionar documentos vinculados.

### Cambios propuestos

#### 1. Ampliar formulario "Nuevo contacto" (`src/pages/Contacts.tsx`)

Agregar los campos que faltan al formulario de creacion:
- Work email (email corporativo)
- Personal email (email personal)
- Mobile phone (movil)
- Work phone (telefono de trabajo)
- Tags (etiquetas, con input tipo chip)
- Notas

Reorganizar el formulario en 2 columnas para que no sea demasiado largo.

#### 2. Ampliar edicion en perfil (`src/components/contacts/ContactProfile.tsx`)

Actualizar `editData` y `saveEdit` para incluir los nuevos campos (work_email, personal_email, mobile_phone, work_phone) que actualmente no se pueden editar desde el perfil.

#### 3. Seccion de documentos en el perfil del contacto (`src/components/contacts/ContactProfile.tsx`)

Agregar una seccion "Documentos" al perfil que:
- Liste los documentos vinculados al contacto (query por `contact_id`)
- Permita subir nuevos documentos vinculados al contacto
- Permita descargar y eliminar documentos
- Muestre nombre, tipo y fecha del documento

### Archivos a modificar

1. **`src/pages/Contacts.tsx`** - Ampliar formulario de creacion con todos los campos del contacto
2. **`src/components/contacts/ContactProfile.tsx`** - Ampliar campos editables + agregar seccion de documentos adjuntos

### Detalles tecnicos

**Formulario ampliado - campos del state:**
```text
form: {
  full_name, email, phone, position, organization_id,
  linkedin_url, company_domain, postal_address,
  work_email, personal_email, mobile_phone, work_phone  // nuevos
}
```

**Documentos en perfil - query:**
```text
supabase.from("documents")
  .select("*")
  .eq("contact_id", contact.id)
  .order("created_at", { ascending: false })
```

**Upload de documento vinculado:**
```text
1. Subir archivo al bucket "documents" con path: {userId}/{contactId}/{timestamp}_{filename}
2. Insertar registro en tabla documents con contact_id = contact.id
```

No se necesitan cambios en la base de datos ya que la tabla `documents` ya tiene el campo `contact_id` y el bucket `documents` ya existe.

