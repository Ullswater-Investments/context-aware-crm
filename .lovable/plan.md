

## Plan: Importar 48 contactos de Hunter con soporte para contactos sin nombre

### Problemas detectados en el CSV

El archivo `48-leads-2026-02-25.csv` es una exportacion de Hunter.io con 48 filas. Hay dos problemas:

#### 1. ~15 contactos sin nombre personal (CRITICO)

Filas como la 15, 17-21, 23-25, 27-28, 31-32, 34-35 tienen las columnas "First name", "Last name" y "Full name" vacias. Solo tienen empresa + email. El importador actual los descarta en la linea 172:

```text
if (!full_name) return null;  // <-- estos 15 contactos se pierden
```

**Solucion**: Agregar fallback para contactos sin nombre:
1. Si hay empresa, usar el nombre de la empresa como nombre del contacto (ej: "ASPACE Zaragoza")
2. Si no hay empresa, extraer nombre del prefijo del email (ej: "carolinalopez@..." -> "Carolinalopez")

#### 2. Patrones de columna que faltan para Hunter

| Columna CSV | Estado actual | Solucion |
|---|---|---|
| `Full name` (con espacio) | No reconocido como exact match | Agregar "full name" al patron `full_name` |
| `Email address` | Funciona via includes pero no es exact | Agregar "email address" al patron `email` |
| `Phone number` | Funciona via includes pero no es exact | Agregar "phone number" al patron `phone` |
| `Company Country` | Se confunde con "Country" via includes | Ya hay columna "Country" que se mapea correctamente |
| `Department` | No mapeado | Agregar como tag adicional |
| `Company size` / `Company Type` | No mapeados | Agregar a notas de la organizacion |

### Cambios en `src/components/contacts/ContactImporter.tsx`

1. **Agregar patrones exactos**: "full name", "email address", "phone number" a sus respectivos arrays
2. **Fallback para contactos sin nombre**: Si `full_name` queda vacio despues de intentar first+last y full_name, usar nombre de empresa; si tampoco hay empresa, usar prefijo del email
3. **Mapear Department**: Detectar columna "department" y agregarlo como tag
4. **Mapear Company Size y Company Type**: Detectar estas columnas y agregarlas a las notas de la organizacion creada

### Resultado esperado

Los 48 contactos del CSV se importaran con:
- Nombre (persona o empresa como fallback)
- Email verificado de Hunter
- Empresa con website, sector, tamano y tipo
- LinkedIn URL cuando disponible
- Cargo (Job title) cuando disponible
- Ubicacion (City, Country)
- Tags con industria y departamento

### Archivos a modificar

1. **`src/components/contacts/ContactImporter.tsx`** - Agregar patrones, fallback de nombre, y mapeo de department/company size/type

