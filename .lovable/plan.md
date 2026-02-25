

## Plan: Añadir campo "Company URL" al perfil de contacto

### Problema
El formulario de edicion del perfil de contacto (`ContactProfile.tsx`) no incluye el campo `company_domain`, por lo que no se puede añadir ni editar la URL de la empresa desde el perfil. Esto es necesario para que Hunter.io pueda funcionar correctamente (necesita un dominio).

### Cambios en `src/components/contacts/ContactProfile.tsx`

1. **Añadir `company_domain` al estado `editData`** (linea 88): incluir el campo en el objeto inicial y en `startEdit()` (linea 113-123)

2. **Añadir campo de edicion** (despues del campo LinkedIn, linea 294): nuevo input con Label "Dominio empresa" y placeholder "empresa.com"

3. **Incluir `company_domain` en `saveEdit()`** (linea 125-138): enviar el campo en el update a la base de datos

4. **Mostrar `company_domain` en la vista de lectura** (despues del enlace LinkedIn, linea 318): enlace clicable con icono Globe que muestra el dominio y abre la URL

### Detalle de cada cambio

- `editData` pasa de `{ full_name, email, phone, position, linkedin_url }` a incluir `company_domain`
- En `startEdit()`, se inicializa con `contact.company_domain || ""`
- En `saveEdit()`, se envia `company_domain: editData.company_domain || null`
- En la vista de lectura, se renderiza como enlace con `target="_blank"` y `rel="noopener noreferrer"`

No se necesitan cambios en la pagina de Contactos (`Contacts.tsx`) ni en la base de datos, ya que el campo `company_domain` ya existe en la tabla y ya se muestra en las tarjetas de las vistas Kanban y Lista.

