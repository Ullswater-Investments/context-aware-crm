

## Plan: Importar 162 contactos de Apollo con mapeo corregido

### Problemas de mapeo detectados

El CSV tiene columnas que el importador actual NO reconoce correctamente:

| Columna CSV | Problema | Solucion |
|---|---|---|
| `Title` | No coincide con "titulo" (con acento) ni "job title" | Agregar "title" al patron de `position` |
| `Secondary Email` | No esta en los patrones de `personal_email` | Agregar "secondary email" al patron |
| `Website` | Solo busca "company website", no "website" solo | Agregar "website" al patron de `company_website` |
| `Corporate Phone` | Se captura como `phone` generico pero se puede perder | Agregar "corporate phone" al patron de `phone` |
| `City` + `State` + `Country` | No se combinan en `postal_address` | Agregar logica para componer direccion desde estas columnas |
| `Company Address` | No se mapea a nada | Agregar "company address" como direccion de la organizacion |
| `Industry` | Funciona pero `Keywords` se pierde | Agregar "keywords" al patron de `sector` para tags mas ricos |

### Cambios en `src/components/contacts/ContactImporter.tsx`

1. **Ampliar patrones de columnas:**
   - `position`: agregar "title"
   - `personal_email`: agregar "secondary email"
   - `company_website`: agregar "website" (con exclusion para no confundir con "company website")
   - `phone`: agregar "corporate phone"

2. **Agregar composicion de direccion postal:**
   - Detectar columnas `City`, `State`, `Country`
   - Si `postal_address` no se mapeo directamente, componer desde City + State + Country
   - Mapear `Company Address` a la direccion de la organizacion

3. **Mapear `Keywords` a tags adicionales:**
   - Si hay columna `Keywords`, extraer los primeros 5 keywords relevantes y agregarlos como tags

### Resultado esperado

162 nuevos contactos con:
- Nombre completo (First Name + Last Name)
- Email verificado de Apollo
- Email secundario cuando disponible
- Telefono corporativo, movil y directo
- LinkedIn URL
- Cargo/posicion
- Empresa con website, sector y descripcion
- Ubicacion (Ciudad, Pais)
- Tags con industria y keywords

### Archivos a modificar

1. **`src/components/contacts/ContactImporter.tsx`** - Corregir patrones de mapeo, agregar composicion de direccion y keywords
