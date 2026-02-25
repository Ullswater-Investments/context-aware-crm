

## Plan: Tabla `email_accounts` con Health Check y Pagina de Ajustes

Este plan combina la creacion de la tabla dinamica de cuentas de email con el sistema de monitorizacion de salud y la pagina de ajustes, ya que ambos dependen de la misma infraestructura.

---

### 1. Migracion de base de datos

Crear tabla `email_accounts` con todos los campos necesarios, incluyendo los de health check:

| Columna | Tipo | Notas |
|---|---|---|
| id | UUID PK | |
| created_by | UUID NOT NULL | usuario propietario |
| email_address | TEXT NOT NULL | |
| display_name | TEXT | nombre visible |
| provider | TEXT DEFAULT 'custom' | hostinger/outlook/gmail/custom |
| smtp_host | TEXT NOT NULL | |
| smtp_port | INTEGER NOT NULL DEFAULT 465 | |
| smtp_secure | BOOLEAN DEFAULT true | true=SSL, false=STARTTLS |
| smtp_user | TEXT NOT NULL | |
| smtp_pass | TEXT NOT NULL | cifrado con pgcrypto |
| imap_host | TEXT | |
| imap_port | INTEGER DEFAULT 993 | |
| imap_user | TEXT | |
| imap_pass | TEXT | cifrado con pgcrypto |
| is_default | BOOLEAN DEFAULT false | |
| is_active | BOOLEAN DEFAULT true | |
| status | TEXT DEFAULT 'connected' | connected/error/expired/checking |
| last_check | TIMESTAMPTZ DEFAULT now() | ultima verificacion |
| error_message | TEXT | detalle del error |
| created_at | TIMESTAMPTZ DEFAULT now() | |

- Habilitar extension `pgcrypto`
- RLS: solo el propietario puede CRUD sus cuentas
- Las contrasenas se cifran con `pgp_sym_encrypt` usando un secret `EMAIL_ENCRYPTION_KEY`

### 2. Nuevo secret

- `EMAIL_ENCRYPTION_KEY`: clave simetrica para cifrar/descifrar contrasenas en la base de datos.

### 3. Edge Functions

**3a. `test-email-connection` (NUEVA)**
- Recibe `account_id` o datos de conexion directos (para probar antes de guardar)
- Conecta via nodemailer `verify()` al SMTP
- Actualiza `status`, `last_check` y `error_message` en la tabla
- Detecta errores 535 (autenticacion) para marcar como `expired`

**3b. `send-email` (MODIFICAR)**
- Aceptar `account_id` (UUID) ademas del actual `from_account`
- Si recibe `account_id`: consultar `email_accounts` con service role, descifrar credenciales
- Si recibe `from_account`: mantener retrocompatibilidad con env vars
- Soporte STARTTLS para Outlook (puerto 587): `secure: false, requireTLS: true`

**3c. `sync-emails` (MODIFICAR)**
- Aceptar `account_id` (UUID) para obtener credenciales IMAP de la tabla

### 4. Componente `AccountStatusDot`

Componente visual que muestra un punto de color con tooltip:
- Verde fijo: `connected`
- Rojo parpadeante (`animate-pulse`): `error`
- Ambar parpadeante: `expired`
- Azul rebotando (`animate-bounce`): `checking`

### 5. Pagina `EmailSettings.tsx`

Layout de dos columnas:
- **Izquierda**: lista de cuentas con `AccountStatusDot`, badges de proveedor y estado default
- **Derecha**: formulario con:
  - Selector de proveedor con presets auto-relleno:

```text
Hostinger:  smtp.hostinger.com:465 (SSL)  / imap.hostinger.com:993
Outlook:    smtp.office365.com:587 (STARTTLS) / outlook.office365.com:993
Gmail:      smtp.gmail.com:587 (STARTTLS) / imap.gmail.com:993
```

  - Campos SMTP y IMAP
  - Boton "Probar Conexion" que invoca `test-email-connection`
  - Avisos de seguridad para Outlook/Gmail (contrasenas de aplicacion)
  - Guardar, editar, eliminar cuentas

- Al cargar la pagina: verificacion automatica de todas las cuentas activas

### 6. Notificacion proactiva al login

En `AppLayout.tsx`, un `useEffect` que consulta `email_accounts` buscando cuentas con `status != 'connected'`. Si encuentra alguna, muestra un toast de Sonner con boton "Reparar" que navega a `/email-settings`.

### 7. Actualizar `ComposeEmail.tsx`

- Reemplazar el Select hardcodeado por un Select dinamico que carga cuentas activas desde `email_accounts`
- Mostrar `display_name (email_address)` + `AccountStatusDot`
- Seleccionar cuenta `is_default` por defecto
- Pasar `account_id` al invocar `send-email`

### 8. Actualizar `Emails.tsx`

- Boton "Sincronizar" con dropdown para elegir cuenta
- Pasar `account_id` al invocar `sync-emails`

### 9. Routing y navegacion

- Agregar ruta `/email-settings` en `App.tsx`
- Agregar enlace "Ajustes Email" con icono `Settings2` en el sidebar de `AppLayout.tsx`

---

### Archivos a crear/modificar

1. **Migracion SQL** - tabla `email_accounts` + pgcrypto + RLS
2. **`supabase/functions/test-email-connection/index.ts`** (NUEVO)
3. **`supabase/functions/send-email/index.ts`** - soporte `account_id`
4. **`supabase/functions/sync-emails/index.ts`** - soporte `account_id`
5. **`src/components/email/AccountStatusDot.tsx`** (NUEVO)
6. **`src/pages/EmailSettings.tsx`** (NUEVO)
7. **`src/components/email/ComposeEmail.tsx`** - select dinamico
8. **`src/pages/Emails.tsx`** - sync por cuenta
9. **`src/App.tsx`** - ruta `/email-settings`
10. **`src/components/layout/AppLayout.tsx`** - enlace en sidebar + alerta proactiva
11. **`supabase/config.toml`** - registrar `test-email-connection`

### Flujo del usuario

```text
CONFIGURACION:
1. Sidebar -> "Ajustes Email"
2. "Agregar Cuenta" -> Seleccionar "Outlook" -> campos auto-rellenados
3. Introducir email y contrasena de aplicacion
4. "Probar Conexion" -> punto verde = OK
5. Guardar -> cuenta disponible en compositor y sincronizacion

MONITORIZACION:
- Al entrar al CRM: si hay cuentas con error/expired -> toast con boton "Reparar"
- En ajustes: puntos de estado visibles junto a cada cuenta
- Al verificar: punto azul rebotando -> verde (OK) o rojo parpadeante (error)

ENVIO/RECEPCION:
- Compositor: selector dinamico de cuentas con estado visual
- Sincronizar: elegir cuenta especifica o todas
```

