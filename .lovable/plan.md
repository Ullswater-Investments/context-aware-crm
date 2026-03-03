

## Integración de llamadas telefónicas con Plivo Browser SDK

### Arquitectura general

```text
┌──────────────────┐     ┌─────────────────────┐     ┌──────────────┐
│   Frontend       │     │  Edge Functions      │     │    Plivo      │
│   (Browser SDK)  │────▶│  plivo-token         │     │    Cloud      │
│                  │     │  plivo-answer         │◀────│              │
│   ContactProfile │     │  plivo-webhook        │◀────│  (hangup,    │
│   + Softphone UI │     │                      │     │  transcribe) │
└──────────────────┘     └─────────────────────┘     └──────────────┘
                                  │
                                  ▼
                          ┌──────────────┐
                          │  call_logs   │
                          │  (Supabase)  │
                          └──────────────┘
```

### Requisitos previos: Secrets

Se necesitan 2 secrets nuevos: `PLIVO_AUTH_ID` y `PLIVO_AUTH_TOKEN`. Se solicitaran al usuario antes de proceder con el codigo.

### 1. Base de datos: tabla `call_logs`

Nueva tabla para registrar llamadas:

| Columna | Tipo | Descripcion |
|---|---|---|
| id | uuid PK | |
| contact_id | uuid | Referencia al contacto |
| created_by | uuid | Usuario que inicio la llamada |
| direction | text | 'outbound' |
| phone_number | text | Numero llamado |
| status | text | ringing, answered, completed, failed, no-answer |
| duration | integer | Duracion en segundos |
| recording_url | text | URL de la grabacion en Plivo |
| transcription | text | Texto transcrito |
| plivo_call_uuid | text | UUID de la llamada en Plivo |
| started_at | timestamptz | Inicio de la llamada |
| ended_at | timestamptz | Fin de la llamada |
| created_at | timestamptz | now() |

RLS: Solo el `created_by` puede ver/crear/actualizar/eliminar sus propios registros.

### 2. Edge Functions

#### `plivo-token`
- Recibe la peticion del frontend autenticado
- Valida el JWT del usuario con `getUser()`
- Genera credenciales para el Plivo Endpoint usando `PLIVO_AUTH_ID` y `PLIVO_AUTH_TOKEN`
- Devuelve `{ username, password }` del Plivo Endpoint (el usuario debe crear un Endpoint en el panel de Plivo)

**Nota importante**: Plivo Browser SDK usa `client.login(username, password)` con credenciales de Endpoint, no JWT. La Edge Function servira como proxy seguro para entregar estas credenciales solo a usuarios autenticados.

**URL**: `https://gvoyhkipucdtgixzultj.supabase.co/functions/v1/plivo-token`

#### `plivo-answer`
- Answer URL que Plivo consulta al iniciar una llamada
- Recibe `To`, `From`, `CallUUID` como query params
- Devuelve XML de Plivo:
```xml
<Response>
  <Dial callerId="{from}" record="true" 
        recordFileFormat="mp3"
        action="{webhook_url}">
    <Number>{to}</Number>
  </Dial>
</Response>
```
- **URL**: `https://gvoyhkipucdtgixzultj.supabase.co/functions/v1/plivo-answer`

#### `plivo-webhook`
- Recibe eventos de Plivo (hangup, recording, transcription)
- Extrae: `CallUUID`, `Duration`, `CallStatus`, `RecordUrl`, `TranscriptionText`
- Actualiza la fila correspondiente en `call_logs` por `plivo_call_uuid`
- **URL**: `https://gvoyhkipucdtgixzultj.supabase.co/functions/v1/plivo-webhook`

### 3. Frontend

#### Paquete npm
Instalar `plivo-browser-sdk`.

#### Componente `PlivoSoftphone`
Nuevo componente integrado en `ContactProfile.tsx` junto al boton de WhatsApp:

- Boton "Llamar" con icono `Phone` junto al numero del contacto
- Al hacer clic:
  1. Llama a `plivo-token` para obtener credenciales
  2. Inicializa `new Plivo.Client(options)`
  3. Llama a `client.login(username, password)`
  4. Al recibir `onLogin`, ejecuta `client.call(phoneNumber)`
  5. Crea registro en `call_logs` con status `ringing`
- UI de llamada activa: barra flotante con duracion, boton "Colgar" (rojo)
- Event listeners:
  - `onCallRemoteRinging` → status "Conectando..."
  - `onCallAnswered` → status "En llamada" + timer
  - `onCallTerminated` → status "Llamada finalizada" + cleanup
  - `onCallFailed` → toast error

#### Historial de llamadas
Seccion en ContactProfile mostrando las ultimas llamadas del contacto desde `call_logs`, con duracion, fecha y enlace a grabacion.

### 4. URLs para configurar en el panel de Plivo

El usuario necesitara configurar estas URLs en su cuenta de Plivo:

| Configuracion Plivo | URL |
|---|---|
| Application Answer URL | `https://gvoyhkipucdtgixzultj.supabase.co/functions/v1/plivo-answer` |
| Application Hangup URL | `https://gvoyhkipucdtgixzultj.supabase.co/functions/v1/plivo-webhook` |
| Endpoint (crear en Plivo) | El username/password del Endpoint se guardaran como secrets adicionales |

### Archivos a crear/modificar

| Archivo | Accion |
|---|---|
| Migracion SQL | Crear tabla `call_logs` con RLS |
| `supabase/functions/plivo-token/index.ts` | Nuevo |
| `supabase/functions/plivo-answer/index.ts` | Nuevo |
| `supabase/functions/plivo-webhook/index.ts` | Nuevo |
| `supabase/config.toml` | Registrar 3 funciones con `verify_jwt = false` |
| `src/components/contacts/PlivoSoftphone.tsx` | Nuevo componente softphone |
| `src/components/contacts/ContactProfile.tsx` | Integrar boton de llamada y historial |
| `package.json` | Anadir `plivo-browser-sdk` |

### Flujo paso a paso

1. Solicitar secrets `PLIVO_AUTH_ID`, `PLIVO_AUTH_TOKEN`, `PLIVO_ENDPOINT_USERNAME`, `PLIVO_ENDPOINT_PASSWORD`
2. Crear tabla `call_logs`
3. Crear las 3 Edge Functions
4. Crear componente `PlivoSoftphone`
5. Integrar en `ContactProfile`
6. El usuario configura Answer URL y Hangup URL en el panel de Plivo

