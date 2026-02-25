

## Plan: Integrar boton Apollo.io para enriquecimiento de contactos

### Contexto
Siguiendo el mismo patron que Lusha y Hunter.io, vamos a añadir Apollo.io como tercera fuente de enriquecimiento de contactos. Apollo.io usa su **People Enrichment API** (`POST https://api.apollo.io/api/v1/people/match`) que acepta nombre, dominio, email o LinkedIn URL para devolver datos completos del contacto.

---

### 1. Configurar el API Key de Apollo.io

Se necesita un secret `APOLLO_API_KEY` en el proyecto. Se pedira al usuario que lo introduzca antes de implementar.

### 2. Migracion de base de datos

Añadir columna `apollo_status` a la tabla `contacts`:

```text
ALTER TABLE contacts ADD COLUMN apollo_status text NOT NULL DEFAULT 'pending';
```

### 3. Nueva Edge Function: `supabase/functions/enrich-apollo-contact/index.ts`

Seguira exactamente el mismo patron que `enrich-hunter-contact` y `enrich-lusha-contact`:

- **CORS headers** + manejo OPTIONS
- **Validacion JWT** con `supabase.auth.getClaims(token)`
- **Verificacion de propiedad**: comprobar que `created_by === userId`
- **Llamada a Apollo API**: `POST https://api.apollo.io/api/v1/people/match` con parametros:
  - `first_name`, `last_name` (del nombre completo)
  - `domain` (del `company_domain`)
  - `email` (si disponible)
  - `linkedin_url` (si disponible)
  - `reveal_personal_emails: true`
  - `reveal_phone_number: true`
- **Actualizar contacto** con datos obtenidos:
  - `work_email` (email corporativo)
  - `personal_email` (email personal)
  - `mobile_phone` (telefono movil)
  - `work_phone` (telefono trabajo)
  - `position` (cargo/titulo)
  - `linkedin_url` (si no tenia)
  - `company_domain` (si no tenia)
  - `apollo_status`: "enriched" o "not_found"
  - `last_enriched_at`: timestamp actual
- Solo sobreescribe campos que esten vacios (no pisa datos existentes)

### 4. Registrar en `supabase/config.toml`

```text
[functions.enrich-apollo-contact]
verify_jwt = false
```

### 5. Actualizar interfaz `src/types/contact.ts`

Añadir campo `apollo_status` al interface Contact.

### 6. Actualizar `src/pages/Contacts.tsx`

Siguiendo el patron exacto de Hunter:

- **Nuevo estado**: `enrichingApolloId` (string | null)
- **Nueva funcion**: `enrichWithApollo(contactId, fullName, companyDomain, email, linkedinUrl)` que valida el dominio e invoca la edge function
- **Vista Kanban**: Boton "Apollo" junto al dominio de empresa (al lado del boton Hunter existente), visible cuando `apollo_status` es "pending" o "not_found"
- **Vista Lista**: Mismo boton Apollo en las filas de la tabla
- **Nuevo filtro**: Selector "Apollo" con opciones Pending/Enriched/Not Found (junto a los filtros Lusha y Hunter existentes)
- **Badge visual**: Icono de estado Apollo (verde=enriched, naranja=not_found) en las tarjetas

### 7. Actualizar `src/components/contacts/ContactProfile.tsx`

- Añadir badge de estado Apollo en la cabecera (junto a Lusha y Hunter)
- Boton "Enriquecer con Apollo.io" cuando `apollo_status` es "pending" o "not_found"
- La funcion `enrichWithApollo` enviara todos los datos disponibles (nombre, email, dominio, linkedin) para maximizar la precision

### 8. Actualizar `supabase/functions/chat/index.ts`

Añadir Apollo.io como opcion en las herramientas del chat para que el asistente pueda enriquecer contactos con Apollo cuando el usuario lo solicite.

---

### Detalle tecnico de la API de Apollo.io

```text
POST https://api.apollo.io/api/v1/people/match

Headers:
  Content-Type: application/json
  x-api-key: {APOLLO_API_KEY}

Body:
{
  "first_name": "Juan",
  "last_name": "Garcia",
  "domain": "empresa.com",
  "email": "juan@empresa.com",       // opcional
  "linkedin_url": "https://...",      // opcional
  "reveal_personal_emails": true,
  "reveal_phone_number": true
}

Response: {
  "person": {
    "email": "...",
    "title": "Director Comercial",
    "linkedin_url": "...",
    "phone_numbers": [...],
    "personal_emails": [...],
    "organization": { "primary_domain": "..." }
  }
}
```

### Archivos a crear/modificar

1. `supabase/functions/enrich-apollo-contact/index.ts` -- nueva edge function
2. `src/types/contact.ts` -- añadir `apollo_status`
3. `src/pages/Contacts.tsx` -- boton Apollo, filtro, badge
4. `src/components/contacts/ContactProfile.tsx` -- boton y badge Apollo en perfil
5. `supabase/functions/chat/index.ts` -- tool de enriquecimiento Apollo
6. Migracion SQL -- columna `apollo_status`

### Prerequisito

Se necesita que el usuario proporcione su `APOLLO_API_KEY` antes de implementar. Se solicitara con la herramienta de secrets.

