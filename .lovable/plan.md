

## Nueva lista de contactos: "Agentes Digitalizadores"

### Resumen

Crear una nueva categoría de contactos `digital_agents` siguiendo exactamente el mismo patrón que `dental_clinics` y `veterinary`. Ademas, importar los ~380 contactos del Excel proporcionado.

### Cambios

#### 1. Nueva página `ContactsDigitalAgents.tsx`

Fichero idéntico a `ContactsVeterinary.tsx`:

```tsx
import Contacts from "./Contacts";
export default function ContactsDigitalAgents() {
  return <Contacts category="digital_agents" />;
}
```

#### 2. Ruta en `App.tsx`

Agregar:
- Import de `ContactsDigitalAgents`
- Route: `/contacts-digital-agents`

#### 3. Sidebar en `AppLayout.tsx`

Agregar nuevo item en `navItems` despues de "Veterinarios":
```ts
{ to: "/contacts-digital-agents", icon: Users, label: "Agentes Digitalizadores" }
```

#### 4. Importación masiva de los ~380 contactos del Excel

Crear un script de importacion en una Edge Function temporal `import-digital-agents` que:
- Reciba los datos parseados del Excel (Nombre, Municipio, Código Postal, Página Web)
- Mapee los campos:
  - `full_name` ← Nombre
  - `postal_address` ← Municipio + Código Postal
  - `company_domain` ← dominio extraído de la Página Web
  - `category` ← `'digital_agents'`
  - `status` ← `'new_lead'`
- Inserte en la tabla `contacts`

**Alternativa mas simple**: Hacer la importación directamente desde el frontend usando el componente `ContactImporter` ya existente, pero dado que el Excel ya esta parseado, se puede hacer una inserción directa via Edge Function o directamente en el componente de la nueva página.

**Enfoque elegido**: Crear la pagina y ruta, y luego hacer la importacion via un script en el frontend que parsee el Excel y haga bulk insert, reutilizando la infraestructura existente (xlsx library ya instalada). El usuario podra usar el ContactImporter existente para cargar el archivo.

### Archivos a crear/modificar

| Archivo | Acción |
|---|---|
| `src/pages/ContactsDigitalAgents.tsx` | Nuevo (3 líneas) |
| `src/App.tsx` | Agregar import + ruta |
| `src/components/layout/AppLayout.tsx` | Agregar item en sidebar |

### Importación de datos

El usuario puede usar el botón de importar CSV/XLSX que ya existe en la página de contactos para cargar el archivo Excel directamente. Los campos se mapearán como:
- **Nombre** → `full_name`
- **Municipio** → `postal_address` 
- **Página Web** → `company_domain` (extrayendo dominio)

No se necesita Edge Function adicional; el `ContactImporter` existente ya soporta XLSX.

