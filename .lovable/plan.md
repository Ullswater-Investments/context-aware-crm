

## Plan: Importar contactos con datos completos desde los 3 CSVs

### Analisis de los archivos

Tienes 3 archivos CSV con 25 contactos del sector Healthcare:

1. **Export_User_Data_2026-02-25.csv** - Datos de Lusha con emails, telefonos, LinkedIn (25 contactos, DATOS COMPLETOS)
2. **Export_User_Data_2026-02-25_1.csv** - Mismos contactos SIN emails/telefonos (redundante, se ignora)
3. **Export_Contacts_2026-02-25.csv** - Datos de Apollo con emails, telefonos, empresa, dominio, descripcion (186 contactos, DATOS COMPLETOS)

El archivo 1 y 3 se solapan parcialmente (los mismos 25 contactos aparecen en ambos, pero el archivo 3 tiene 161 contactos adicionales + datos de empresa mas ricos).

### Estrategia

1. **Combinar archivos 1 y 3** - El archivo 3 (Apollo) sera la fuente principal ya que tiene 186 contactos con datos de empresa. El archivo 1 (Lusha) tiene datos adicionales como "Work email 2", "Mobile 2", "Private email" para los 25 contactos compartidos.
2. **Ignorar archivo 2** - Es una version vacia del archivo 1.
3. **Deduplicar por nombre** antes de insertar.

### Cambios en el importador

**`src/components/contacts/ContactImporter.tsx`**

Ampliar el `ParsedRow` y el `mapColumns` para reconocer las columnas de Lusha y Apollo:

| Columna CSV | Campo en BD |
|---|---|
| Contact name / First Name + Last Name | full_name |
| Work email / Work Email | work_email + email (principal) |
| Work email 2 / Additional Email 1 | personal_email |
| Private email / Direct Email | personal_email |
| Mobile / Phone 1 (mobile) | mobile_phone |
| Direct phone / Phone 1 (direct) | work_phone |
| Mobile 2 / Phone 2 | phone (secundario) |
| Job title / Job Title | position |
| Contact LI / LinkedIn URL | linkedin_url |
| Company name / Company Name | organization lookup |
| Company Domain | company_domain |
| Industry / Company Main Industry | tags[] |
| Sub industry / Company Sub Industry | tags[] |
| Company Website | organization.website |
| Company Description | organization.notes |

Tambien actualizar la creacion de organizaciones para incluir `website`, `sector` y `notes` cuando esten disponibles.

### Flujo de importacion

1. Se procesan primero los 186 contactos de Apollo (archivo 3) que tiene datos mas ricos
2. Se procesan los 25 de Lusha (archivo 1) haciendo merge por nombre con los ya importados
3. Si un contacto ya existe (mismo nombre), se actualizan los campos vacios con los nuevos datos (upsert)

### Implementacion concreta

Dado que la importacion se hara directamente por codigo (no via UI), el plan es:

1. **Actualizar `ContactImporter.tsx`** - Ampliar mapColumns y ParsedRow para soportar todos los campos nuevos (linkedin_url, work_email, personal_email, mobile_phone, work_phone, company_domain)
2. **Mejorar la logica de insert** - Incluir todos los campos en el insert a la tabla contacts
3. **Enriquecer organizaciones** - Al crear organizaciones, incluir website, sector y notes si estan disponibles en el CSV
4. **Añadir upsert por nombre** - Si ya existe un contacto con el mismo nombre, actualizar los campos que esten vacios en lugar de crear un duplicado
5. **Ejecutar la importacion** - Importar los 3 archivos programaticamente: primero el de Apollo (186 contactos), luego el de Lusha (25 con datos adicionales)

### Archivos a modificar

1. **`src/components/contacts/ContactImporter.tsx`** - Ampliar ParsedRow, mapColumns, parseRows y la logica de insert para soportar todos los campos
2. **`src/pages/Contacts.tsx`** - No requiere cambios, ya muestra todos los campos

### Detalles tecnicos

**Nuevos patrones de columnas en mapColumns:**

```text
linkedin: ["contact li", "linkedin url", "linkedin", "li"]
work_email: ["work email", "work_email"]  
personal_email: ["private email", "direct email", "personal email", "additional email"]
mobile_phone: ["mobile", "móvil"]
work_phone: ["direct phone", "work phone"]
company_domain: ["company domain", "domain", "dominio"]
company_website: ["company website", "website"]
company_description: ["company description"]
```

**Logica de upsert:**

```text
1. Buscar contacto existente por full_name (case-insensitive)
2. Si existe: UPDATE solo campos que son null/vacios en el registro existente
3. Si no existe: INSERT normal con todos los datos
```

**Resultado esperado:** ~186 contactos nuevos del archivo Apollo + actualizacion de los 25 comunes con datos adicionales de Lusha = todos los contactos con email, telefono, LinkedIn, empresa y dominio completos.
