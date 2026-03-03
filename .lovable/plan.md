

## Crear secciones separadas: "Contactos Clínicas Dentales" y "Contactos Veterinarios"

### Enfoque

Añadir una columna `category` a la tabla `contacts` para distinguir tipos de contactos. Parametrizar el componente `Contacts.tsx` con una prop `category` que filtre las queries. Crear un wrapper para veterinarios y actualizar sidebar y rutas.

### Cambios

#### 1. Migración SQL
```sql
ALTER TABLE contacts ADD COLUMN category text NOT NULL DEFAULT 'dental_clinics';
```
Todos los contactos existentes quedan como `dental_clinics`.

#### 2. `src/types/contact.ts`
Añadir `category?: string` al tipo `Contact`.

#### 3. `src/pages/Contacts.tsx`
- Añadir prop `category` con default `'dental_clinics'`
- Filtrar la query `load()` con `.eq('category', category)`
- Al crear contactos nuevos, incluir `category` en el insert

#### 4. `src/pages/ContactsVeterinary.tsx` (nuevo)
Wrapper simple:
```typescript
import Contacts from "./Contacts";
export default function ContactsVeterinary() {
  return <Contacts category="veterinary" />;
}
```

#### 5. `src/components/layout/AppLayout.tsx`
- Renombrar entrada "Contactos" → "Clínicas Dentales" (ruta `/contacts`)
- Añadir nueva entrada "Veterinarios" (ruta `/contacts-veterinary`) debajo

#### 6. `src/App.tsx`
Añadir ruta `/contacts-veterinary` → `<ContactsVeterinary />`

### Archivos afectados

| Archivo | Cambio |
|---|---|
| Migración SQL | Columna `category` en `contacts` |
| `src/types/contact.ts` | Añadir `category?: string` |
| `src/pages/Contacts.tsx` | Prop `category`, filtro en query e insert |
| `src/pages/ContactsVeterinary.tsx` | Nuevo wrapper |
| `src/components/layout/AppLayout.tsx` | Renombrar + nueva entrada |
| `src/App.tsx` | Nueva ruta |

