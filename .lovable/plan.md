

## QR de WhatsApp en la seccion Conectores

Integrar el codigo QR de Whapi directamente en la tarjeta de WhatsApp dentro de la pagina `/connectors`, para que puedas validar y autorizar tu numero de WhatsApp sin salir del CRM.

---

### Como funcionara

Cuando pulses "Probar conexion" en la tarjeta de WhatsApp:

1. El sistema consulta el estado del canal via `GET /health`
2. Si el canal esta en estado **QR** (necesita autorizacion) o **no autorizado**, se muestra automaticamente el codigo QR dentro de un dialogo modal
3. Escaneas el QR con tu telefono (como en WhatsApp Web)
4. El sistema refresca el estado cada 5 segundos hasta detectar que la conexion esta activa
5. Cuando se autoriza, el modal se cierra y la tarjeta muestra "Conectado" en verde

Si el canal ya esta autorizado, simplemente muestra el badge verde sin QR.

---

### Cambios tecnicos

#### 1. Nueva Edge Function: `whatsapp-qr`

Archivo: `supabase/functions/whatsapp-qr/index.ts`

Esta funcion tiene dos acciones:

- **action: "health"** - Llama a `GET https://gate.whapi.cloud/health` y devuelve el estado del canal (codigo numerico + texto: INIT, LAUNCH, QR, AUTH, etc.)
- **action: "qr"** - Llama a `GET https://gate.whapi.cloud/users/login` y devuelve la imagen QR en formato base64

Ambas usan el Secret `WHAPI_API_TOKEN` como Bearer token.

#### 2. Modificar `src/pages/Connectors.tsx`

Cambios en la pagina de conectores:

- Importar el componente `Dialog` de shadcn/ui
- Anadir estado para controlar el modal QR (`showQrModal`, `qrBase64`, `channelStatus`)
- Cuando se pulsa "Probar conexion" en WhatsApp:
  1. Primero llama a la Edge Function con `action: "health"`
  2. Si el estado es "QR" o no autorizado, llama con `action: "qr"` para obtener el QR base64
  3. Abre el modal mostrando la imagen QR
  4. Inicia un intervalo de 5 segundos que consulta `/health` para detectar cuando el usuario escanea
  5. Al detectar estado "AUTH" (autorizado), cierra el modal y actualiza el badge a "Conectado"
- Si el estado ya es "AUTH", no muestra QR y directamente marca como conectado

Elementos del modal:
- Titulo: "Conectar WhatsApp"
- Instrucciones: "Escanea este codigo QR con tu telefono"
- Imagen QR centrada (renderizada desde base64)
- Indicador de estado en tiempo real (esperando escaneo / conectando / conectado)
- Boton "Refrescar QR" por si el codigo expira
- Boton "Cerrar"

---

### Archivos a crear

| Archivo | Descripcion |
|---|---|
| `supabase/functions/whatsapp-qr/index.ts` | Edge Function para obtener health y QR de Whapi |

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/pages/Connectors.tsx` | Anadir modal QR con polling de estado para WhatsApp |

### Flujo visual

```text
[Tarjeta WhatsApp] --> Click "Probar conexion"
       |
       v
  [Edge Function: health]
       |
   Estado = QR? ----SI----> [Edge Function: qr] --> Mostrar modal con QR
       |                                                    |
   Estado = AUTH?                              Polling cada 5s /health
       |                                                    |
      SI                                          Detecta AUTH?
       |                                                    |
   Badge "Conectado"  <------------------------------------|
```

### Notas

- El QR de Whapi expira tras ~60 segundos; el boton "Refrescar QR" permite obtener uno nuevo
- El polling se detiene automaticamente al cerrar el modal o al detectar conexion
- No se necesitan cambios en la base de datos
- El Secret `WHAPI_API_TOKEN` ya esta configurado
