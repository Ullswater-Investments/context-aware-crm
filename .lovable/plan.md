

## Plan: Añadir botón Hunter.io junto a cada URL de empresa en las tarjetas de contacto

### Objetivo
Colocar un botón "Hunter.io" al lado de cada enlace de `company_domain` en las vistas Kanban y Lista, para poder buscar emails del contacto a través de su dominio de empresa sin necesidad de abrir el perfil.

### Cambios en `src/pages/Contacts.tsx`

#### 1. Añadir imports necesarios
- Importar `Loader2` de lucide-react (para el spinner de carga)
- Importar `supabase` ya está importado

#### 2. Añadir estado para rastrear qué contacto se está enriqueciendo
- Nuevo estado `enrichingId` (string | null) para saber qué contacto está siendo procesado

#### 3. Crear función `enrichWithHunter(contactId, fullName, companyDomain)`
- Llama a la edge function `enrich-hunter-contact` pasando `contact_id` y el `email` (que se buscará usando el nombre + dominio)
- Nota: La edge function actual espera un `email`, pero Hunter.io también tiene un endpoint de Domain Search y Email Finder por nombre+dominio. Se necesita actualizar la edge function para aceptar también `domain` + `full_name` como alternativa al `email`.
- Muestra toast de éxito/error
- Recarga los contactos al terminar

#### 4. Actualizar la edge function `enrich-hunter-contact`
- Añadir soporte para recibir `domain` y `full_name` además de `email`
- Si se recibe `domain` + `full_name`, usar el endpoint **Email Finder** de Hunter.io: `https://api.hunter.io/v2/email-finder?domain={domain}&first_name={first}&last_name={last}&api_key={key}`
- Este endpoint devuelve el email encontrado + datos del contacto
- Si se recibe `email`, mantener el comportamiento actual (Email Verifier)

#### 5. Modificar la vista Kanban (líneas 331-335)
Donde actualmente se muestra el `company_domain` como enlace, añadir un botón Hunter.io al lado:

```text
[Globe icon] empresa.com  [botón Hunter.io]
```

- El botón solo aparece si `hunter_status` es "pending" (no re-enriquecer)
- Click en el botón llama a `enrichWithHunter` y detiene la propagación del evento (para no abrir el perfil)
- Muestra spinner mientras se está procesando

#### 6. Modificar la vista Lista (líneas 408-412)
Misma lógica: añadir botón Hunter.io junto al enlace del dominio.

#### 7. Actualizar la interfaz Contact
- Añadir `hunter_status` al interface Contact (actualmente falta)

### Detalle técnico de la edge function actualizada

La función recibirá uno de estos dos escenarios:
- `{ contact_id, email }` -> Verificar email existente (comportamiento actual)
- `{ contact_id, domain, full_name }` -> Buscar email por nombre y dominio usando Email Finder de Hunter.io

El endpoint Email Finder (`/v2/email-finder`) acepta:
- `domain`: dominio de la empresa
- `first_name` y `last_name`: nombre del contacto
- Devuelve: email encontrado, score de confianza, posición, LinkedIn, etc.

### Archivos a modificar
1. `src/pages/Contacts.tsx` - Añadir botón, estado, función de enriquecimiento, y `hunter_status` al interface
2. `supabase/functions/enrich-hunter-contact/index.ts` - Soportar búsqueda por dominio + nombre

