

## Sistema de Deteccion de Emails Invalidos (Bounce Detection)

### Resumen

Crear un sistema automatico que detecta emails rebotados ("Mail Delivery System") en la bandeja de entrada, extrae las direcciones fallidas, las almacena en una tabla de base de datos, y muestra alertas visuales en las tarjetas de contacto.

---

### Paso 1: Migracion de base de datos

Crear tabla `invalid_emails` para almacenar emails detectados como invalidos:

```text
CREATE TABLE public.invalid_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_address text NOT NULL,
  reason text NOT NULL DEFAULT 'bounce',
  detected_from_email_id uuid REFERENCES public.email_logs(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indice unico por email+usuario para evitar duplicados
CREATE UNIQUE INDEX idx_invalid_emails_unique ON public.invalid_emails(email_address, created_by);

-- RLS
ALTER TABLE public.invalid_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own invalid_emails" ON public.invalid_emails FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "Users can create own invalid_emails" ON public.invalid_emails FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can delete own invalid_emails" ON public.invalid_emails FOR DELETE USING (created_by = auth.uid());
```

### Paso 2: Edge Function `detect-bounces`

Crear una nueva edge function `supabase/functions/detect-bounces/index.ts` que:

1. Recibe la peticion autenticada del usuario
2. Consulta `email_logs` buscando emails inbound con subject que contenga "Undelivered", "Mail Delivery", "Delivery Status", "failure", "returned" o "mailer-daemon" en from_email
3. Para cada email de bounce encontrado, analiza el `body_text` o `body_html` buscando direcciones email con regex
4. Filtra las direcciones que NO son del propio usuario (excluye las cuentas del usuario)
5. Inserta las direcciones encontradas en `invalid_emails` (con ON CONFLICT DO NOTHING para evitar duplicados)
6. Devuelve la lista de emails invalidos detectados

### Paso 3: Modificar `src/pages/Contacts.tsx`

**Nuevo estado:**
- `invalidEmails: Set<string>` - conjunto de emails invalidos cargados de la DB

**Nuevo efecto:**
- Al cargar contactos, tambien cargar `invalid_emails` y construir el Set

**Funcion `removeInvalidEmail(email)`:**
- DELETE de `invalid_emails` donde `email_address = email` (reactivar email)

**UI - Alerta visual en tarjetas Kanban:**
- Junto al email del contacto, si `invalidEmails.has(c.email)` o `invalidEmails.has(c.work_email)`, mostrar icono `AlertCircle` en rojo con tooltip "Email invalido - Bounce detectado"
- Aplicar estilo visual: texto del email en rojo tachado

**UI - Boton "Detectar bounces":**
- Nuevo boton en la barra de herramientas (junto a "Enriquecer todos") que invoca la edge function
- Muestra toast con el numero de emails invalidos detectados

### Paso 4: Modificar `src/pages/Contacts.tsx` - Vista Lista

- Mismo patron de alerta visual en la vista lista
- Columna o indicador de "Email invalido" si aplica

### Paso 5: Modificar `src/components/contacts/ContactProfile.tsx`

- Cargar `invalid_emails` al abrir perfil
- Mostrar alerta destacada si alguno de los emails del contacto esta en la lista
- Boton "Reactivar email" para quitarlo de la lista de invalidos

### Paso 6: Indicador en `ComposeEmail`

- Al escribir un destinatario, verificar contra `invalid_emails`
- Si coincide, mostrar advertencia amarilla: "Este email fue detectado como invalido (bounce previo)"

---

### Archivos a crear/modificar

| Archivo | Cambios |
|---|---|
| Migracion SQL | Crear tabla `invalid_emails` con RLS |
| `supabase/functions/detect-bounces/index.ts` | Edge function para analizar bounces |
| `supabase/config.toml` | Registrar nueva funcion |
| `src/pages/Contacts.tsx` | Cargar invalidos, alerta visual en tarjetas, boton detectar |
| `src/components/contacts/ContactProfile.tsx` | Alerta en perfil, boton reactivar |
| `src/components/email/ComposeEmail.tsx` | Advertencia al escribir destinatario invalido |

### Flujo del sistema

```text
Email bounce llega a Inbox --> Usuario pulsa "Detectar bounces"
  --> Edge function analiza body de emails de "Mail Delivery System"
  --> Extrae direcciones email fallidas
  --> Inserta en tabla invalid_emails
  --> Contactos muestran icono AlertCircle rojo junto al email
  --> Al componer email, se advierte si el destinatario esta en la lista
  --> Usuario puede "Reactivar" un email desde ContactProfile
```

