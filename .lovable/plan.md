

## Plan: Configurar envio de emails via SMTP (Hostinger)

### Objetivo

Reemplazar Resend por tu servidor SMTP de Hostinger (`smtp.hostinger.com`) para que los emails salgan desde tu direccion real `emilio.mulet@kitespaciodedatos.eu`.

### Paso 1: Almacenar credenciales SMTP como secretos

Se guardaran de forma segura las siguientes credenciales:

| Secreto | Valor |
|---|---|
| `SMTP_HOST` | smtp.hostinger.com |
| `SMTP_PORT` | 465 |
| `SMTP_USER` | emilio.mulet@kitespaciodedatos.eu |
| `SMTP_PASS` | (la contrasena proporcionada) |

### Paso 2: Modificar `supabase/functions/send-email/index.ts`

Reemplazar la integracion con Resend por nodemailer con SMTP:

- Importar `npm:nodemailer` (compatible con Deno)
- Crear transporter SMTP con SSL en puerto 465
- Enviar email con soporte para: to, cc, subject, html, text, adjuntos
- El remitente por defecto sera `emilio.mulet@kitespaciodedatos.eu`
- Mantener toda la logica existente de: autenticacion, descarga de adjuntos, logging en `email_logs`, guardado de `email_attachments`

### Paso 3: Actualizar el remitente por defecto en `ComposeEmail.tsx`

Cambiar el `from` por defecto de `"EuroCRM <onboarding@resend.dev>"` a `"EuroCRM <emilio.mulet@kitespaciodedatos.eu>"`.

### Archivos a modificar

1. **`supabase/functions/send-email/index.ts`** - Reemplazar Resend por SMTP/nodemailer
2. **`src/components/email/ComposeEmail.tsx`** - Actualizar remitente por defecto

### Nota de seguridad

Las credenciales se almacenaran como secretos cifrados en el backend, nunca en el codigo fuente.

