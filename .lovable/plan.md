

## Revision: Errores y Mejoras en la integracion WhatsApp

### BUG 1: Mensajes entrantes invisibles (CRITICO)

**Problema:** La politica RLS de SELECT en `whatsapp_messages` es `created_by = auth.uid()`. Los mensajes inbound llegan via webhook con `created_by = NULL`, por lo que el usuario **nunca vera los mensajes recibidos** en el chat.

**Solucion:** Cambiar la politica SELECT para permitir ver mensajes donde:
- `created_by = auth.uid()` (mensajes enviados por el usuario), O
- el `contact_id` pertenece al usuario (via JOIN con `contacts.created_by = auth.uid()`)

```sql
DROP POLICY "Users can view own whatsapp messages" ON whatsapp_messages;
CREATE POLICY "Users can view own whatsapp messages" ON whatsapp_messages
  FOR SELECT USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = whatsapp_messages.contact_id
        AND contacts.created_by = auth.uid()
    )
  );
```

### BUG 2: Politica INSERT inbound mal configurada (MEDIO)

**Problema:** La politica "Service role can insert inbound messages" con `direction = 'inbound'` es innecesaria porque `service_role` ya bypasea RLS. Peor aun, como politica RESTRICTIVE bloquea inserts normales si no se cumple la condicion.

**Solucion:** Eliminar esa politica. El webhook ya usa `service_role` que ignora RLS. La politica de INSERT del usuario (`created_by = auth.uid()`) es suficiente para mensajes outbound.

```sql
DROP POLICY "Service role can insert inbound messages" ON whatsapp_messages;
```

### BUG 3: UPDATE policy demasiado restrictiva para inbound (BAJO)

**Problema:** La politica UPDATE solo permite `created_by = auth.uid()`. Si se quiere actualizar el estado de un mensaje inbound (ej: marcarlo como leido), no sera posible.

**Solucion:** Ampliar la politica UPDATE igual que SELECT:

```sql
DROP POLICY "Users can update own whatsapp messages" ON whatsapp_messages;
CREATE POLICY "Users can update own whatsapp messages" ON whatsapp_messages
  FOR UPDATE USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = whatsapp_messages.contact_id
        AND contacts.created_by = auth.uid()
    )
  );
```

### MEJORA 1: Variable {{email}} en barra rapida del chat

**Problema:** El componente WhatsAppChat tiene 4 variables rapidas pero falta `{{email}}` que si esta soportada en la Edge Function.

**Solucion:** Anadir `{ label: "Email", value: "{{email}}" }` al array `VARIABLE_OPTIONS`.

### MEJORA 2: Seguridad del webhook - validacion de payload

**Problema:** El webhook acepta cualquier POST sin verificar que viene de Whapi.cloud. Un atacante podria inyectar mensajes falsos.

**Solucion:** Anadir un secret `WHAPI_WEBHOOK_SECRET` opcional y validar un header de autenticacion si esta configurado. Si no esta configurado, funciona como ahora (compatibilidad).

### MEJORA 3: Leaked password protection

**Problema:** El linter de seguridad reporta que la proteccion contra contrasenas filtradas esta deshabilitada.

**Solucion:** Activar "leaked password protection" en la configuracion de autenticacion.

---

### Resumen de cambios

| Archivo / Recurso | Cambio | Prioridad |
|---|---|---|
| Migration SQL (RLS) | Corregir SELECT, eliminar INSERT inbound, corregir UPDATE | Critico |
| `src/components/whatsapp/WhatsAppChat.tsx` | Anadir variable `{{email}}` | Baja |
| `supabase/functions/whatsapp-webhook/index.ts` | Validacion opcional de webhook secret | Media |

### Detalle tecnico

**Migration SQL completa:**

```sql
-- Fix SELECT: allow viewing messages for user's contacts
DROP POLICY "Users can view own whatsapp messages" ON whatsapp_messages;
CREATE POLICY "Users can view own whatsapp messages" ON whatsapp_messages
  FOR SELECT USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = whatsapp_messages.contact_id
        AND contacts.created_by = auth.uid()
    )
  );

-- Remove broken restrictive inbound policy
DROP POLICY "Service role can insert inbound messages" ON whatsapp_messages;

-- Fix UPDATE: allow updating messages for user's contacts
DROP POLICY "Users can update own whatsapp messages" ON whatsapp_messages;
CREATE POLICY "Users can update own whatsapp messages" ON whatsapp_messages
  FOR UPDATE USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = whatsapp_messages.contact_id
        AND contacts.created_by = auth.uid()
    )
  );
```

**WhatsAppChat.tsx - Variable email:**

```typescript
const VARIABLE_OPTIONS = [
  { label: "Nombre", value: "{{first_name}}" },
  { label: "Apellido", value: "{{last_name}}" },
  { label: "Nombre completo", value: "{{full_name}}" },
  { label: "Empresa", value: "{{company}}" },
  { label: "Email", value: "{{email}}" },
];
```

