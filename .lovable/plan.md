

## Integración SIP/WebRTC con servidor propio (Asterisk/FreeSWITCH)

### Enfoque

Usar la librería **JsSIP** (ligera, compatible con Asterisk/FreeSWITCH) para conectar el CRM a tu servidor SIP vía WebSocket. Tú configuras tu servidor (Asterisk + certificados + STUN/TURN + SIP Trunk). Lovable se encarga del frontend y la base de datos.

### Requisitos previos (tu lado)

Antes de implementar necesitas tener listo:
- Servidor Asterisk/FreeSWITCH con WebSocket habilitado (WSS)
- Un SIP Trunk contratado (Zadarma, Netelip, etc.)
- Un usuario SIP creado en tu centralita para el CRM

### Secrets necesarios

| Secret | Descripción |
|---|---|
| `SIP_WSS_URL` | URL WebSocket de tu Asterisk (ej: `wss://tu-servidor.com:8089/ws`) |
| `SIP_USER` | Usuario SIP (ej: `crm-agent`) |
| `SIP_PASSWORD` | Contraseña del usuario SIP |
| `SIP_DOMAIN` | Dominio SIP (ej: `tu-servidor.com`) |

### 1. Base de datos: tabla `call_logs`

```sql
CREATE TABLE call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  created_by uuid NOT NULL,
  direction text NOT NULL DEFAULT 'outbound',
  phone_number text NOT NULL,
  status text NOT NULL DEFAULT 'ringing',
  duration integer DEFAULT 0,
  recording_url text,
  transcription text,
  sip_call_id text,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
-- RLS: solo el creador accede a sus registros
```

### 2. Edge Function: `sip-credentials`

Entrega las credenciales SIP solo a usuarios autenticados. Lee los secrets `SIP_WSS_URL`, `SIP_USER`, `SIP_PASSWORD`, `SIP_DOMAIN` y los devuelve al frontend.

### 3. Frontend: componente `SipSoftphone.tsx`

Usa **JsSIP** (paquete npm `jssip`) para:

- Al abrir la ficha de contacto con teléfono, mostrar botón "Llamar"
- Al pulsar:
  1. Llama a `sip-credentials` para obtener config
  2. Crea `JsSIP.UA` con WebSocket hacia tu servidor
  3. Ejecuta `ua.call(phoneNumber)` con opciones de audio
  4. Muestra UI de llamada activa (timer, botón colgar)
- Event listeners: `connecting`, `accepted`, `ended`, `failed`
- Al colgar: inserta/actualiza registro en `call_logs`

```typescript
// Ejemplo simplificado
import JsSIP from 'jssip';

const socket = new JsSIP.WebSocketInterface(wssUrl);
const ua = new JsSIP.UA({ sockets: [socket], uri: sipUri, password });
ua.start();

const session = ua.call(phoneNumber, { mediaConstraints: { audio: true, video: false } });
session.on('accepted', () => { /* en llamada */ });
session.on('ended', () => { /* colgar */ });
```

### 4. Integración en `ContactProfile.tsx`

- Botón "Llamar" junto al campo teléfono (icono Phone verde)
- Barra flotante durante llamada activa con duración y botón colgar
- Sección "Historial de llamadas" que muestra registros de `call_logs`

### 5. Transcripción (fase posterior)

La transcripción con Whisper requiere que tu servidor Asterisk:
1. Grabe la llamada (archivo WAV/MP3)
2. Envíe el archivo a un endpoint (tu propio script o una Edge Function)
3. Procese con Whisper y actualice `call_logs`

Esto es configuración de tu servidor, no del CRM. Podemos preparar una Edge Function `call-transcribe` que reciba el audio y use Whisper, pero eso sería un paso posterior.

### Archivos

| Archivo | Acción |
|---|---|
| Migración SQL | Crear tabla `call_logs` con RLS |
| `supabase/functions/sip-credentials/index.ts` | Nueva - entrega credenciales SIP |
| `src/components/contacts/SipSoftphone.tsx` | Nuevo componente de llamada |
| `src/components/contacts/ContactProfile.tsx` | Integrar botón llamar + historial |
| `package.json` | Añadir `jssip` |

### Pasos de implementación

1. Solicitar los 4 secrets SIP
2. Crear tabla `call_logs`
3. Crear Edge Function `sip-credentials`
4. Instalar `jssip` y crear componente `SipSoftphone`
5. Integrar en `ContactProfile`

