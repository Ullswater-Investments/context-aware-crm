

## Plan: Crear nuevos contactos con direcciones postales

### Contexto
De la lista proporcionada con ~95 contactos, solo 2 (Alicia Cervera del Rio y Angela Paredes) ya existen en la base de datos. Los demas ~93 contactos necesitan ser creados junto con sus organizaciones.

### Cambios a realizar

#### 1. Migracion SQL para crear organizaciones y contactos

Una unica migracion que:

1. **Crea las organizaciones nuevas** que no existen (Vitaldent, Straumann Group, 3Shape, Henry Schein, etc.) con su `website` y el `created_by` del usuario existente
2. **Inserta los ~93 contactos nuevos** con:
   - `full_name`
   - `organization_id` (vinculado a la organizacion correspondiente)
   - `postal_address` (la direccion postal de la sede)
   - `created_by` del usuario existente
   - `status` = 'new_lead' (por defecto)

Los contactos cuya direccion es "No disponible publicamente" o "Requiere busqueda local" se insertaran con `postal_address = NULL`.

Los contactos que ya existen (Alicia Cervera del Rio, Angela Paredes) ya tienen su direccion postal actualizada, asi que no se tocan.

Se excluiran las entradas que son cuentas de organizacion o invalidas (como "bin zaman foundation", "Equiliqua Centro especializado", "flora luo raised floor").

#### 2. Organizaciones a crear (nuevas)

Se crearan unas ~60 organizaciones nuevas que no existen aun, como: Vitaldent, Straumann Group, Hospital San Carlos Grupo HLA, Dassault Systemes, TURBOdeco, WTC, Moonz Ortodoncia, DONTE GROUP, Laboratorios Indas, Fundacion IDIS, BeCool Publicidad, Henry Schein, etc.

Las organizaciones que ya existen (DONTE GROUP, Grupo Ceosa, W&H Med Iberica, Fenin, Dentsply Sirona) se reutilizaran por su ID existente.

### Archivos a crear

1. **Nueva migracion SQL** -- insertar organizaciones nuevas + insertar contactos nuevos con direcciones postales

### Resultado esperado
Despues de la migracion, la base de datos tendra ~155 contactos (62 existentes + ~93 nuevos) y las tarjetas mostraran la direccion postal con el icono MapPin que ya esta implementado en la UI.
