

## Plan: Añadir campo CC al compositor de emails

### Cambios necesarios

#### 1. `src/components/email/ComposeEmail.tsx` - Añadir campo CC en el formulario

- Añadir estado `cc` (string)
- Añadir un campo Input entre "Para" y "Asunto" con label "CC" y placeholder "email1@ejemplo.com, email2@ejemplo.com"
- Pasar `cc` al invoke de la edge function
- El campo CC es opcional, acepta multiples emails separados por comas

#### 2. `supabase/functions/send-email/index.ts` - Enviar con CC via Resend

- Extraer `cc` del body del request
- Añadir `cc` al objeto `resendBody` si tiene valor (como array de emails)
- Guardar los CC en el campo existente del log o añadir al registro

#### 3. Migración de base de datos - Añadir columna `cc_emails` a `email_logs`

- `ALTER TABLE email_logs ADD COLUMN cc_emails text;`
- Guardar los emails en CC para que queden registrados en el historial

#### 4. `src/pages/Emails.tsx` - Mostrar CC en el panel de preview

- Mostrar los emails CC en la vista de detalle del email seleccionado, debajo de "Para" y "De"

### Archivos a modificar

1. `src/components/email/ComposeEmail.tsx` - Campo CC en formulario
2. `supabase/functions/send-email/index.ts` - Soporte CC en Resend API
3. `src/pages/Emails.tsx` - Mostrar CC en preview
4. Nueva migración SQL - Columna `cc_emails`

