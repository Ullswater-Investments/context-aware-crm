

## Plan: Agregar boton "Enriquecer con Hunter.io" en el perfil de contacto

### Objetivo
Anadir un boton similar al de Lusha que use la API Combined Find de Hunter.io para enriquecer el contacto con datos profesionales (email, telefono, cargo, LinkedIn) y guardarlos en la base de datos.

### Cambios

#### 1. Nueva edge function: `supabase/functions/enrich-hunter-contact/index.ts`
Crear una funcion dedicada que:
- Reciba `contact_id` y `email` del contacto
- Llame a `https://api.hunter.io/v2/combined/find?email=...` usando la HUNTER_API_KEY ya configurada
- Extraiga: position, linkedin_url, phone_number, company (domain), y datos de verificacion
- Actualice el contacto en la base de datos con los campos enriquecidos:
  - `work_email` (si el email verificado es valido)
  - `work_phone` (si hay phone_number)
  - `linkedin_url` (si existe y no tenia ya)
  - `position` (si existe y no tenia ya)
  - `company_domain` (si existe)
  - `hunter_status` = "enriched" o "not_found"
  - `last_enriched_at` = timestamp actual

#### 2. Migracion de base de datos
Agregar columna `hunter_status` (text, default 'pending') a la tabla `contacts` para rastrear el estado de enriquecimiento con Hunter independientemente de Lusha.

#### 3. Cambios en `src/components/contacts/ContactProfile.tsx`
- Agregar estado `enrichingHunter` (boolean)
- Agregar funcion `enrichWithHunter` que:
  - Requiere que el contacto tenga email (obligatorio para Combined Find)
  - Invoca la nueva edge function `enrich-hunter-contact`
  - Muestra toast de exito/error segun resultado
- Agregar un boton "Enriquecer con Hunter.io" debajo del boton de Lusha, con icono de Search/Globe
  - Solo visible si `hunter_status === "pending"` y el contacto tiene email
  - Estilo similar al de Lusha pero con diferente icono
- Agregar badge de estado Hunter junto al de Lusha en el header
- Actualizar la interfaz Contact para incluir `hunter_status`

### Detalles tecnicos

- La edge function reutiliza la misma HUNTER_API_KEY que ya esta configurada como secret
- Se usa `combined-find` que devuelve persona + verificacion en una sola llamada
- Si el contacto no tiene email, el boton de Hunter no aparece (la API lo requiere)
- Los datos de Hunter se guardan en los mismos campos que Lusha (work_email, work_phone, etc.) solo si estan vacios, para no sobreescribir datos existentes

