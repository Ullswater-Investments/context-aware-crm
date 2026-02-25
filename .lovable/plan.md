

## Plan: Integrar cuenta globaldatacare.es + Sincronizacion IMAP manual

### Resumen

Conectar la nueva cuenta de email (emilio.mulet@globaldatacare.es) al CRM manteniendo la cuenta existente (kitespaciodedatos.eu). Permitir elegir desde cual enviar. Crear una funcion de sincronizacion IMAP manual para recibir emails entrantes en el CRM.

---

### 1. Nuevos secretos para la segunda cuenta SMTP

Se necesitan 4 nuevos secretos:
- `SMTP_HOST_2` = smtp.hostinger.com
- `SMTP_USER_2` = emilio.mulet@globaldatacare.es
- `SMTP_PASS_2` = (la contraseña del email)
- `SMTP_PORT_2` = 465

Se pediran al usuario mediante la herramienta de secretos.

### 2. Migracion de base de datos

**Añadir columna `direction` a `email_logs`:**
- `direction TEXT NOT NULL DEFAULT 'outbound'` -- valores: 'outbound' o 'inbound'
- `imap_uid TEXT` -- para evitar duplicados al sincronizar IMAP

Indice unico parcial en `imap_uid` para evitar importar el mismo email dos veces.

### 3. Modificar Edge Function: `send-email`

- Aceptar nuevo parametro `from_account`: `"primary"` (kitespaciodedatos.eu) o `"secondary"` (globaldatacare.es)
- Seleccionar las credenciales SMTP segun el valor:
  - primary: `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_PORT`
  - secondary: `SMTP_HOST_2`, `SMTP_USER_2`, `SMTP_PASS_2`, `SMTP_PORT_2`
- Ajustar el `from` del email segun la cuenta seleccionada
- Añadir `direction: 'outbound'` al insertar en email_logs

### 4. Nueva Edge Function: `sync-emails`

**Archivo: `supabase/functions/sync-emails/index.ts`**

- Usa la libreria `npm:imapflow` para conectar por IMAP a Hostinger
- Recibe parametro `account`: `"primary"` o `"secondary"` para elegir credenciales IMAP
- Necesita secretos adicionales: `IMAP_HOST_2` = imap.hostinger.com (se reutiliza para la cuenta 2; la cuenta 1 ya tiene SMTP pero no IMAP, asi que tambien se necesita `IMAP_HOST`, `IMAP_USER`, `IMAP_PASS`, `IMAP_PORT`)
- Flujo:
  1. Conecta por IMAP al buzon INBOX
  2. Busca los ultimos N emails no sincronizados (por fecha o UID)
  3. Por cada email nuevo:
     - Extrae from, to, subject, body (HTML y texto plano), cc, fecha
     - Busca si el remitente existe como contacto en la tabla `contacts` (por email)
     - Inserta en `email_logs` con `direction = 'inbound'`, vinculando `contact_id` si existe
     - Guarda el `imap_uid` para no duplicar
  4. Retorna cuantos emails se importaron
- Valida JWT del usuario
- Maneja errores de conexion con mensajes claros

**Secretos adicionales necesarios:**
- `IMAP_HOST_2` = imap.hostinger.com
- `IMAP_USER_2` = emilio.mulet@globaldatacare.es
- `IMAP_PASS_2` = (misma contraseña que SMTP)
- `IMAP_PORT_2` = 993

Para la cuenta primaria (si tambien se quiere sincronizar en el futuro):
- `IMAP_HOST` = imap.hostinger.com
- `IMAP_USER` = emilio.mulet@kitespaciodedatos.eu
- `IMAP_PASS` = (contraseña actual)
- `IMAP_PORT` = 993

### 5. Modificar `src/pages/Emails.tsx`

- Nuevos filtros en el sidebar: "Recibidos" (inbound) ademas de "Todos", "Enviados", "Fallidos"
- Boton "Sincronizar" en la barra superior que llama a `supabase.functions.invoke("sync-emails")`
- Mostrar icono diferente para emails recibidos vs enviados en la lista
- En la lista, mostrar `from_email` para recibidos y `to_email` para enviados
- Counts actualizados para incluir recibidos

### 6. Modificar `src/components/email/ComposeEmail.tsx`

- Nuevo selector "Enviar desde" en el header (debajo del campo "Para"):
  - Opcion 1: "emilio.mulet@kitespaciodedatos.eu"
  - Opcion 2: "emilio.mulet@globaldatacare.es"
- El valor seleccionado se pasa como `from_account` al invocar `send-email`
- Por defecto selecciona la cuenta 2 (globaldatacare.es)

### 7. Registrar nueva funcion en config

```text
[functions.sync-emails]
verify_jwt = false
```

---

### Archivos a crear/modificar

1. **Migracion SQL** - Añadir columnas `direction` e `imap_uid` a `email_logs`
2. **`supabase/functions/send-email/index.ts`** - Soporte multi-cuenta SMTP
3. **`supabase/functions/sync-emails/index.ts`** (NUEVO) - Sincronizacion IMAP manual
4. **`src/pages/Emails.tsx`** - Filtro "Recibidos" + boton "Sincronizar"
5. **`src/components/email/ComposeEmail.tsx`** - Selector "Enviar desde"

### Secretos a solicitar

Se pediran al usuario en orden:
1. `SMTP_HOST_2`, `SMTP_PORT_2`, `SMTP_USER_2`, `SMTP_PASS_2` (envio)
2. `IMAP_HOST_2`, `IMAP_PORT_2`, `IMAP_USER_2`, `IMAP_PASS_2` (recepcion)

### Flujo del usuario

```text
ENVIO:
Redactar -> Elegir cuenta (globaldatacare/kitespaciodedatos) -> Enviar
-> Email sale por SMTP de la cuenta elegida
-> Se guarda en email_logs con direction='outbound'

RECEPCION:
Click "Sincronizar" -> Edge function conecta IMAP a Hostinger
-> Descarga emails nuevos del INBOX
-> Los guarda en email_logs con direction='inbound'
-> Vincula automaticamente al contacto si existe
-> La lista se refresca mostrando los nuevos emails recibidos
```

