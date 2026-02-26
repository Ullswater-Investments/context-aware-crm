

## Integracion de WhatsApp en el CRM

### Resumen
Integrar un sistema completo de mensajeria WhatsApp en el CRM usando la API de Whapi.cloud, permitiendo enviar y recibir mensajes desde la ficha de cada contacto, con soporte para variables de personalizacion y actualizaciones en tiempo real.

### Fase 1: Base de datos

**Nueva tabla `whatsapp_messages`:**
- `id` (uuid, PK)
- `contact_id` (uuid, FK a contacts)
- `phone_number` (text) - numero del destinatario/remitente
- `direction` (text) - "inbound" o "outbound"
- `content` (text) - cuerpo del mensaje
- `status` (text) - "pending", "sent", "delivered", "read", "failed"
- `whapi_message_id` (text, nullable) - ID del mensaje en Whapi
- `created_by` (uuid)
- `created_at` (timestamptz)

RLS: Solo el creador puede ver/crear sus mensajes. Para inbound (webhook), se usara service_role.

Activar Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;`

### Fase 2: Edge Function de envio (`send-whatsapp`)

- Recibe: `contact_id`, `phone`, `message`
- Valida JWT del usuario con `getClaims()`
- Soporta variables `{{first_name}}`, `{{last_name}}`, `{{company}}` reemplazandolas con datos del contacto
- Limpia el numero de telefono (elimina espacios, guiones, anade prefijo +34 si falta)
- Llama a la API de Whapi.cloud: `POST https://gate.whapi.cloud/messages/text` con header `Authorization: Bearer {WHAPI_API_TOKEN}`
- Inserta el mensaje en `whatsapp_messages` con direction "outbound"
- Requiere secret: `WHAPI_API_TOKEN`

### Fase 3: Edge Function webhook (`whatsapp-webhook`)

- Funcion publica (sin JWT) que recibe POSTs de Whapi.cloud
- Extrae numero del remitente y contenido del mensaje
- Busca contacto en `contacts` por `phone`, `mobile_phone` o `work_phone`
- Si no existe, crea contacto "Desconocido" con el numero
- Inserta en `whatsapp_messages` con direction "inbound" usando service_role
- Valida la estructura del payload para evitar inyecciones
- Config en `supabase/config.toml`: `verify_jwt = false`

### Fase 4: Componente de chat (`WhatsAppChat.tsx`)

- Panel lateral (Sheet) que se abre desde la ficha del contacto
- Diseno tipo chat: burbujas verdes (outbound) y blancas (inbound)
- ScrollArea con historial de mensajes ordenado por fecha
- Campo de texto inferior con boton de envio (icono WhatsApp verde)
- Selector de variables rapidas (`{{first_name}}`, etc.)
- Suscripcion a Supabase Realtime para mensajes entrantes en tiempo real
- Indicador de estado del mensaje (enviado/entregado/leido con checks)

### Fase 5: Integracion en la UI existente

**ContactProfile.tsx:**
- Anadir boton "WhatsApp" junto a los botones existentes de email
- Solo visible cuando el contacto tiene numero de telefono
- Abre el panel WhatsAppChat

**Contacts.tsx (Kanban/Lista):**
- Anadir icono WhatsApp en las tarjetas de contacto (junto a los iconos de email)
- Click directo abre el chat de WhatsApp para ese contacto

### Fase 6: Ruta de pagina dedicada (opcional)

- Nueva pagina `/whatsapp` con vista de todas las conversaciones
- Lista de chats a la izquierda, conversacion seleccionada a la derecha
- Similar al diseno de la pagina de Emails existente

### Archivos a crear/modificar

| Archivo | Accion |
|---|---|
| `supabase/migrations/xxx_whatsapp.sql` | Crear tabla + RLS + realtime |
| `supabase/functions/send-whatsapp/index.ts` | Crear (envio via Whapi) |
| `supabase/functions/whatsapp-webhook/index.ts` | Crear (recepcion webhook) |
| `supabase/config.toml` | Registrar ambas funciones |
| `src/components/whatsapp/WhatsAppChat.tsx` | Crear (componente de chat) |
| `src/components/contacts/ContactProfile.tsx` | Anadir boton WhatsApp |
| `src/pages/Contacts.tsx` | Anadir icono WhatsApp en tarjetas |

### Prerequisito: API Token de Whapi.cloud

Antes de implementar, necesitaremos que configures tu token de Whapi.cloud como secret (`WHAPI_API_TOKEN`). Para obtenerlo:
1. Registrate en whapi.cloud
2. Conecta tu numero de WhatsApp escaneando el QR
3. Copia el API Token desde el dashboard
4. Lo guardaremos de forma segura en los secrets del proyecto

### Seguridad

- El token de Whapi nunca se expone al frontend
- Los mensajes salientes requieren autenticacion JWT
- El webhook valida la estructura del payload
- RLS asegura que cada usuario solo ve sus mensajes
- Numeros de telefono se validan y sanitizan antes de enviar

