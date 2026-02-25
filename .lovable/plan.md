

## Plan: Añadir dirección postal a contactos

### 1. Migración de base de datos

Añadir columna `postal_address` (text, nullable) a la tabla `contacts`:

```text
ALTER TABLE public.contacts ADD COLUMN postal_address text;
```

### 2. Actualizar tipo Contact

En `src/types/contact.ts`, añadir `postal_address?: string | null` al interface.

### 3. Actualizar tarjetas Kanban (`src/pages/Contacts.tsx`)

- Importar icono `MapPin` de lucide-react
- Mostrar la dirección postal en cada tarjeta de contacto (tanto vista Kanban como Lista), debajo del teléfono, con icono MapPin
- Añadir campo "Dirección postal" al formulario de nuevo contacto

### 4. Actualizar perfil de contacto (`src/components/contacts/ContactProfile.tsx`)

- Mostrar dirección postal en la sección de información (con icono MapPin)
- Añadir campo "Dirección postal" al formulario de edición
- Incluir `postal_address` en `editData` y en `saveEdit`

### 5. Actualizar importador (`src/components/contacts/ContactImporter.tsx`)

- Añadir patrones de columna para dirección postal: "dirección", "direccion", "address", "postal", "sede"
- Mapear al campo `postal_address` en la inserción

### 6. Script de actualización masiva

Crear una migración SQL que actualice los contactos existentes con las direcciones postales proporcionadas, haciendo match por `full_name`. Se usará un bloque UPDATE con CASE/WHEN para todos los contactos de la lista:

```text
UPDATE public.contacts SET postal_address = CASE
  WHEN full_name ILIKE 'Marta Bilbao' THEN 'C. de la Basílica, 17, 28020 Madrid, España'
  WHEN full_name ILIKE 'Esperanza Gross Trujillo' THEN 'Peter Merian-Weg 12, 4002 Basilea, Suiza / Alcobendas, Madrid'
  ... (todos los contactos de la lista con dirección válida)
END
WHERE full_name ILIKE ANY(ARRAY['Marta Bilbao', 'Esperanza Gross Trujillo', ...]);
```

Se excluirán los contactos cuya dirección sea "No disponible públicamente" o "Requiere búsqueda local".

### Archivos a crear/modificar

1. **Migración SQL** -- añadir columna `postal_address` + actualización masiva de datos
2. **`src/types/contact.ts`** -- añadir campo `postal_address`
3. **`src/pages/Contacts.tsx`** -- mostrar dirección en tarjetas + campo en formulario
4. **`src/components/contacts/ContactProfile.tsx`** -- mostrar y editar dirección postal
5. **`src/components/contacts/ContactImporter.tsx`** -- soporte para importar dirección postal

