

## Auditoria: Errores y Mejoras en la Plataforma

### ERRORES ENCONTRADOS

#### 1. CRITICO - Edge Function `enrich-hunter-contact` sin autenticacion
La funcion `enrich-hunter-contact` no verifica el JWT del usuario. Cualquier persona con la URL publica podria llamarla y gastar creditos de Hunter.io o modificar datos de contactos ajenos. Comparando con `enrich-lusha-contact` (que si valida JWT) y `hunter-domain-search` (que tambien valida), esta es la unica funcion de enriquecimiento sin proteccion.

**Solucion**: Añadir validacion JWT igual que en `enrich-lusha-contact`, usando `supabase.auth.getClaims(token)`.

#### 2. CRITICO - Edge Function usa SERVICE_ROLE_KEY sin necesidad de auth
En `enrich-hunter-contact`, se usa `SUPABASE_SERVICE_ROLE_KEY` para hacer el update. Esto bypasea las politicas RLS, lo cual es peligroso sin validacion de usuario. Un atacante podria modificar contactos de cualquier usuario.

**Solucion**: Tras añadir auth, validar que el contacto pertenece al usuario autenticado antes de actualizarlo.

#### 3. ERROR - Boton Hunter en ContactProfile solo funciona con email, no con dominio
En `ContactProfile.tsx` linea 237, `enrichWithHunter` requiere `contact.email` para funcionar. Si un contacto tiene `company_domain` pero no `email`, el boton no aparece (linea 383: `hunterStatus === "pending" && contact.email`). Sin embargo, la edge function ya soporta el modo `domain + full_name`. El perfil no aprovecha esta capacidad.

**Solucion**: Cambiar la condicion a `(contact.email || contact.company_domain)` y en la llamada, enviar `domain` + `full_name` cuando no hay email.

#### 4. ERROR - Interfaz Contact duplicada
La interfaz `Contact` esta definida de forma identica en `Contacts.tsx` (linea 26) y `ContactProfile.tsx` (linea 32). Esto causa problemas de mantenimiento: cualquier cambio en la tabla requiere actualizar ambas.

**Solucion**: Extraer a un archivo compartido `src/types/contact.ts`.

#### 5. ERROR MENOR - `config.toml` no incluye `enrich-hunter-contact` ni `hunter-domain-search`
Las funciones `enrich-hunter-contact` y `hunter-domain-search` no estan configuradas en `supabase/config.toml`. Esto significa que usan la configuracion por defecto (verify_jwt = true), pero `enrich-hunter-contact` no implementa verificacion JWT en su codigo. Dado que se llama via `supabase.functions.invoke` (que envia el token automaticamente), el JWT se verifica a nivel de gateway pero no en el codigo.

**Nota**: Esto no es un error critico porque el gateway de Supabase ya verifica el JWT, pero es inconsistente con las demas funciones.

---

### MEJORAS PROPUESTAS

#### 1. Boton Hunter.io: mostrar tambien cuando `hunter_status` no es "pending"
Actualmente el boton Hunter solo aparece si `hunter_status === "pending"`. Si un contacto fue marcado como "not_found" previamente, no hay forma de re-intentar desde la lista. Podria mostrarse tambien para "not_found" con texto diferente ("Reintentar").

#### 2. Filtro por estado Hunter en la pagina de contactos
Existe un filtro para estado Lusha pero no para Hunter. Seria util para encontrar rapidamente contactos pendientes de enriquecer con Hunter.io.

#### 3. Enriquecimiento masivo con Hunter.io
Actualmente hay que hacer clic en cada contacto uno por uno. Un boton "Enriquecer todos" (con limite de rate) para contactos con `company_domain` y `hunter_status === "pending"` ahorraria mucho tiempo.

#### 4. Feedback visual del resultado de Hunter en la tarjeta
Tras enriquecer, el boton desaparece pero no se muestra que datos se obtuvieron. Podria mostrarse un badge "Hunter: Enriquecido" o "Hunter: No encontrado" en las tarjetas, similar a como se muestra Lusha con el icono Sparkles.

#### 5. Validacion del dominio antes de enviar a Hunter
No se valida el formato del dominio. Valores como "sin web", "N/A" o URLs completas podrian enviarse a la API gastando creditos innecesariamente.

**Solucion**: Validar con regex basico (`/^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/`) antes de llamar a la API.

---

### PLAN DE IMPLEMENTACION

**Archivos a modificar:**

1. `supabase/functions/enrich-hunter-contact/index.ts`
   - Añadir validacion JWT (copiar patron de `enrich-lusha-contact`)
   - Validar que el contacto pertenece al usuario autenticado

2. `src/components/contacts/ContactProfile.tsx`
   - Cambiar condicion del boton Hunter para soportar dominio sin email
   - Actualizar `enrichWithHunter` para enviar `domain` + `full_name` como alternativa

3. `src/pages/Contacts.tsx`
   - Añadir validacion de dominio antes de enriquecer
   - Añadir filtro por estado Hunter
   - Mostrar badge de estado Hunter en tarjetas

4. `src/types/contact.ts` (nuevo)
   - Extraer interfaz Contact compartida

