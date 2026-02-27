
## Fix WhatsApp QR: Actualizar Token y Mejorar Funcion

### Problema raiz

La API de Whapi devuelve `"Channel not found"` al llamar a `/health` y `/users/login`. Esto ocurre porque el secreto `WHAPI_API_TOKEN` almacenado no corresponde al canal DRAXTH-K7P5G o esta expirado.

**Importante**: El Channel ID (`DRAXTH-K7P5G`) NO se usa en las URLs de la API de Whapi. La API identifica el canal automaticamente por el Bearer token. Por tanto, no necesitamos guardar el Channel ID -- solo necesitamos el API Token correcto de ese canal.

---

### Paso 1: Actualizar el secreto WHAPI_API_TOKEN (accion del usuario)

1. Ir a [panel.whapi.cloud](https://panel.whapi.cloud/)
2. Abrir el canal DRAXTH-K7P5G
3. Copiar el **API Token** del canal (no el Channel ID)
4. Lovable pedira que introduzcas el nuevo valor del secreto

### Paso 2: Mejorar la Edge Function `whatsapp-qr`

Cambios en `supabase/functions/whatsapp-qr/index.ts`:

- **Endpoint QR mejorado**: Usar `GET /users/login/image` como fallback, que devuelve la imagen QR directamente como binario (mas fiable que el base64 de `/users/login`)
- **Mejor manejo de errores**: Si la API devuelve 404 ("Channel not found"), informar claramente que el token es invalido
- **Manejo de 409**: Si devuelve "Already authenticated", indicar al frontend que el canal ya esta conectado sin necesidad de QR
- **Logging mejorado**: Registrar el status HTTP y cuerpo de respuesta para facilitar depuracion

### Paso 3: Mejorar el frontend (Connectors.tsx)

Cambios en `src/pages/Connectors.tsx`:

- Manejar el caso de "already authenticated" (409) cerrando el modal y marcando como conectado
- Mostrar mensajes de error especificos segun el tipo de fallo (token invalido vs canal no encontrado vs error de red)
- Mejorar la deteccion de formato QR: soportar tanto base64 como URL directa

---

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `supabase/functions/whatsapp-qr/index.ts` | Fallback a /login/image, manejo de 404 y 409, logging |
| `src/pages/Connectors.tsx` | Manejo de errores especificos, soporte 409 |

### Prerequisito

El usuario debe actualizar el secreto `WHAPI_API_TOKEN` con el token correcto del canal DRAXTH-K7P5G antes de que los cambios de codigo tengan efecto.
