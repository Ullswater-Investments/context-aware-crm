

# Integración de Envío de Emails con Resend

## Resumen

Integrar Resend como servicio de envío de emails profesionales en el CRM, permitiendo:
- Enviar emails individuales a contactos desde su ficha o desde el chat IA
- Enviar campañas a grupos de contactos filtrados
- La IA redacta y envía emails directamente desde el chat
- Registro de todos los emails enviados vinculados a contactos/organizaciones

---

## Lo que se necesita antes de empezar

1. **Crear una cuenta gratuita en Resend** (resend.com)
2. **Obtener la API Key** desde el panel de Resend (Settings > API Keys)
3. **Verificar un dominio** o usar el dominio de prueba que Resend proporciona (onboarding@resend.dev para testing)

---

## Componentes a implementar

### 1. Tabla `email_logs` para registrar todos los emails enviados

Campos principales:
- Destinatario (to), remitente (from), asunto, cuerpo HTML/texto
- Vinculacion a contacto, organizacion y proyecto
- Estado del envio (sent, failed, pending)
- Fecha de envio
- ID de Resend para tracking

### 2. Edge Function `send-email`

Funcion backend que:
- Recibe los datos del email (to, subject, html, contact_id, etc.)
- Llama a la API de Resend para enviar el email
- Registra el resultado en la tabla `email_logs`
- Devuelve confirmacion o error

### 3. Componente `ComposeEmail` (modal de redaccion)

Un dialogo reutilizable que permite:
- Seleccionar destinatario (de la lista de contactos o escribir manualmente)
- Escribir asunto y cuerpo del email
- Boton "Pedir a la IA que redacte" que usa el chat para generar el contenido
- Vista previa antes de enviar
- Envio directo desde el CRM

### 4. Seccion de Emails en la pagina de cada contacto

- Historial de emails enviados a ese contacto
- Boton rapido "Enviar email" que abre el modal de redaccion

### 5. Pagina de Campanas (opcional, segunda fase)

- Crear campanas seleccionando filtros (por organizacion, pais, etiqueta)
- Envio programado o inmediato
- Metricas basicas (enviados, fallidos)

### 6. Integracion con el Chat IA

- El usuario puede decir: "Redactame un email para Maria sobre el presupuesto Lump Sum y envialo"
- La IA redacta el email y muestra un boton de confirmacion antes de enviar
- Al confirmar, se llama a la edge function de envio

---

## Detalles Tecnicos

### Migracion SQL

```sql
CREATE TABLE public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  from_email text NOT NULL,
  to_email text NOT NULL,
  subject text NOT NULL,
  body_html text,
  body_text text,
  status text NOT NULL DEFAULT 'pending',
  resend_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
-- Politicas RLS para usuarios autenticados
```

### Edge Function: `send-email/index.ts`

- Recibe: `{ to, subject, html, text, contact_id?, organization_id?, project_id? }`
- Usa `RESEND_API_KEY` (secret que habra que configurar)
- Llama a `https://api.resend.com/emails` con POST
- Guarda resultado en `email_logs`

### Archivos a crear/modificar

1. **Migracion SQL** - tabla `email_logs` + RLS
2. **`supabase/functions/send-email/index.ts`** - edge function de envio
3. **`src/components/email/ComposeEmail.tsx`** - modal de redaccion
4. **`src/pages/Contacts.tsx`** - agregar historial de emails y boton de envio
5. **`src/App.tsx`** - (sin cambios de rutas, el compose es un modal)
6. **`supabase/config.toml`** - registrar nueva funcion

### Flujo de usuario

```text
1. Usuario va a un contacto o abre el chat IA
2. Dice "enviar email a Maria" o pulsa el boton de email
3. Se abre el modal de redaccion con el destinatario pre-rellenado
4. Opcionalmente pide a la IA que redacte el contenido
5. Revisa el email y pulsa "Enviar"
6. Edge function envia via Resend
7. Se registra en email_logs vinculado al contacto
8. El usuario ve confirmacion y el email aparece en el historial
```

### Configuracion necesaria

Se pedira al usuario que introduzca su API Key de Resend como secret seguro en el proyecto. Esta clave solo sera accesible desde las funciones backend, nunca desde el navegador.

