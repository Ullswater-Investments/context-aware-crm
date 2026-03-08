

## Importación directa de contactos "Agentes Digitalizadores" desde el Excel

### Problema actual

1. El título de la página `Contacts.tsx` solo distingue entre `veterinary` y `dental_clinics` — no muestra "Agentes Digitalizadores" para `digital_agents`.
2. El `ContactImporter` no pasa la `category` al insertar contactos — todos se crean como `dental_clinics` (valor por defecto de la columna).
3. El Excel tiene columnas: **Nombre** (empresa), **Municipio**, **Código Postal**, **Página Web** — que no coinciden exactamente con los patrones del mapeo automático.

### Cambios necesarios

#### 1. Actualizar título en `Contacts.tsx` (línea 455)

Cambiar el ternario simple a un mapa de títulos que incluya `digital_agents` → "Contactos Agentes Digitalizadores".

#### 2. Pasar `category` al `ContactImporter`

- Añadir prop `category` a `ContactImporterProps`
- En el `insert` de contactos (línea 468-483), incluir `category` en el payload
- Pasar `category` desde `Contacts.tsx` al componente `<ContactImporter>`

#### 3. Mejorar mapeo de columnas del Excel

Añadir al `mapColumns`:
- `"nombre"` como patrón para `full_name` (ya existe como first_name, pero no como nombre completo de empresa)
- `"municipio"` como patrón para `postal_address`
- `"código postal"` / `"codigo postal"` como auxiliar para `postal_address`
- `"página web"` / `"pagina web"` como patrón para `company_website`

Combinar Municipio + Código Postal en `postal_address` durante el parseo.

Extraer dominio de la URL en `company_domain`.

#### 4. Extraer dominio desde `company_website` en `parseRows`

Después del parseo, si hay `company_website` pero no `company_domain`, extraer el dominio limpio (sin www, sin path).

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/pages/Contacts.tsx` | Título dinámico + pasar `category` al importer |
| `src/components/contacts/ContactImporter.tsx` | Aceptar prop `category`, incluir en insert, mejorar mapeo de columnas |

### Resultado esperado

El usuario abre "Agentes Digitalizadores", pulsa "Importar", sube el Excel, y los ~380 contactos se crean con:
- `full_name` = Nombre (empresa)
- `postal_address` = Municipio + Código Postal
- `company_domain` = dominio extraído de Página Web
- `company_website` = URL completa
- `category` = `digital_agents`
- `status` = `new_lead`

Luego puede usar Enriquecer Todos para buscar emails/teléfonos via Lusha, Hunter, Apollo, Findymail.

