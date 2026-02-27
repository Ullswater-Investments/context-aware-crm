

## Corrección de WhatsApp + Nueva Sección "Conectores"

### Problema principal: WhatsApp no funciona

La función `send-whatsapp` usa `supabase.auth.getClaims(token)` en la línea 41, que **no es un método válido** del cliente Supabase. Esto provoca un error en tiempo de ejecución que bloquea completamente el envío de mensajes. Hay que reemplazarlo por `supabase.auth.getUser(token)`.

---

### Fase 1: Corregir la Edge Function `send-whatsapp`

Reemplazar `getClaims` por `getUser` para que la autenticación funcione:

```text
// ANTES (roto):
const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
const userId = claimsData.claims.sub;

// DESPUÉS (correcto):
const { data: { user }, error: userError } = await supabase.auth.getUser(token);
if (userError || !user) return 401;
const userId = user.id;
```

### Fase 2: Nueva página "Conectores" (`/connectors`)

Crear una sección centralizada para gestionar todas las conexiones externas del CRM. La página mostrará tarjetas para cada servicio con:

- **Estado de conexión** (verde/rojo) verificado contra los Secrets configurados
- **Configuración rápida** para cada servicio
- **Test de conexión** en vivo

**Conectores a incluir:**

| Conector | Icono | Verificación | Datos mostrados |
|---|---|---|---|
| WhatsApp (Whapi) | MessageCircle | Verificar `WHAPI_API_TOKEN` haciendo ping a la API | Número conectado, estado |
| Hunter.io | Globe | Verificar `HUNTER_API_KEY` | Estado de API Key |
| Apollo.io | Search | Verificar `APOLLO_API_KEY` | Estado de API Key |
| Findymail | Mail | Verificar `FINDYMAIL_API_KEY` | Estado de API Key |
| Lusha | Sparkles | Verificar `LUSHA_API_KEY` | Estado de API Key |
| Email SMTP | Mail | Redirigir a `/email-settings` | Cuentas conectadas |

**Diseño de cada tarjeta:**
- Icono + nombre del servicio
- Badge de estado (Conectado / Error / No configurado)
- Descripción corta del servicio
- Botón "Probar conexión" que llama a una Edge Function para verificar las credenciales
- Enlace a documentación o configuración

### Fase 3: Edge Function `test-connector`

Crear una Edge Function que reciba `{ connector: "whatsapp" | "hunter" | ... }` y haga un ping de verificación a la API correspondiente:

- **WhatsApp**: `GET https://gate.whapi.cloud/settings` con el token de Whapi
- **Hunter**: `GET https://api.hunter.io/v2/account?api_key=...`
- **Apollo**: `GET https://api.apollo.io/v1/auth/health`
- **Findymail**: `GET https://app.findymail.com/api/credits`
- **Lusha**: `GET https://api.lusha.com/account/usage`

Devuelve `{ status: "connected" | "error", details: {...} }` para cada conector.

### Fase 4: Navegación

Añadir "Conectores" al sidebar con icono `Plug` o `Cable`, posicionado antes de "Créditos APIs":

```text
{ to: "/connectors", icon: Plug, label: "Conectores" },
```

Registrar la ruta `/connectors` en `App.tsx`.

---

### Archivos a crear

| Archivo | Descripción |
|---|---|
| `src/pages/Connectors.tsx` | Página de gestión de conectores |
| `supabase/functions/test-connector/index.ts` | Edge Function para verificar estado de cada API |

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `supabase/functions/send-whatsapp/index.ts` | Reemplazar `getClaims` por `getUser` (fix crítico) |
| `src/components/layout/AppLayout.tsx` | Añadir entrada "Conectores" al sidebar |
| `src/App.tsx` | Registrar ruta `/connectors` |

### Resultado esperado

- WhatsApp vuelve a funcionar inmediatamente tras el fix de `getClaims`
- Nueva sección "Conectores" centraliza el estado de todas las integraciones externas
- El usuario puede verificar de un vistazo qué servicios están operativos
- Preparado para añadir más conectores en el futuro (Crunchbase, PhantomBuster, etc.)

