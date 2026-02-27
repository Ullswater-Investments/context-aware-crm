

## Mejorar visibilidad de errores en WhatsApp Chat

### Problema actual

La funcion `send-whatsapp` **funciona correctamente** (verificado con una prueba real que envio un mensaje exitosamente). El error que viste fue anterior a la actualizacion del token.

Sin embargo, cuando hay un error de Whapi, el frontend muestra solo "Edge Function returned a non-2xx status code" porque `supabase.functions.invoke()` no expone el cuerpo de la respuesta cuando el status no es 2xx.

### Solucion: Devolver siempre HTTP 200 con el error dentro del JSON

Cambiar la Edge Function para que siempre devuelva HTTP 200, pero incluya el error de Whapi en el cuerpo JSON. Asi el frontend puede leerlo y mostrar un mensaje util.

### Cambios

**Archivo 1: `supabase/functions/send-whatsapp/index.ts`**

- Cuando Whapi devuelve error (lineas 108-112), en lugar de devolver HTTP 502, devolver HTTP 200 con `{ error: "...", details: whapiData }`
- Anadir logging del status y cuerpo de respuesta de Whapi para depuracion
- Esto permite que el frontend lea el error real

**Archivo 2: `src/components/whatsapp/WhatsAppChat.tsx`**

- Mejorar el catch en `sendMessage()` (linea 136) para mostrar detalles del error de Whapi si estan disponibles
- Si `data.details` tiene informacion, incluirla en el toast de error
- Ejemplo: "Error Whapi: Invalid token" en vez de "Edge Function returned a non-2xx status code"

### Nota sobre WHAPI_CHANNEL_ID

No es necesario configurar un secreto `WHAPI_CHANNEL_ID`. La API de Whapi identifica el canal automaticamente por el Bearer token. El Channel ID (`DRAXTH-K7P5G`) es solo un identificador visual del panel, no se usa en las llamadas API.

### Resumen

| Archivo | Cambio |
|---|---|
| `supabase/functions/send-whatsapp/index.ts` | Devolver siempre 200, incluir error Whapi en JSON |
| `src/components/whatsapp/WhatsAppChat.tsx` | Mostrar detalles del error Whapi en el toast |

