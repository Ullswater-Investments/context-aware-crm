

## Plan: Campanas de email por etiqueta desde el chat

### Objetivo
Permitir que el usuario diga al chat cosas como "envía un email a todos los contactos con la etiqueta dental" y que el asistente IA pueda: (1) buscar contactos por etiqueta, (2) redactar el email, y (3) enviarlo masivamente.

### Cambios necesarios

#### 1. Edge Function `supabase/functions/chat/index.ts` - Nuevas herramientas

**a) Nueva tool: `search_contacts_by_tag`**
- Busca contactos que tengan una etiqueta especifica en su array `tags`
- Usa el operador `@>` de PostgreSQL para buscar dentro del array
- Devuelve: lista de contactos con sus emails (email, work_email, personal_email)
- Solo devuelve contactos que tengan al menos un email disponible

**b) Nueva tool: `send_campaign_email`**
- Recibe: `tag` (etiqueta para filtrar), `subject`, `html_body`, `text_body`
- Busca todos los contactos con esa etiqueta que tengan email
- Llama a la edge function `send-email` para cada contacto (o usa Resend directamente)
- Devuelve: resumen con cuantos emails se enviaron, cuantos fallaron, lista de destinatarios

**c) Nueva tool: `list_available_tags`**
- Consulta todos los tags unicos existentes en la tabla contacts
- Devuelve la lista de tags disponibles para que la IA pueda sugerirlos al usuario

#### 2. Implementacion de las funciones ejecutoras

```text
search_contacts_by_tag(supabase, tag):
  SELECT id, full_name, email, work_email, personal_email, position, tags, organizations(name)
  FROM contacts
  WHERE tags @> ARRAY[tag]
  AND (email IS NOT NULL OR work_email IS NOT NULL OR personal_email IS NOT NULL)

send_campaign_email(supabase, userId, tag, subject, html_body, text_body):
  1. Busca contactos por tag con email
  2. Para cada contacto, determina el mejor email (work_email > email > personal_email)
  3. Llama a send-email para cada uno (con RESEND_API_KEY directamente)
  4. Registra cada envio en email_logs
  5. Devuelve resumen: {sent: N, failed: N, recipients: [...]}

list_available_tags(supabase):
  SELECT DISTINCT unnest(tags) as tag FROM contacts ORDER BY tag
```

#### 3. Actualizar el system prompt del chat

Anadir instrucciones sobre las nuevas capacidades:
- Puede buscar contactos por etiqueta
- Puede enviar campanas de email a contactos filtrados por etiqueta
- Puede listar las etiquetas disponibles
- SIEMPRE debe mostrar al usuario la lista de destinatarios y pedir confirmacion antes de enviar
- Debe redactar el email y mostrarlo al usuario para aprobacion antes de enviarlo
- Incluir marcador `[CAMPAIGN_SENT:tag:count]` para feedback visual

#### 4. Flujo de interaccion esperado

```text
Usuario: "Envia un email a todos los contactos con etiqueta dental"
    |
    v
IA: [list_available_tags] -> confirma que "dental" existe
IA: [search_contacts_by_tag("dental")] -> obtiene 15 contactos con email
IA: "He encontrado 15 contactos con la etiqueta 'dental'. 
     Aqui tienes la lista: [nombres]. 
     Redacta el mensaje o dime que quieres comunicar."
    |
    v
Usuario: "Informales de la nueva convocatoria Horizon Europe..."
    |
    v
IA: Redacta el email y lo muestra al usuario
IA: "Este es el email que enviare. Confirmas el envio?"
    |
    v
Usuario: "Si, envialo"
    |
    v
IA: [send_campaign_email("dental", subject, html, text)]
IA: "Campana enviada: 14 emails enviados correctamente, 1 fallido."
```

### Archivos a modificar

1. **`supabase/functions/chat/index.ts`**
   - Anadir 3 nuevas tools al array `tools`
   - Implementar `executeSearchContactsByTag()`, `executeSendCampaignEmail()`, `executeListAvailableTags()`
   - Actualizar system prompt con instrucciones de campanas
   - Anadir los nuevos cases al switch de ejecucion de herramientas

### Consideraciones de seguridad
- Las consultas usan el cliente autenticado del usuario (respeta RLS)
- Los emails se envian con el RESEND_API_KEY del servidor
- Se registra cada envio en email_logs con el userId
- Rate limiting: limitar a maximo 50 contactos por campana para evitar abusos
