

# Plan: Integracion de Lusha API para Enriquecimiento de Contactos

## Resumen

Integrar la API de Lusha para enriquecer contactos del CRM con emails y telefonos profesionales. Se creara una Edge Function segura que almacene la API Key, nuevos campos en la tabla `contacts`, y un boton "Enriquecer con Lusha" en la ficha de cada contacto.

---

## 1. Almacenar la API Key de forma segura

- Usar la herramienta de secretos para guardar `LUSHA_API_KEY` como variable de entorno en el backend
- La clave NUNCA se expondra en el frontend

## 2. Migracion de base de datos

Agregar columnas nuevas a la tabla `contacts`:

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `linkedin_url` | text, nullable | URL de LinkedIn del contacto |
| `company_domain` | text, nullable | Dominio web de la empresa |
| `work_email` | text, nullable | Email corporativo (Lusha) |
| `personal_email` | text, nullable | Email personal (Lusha) |
| `mobile_phone` | text, nullable | Movil (Lusha) |
| `work_phone` | text, nullable | Telefono fijo (Lusha) |
| `lusha_status` | text, default 'pending' | Estado: pending, enriched, not_found |
| `last_enriched_at` | timestamptz, nullable | Fecha del ultimo enriquecimiento |

## 3. Edge Function `enrich-lusha-contact`

Nueva funcion en `supabase/functions/enrich-lusha-contact/index.ts`:

- Recibe por POST: `contact_id`, `first_name`, `last_name`, `company_name`, `linkedin_url`
- Lee `LUSHA_API_KEY` desde `Deno.env.get()`
- Llama a `https://api.lusha.com/person` con los datos del contacto
- Si Lusha devuelve datos: actualiza los campos de email/telefono, cambia `lusha_status` a `enriched`
- Si no encuentra datos: cambia `lusha_status` a `not_found`
- Devuelve JSON con el resultado al frontend
- Incluye headers CORS y `verify_jwt = false` en config.toml

## 4. Actualizar el perfil del contacto (ContactProfile.tsx)

Agregar en la ficha de contacto:

- **Badge de estado Lusha** en la cabecera: gris (pending), verde (enriched), naranja (not_found)
- **Seccion "Datos Lusha"** que muestra work_email, personal_email, mobile_phone, work_phone con botones de copiar al portapapeles
- **Campo LinkedIn URL** editable en el formulario de edicion
- **Boton "Enriquecer con Lusha"**: visible solo si `lusha_status` es `pending`, con estado de carga (spinner), deshabilitado si ya fue enriquecido o no encontrado
- Si Lusha no encuentra datos, mostrar toast de aviso

## 5. Actualizar la interfaz de contactos

- Actualizar la interfaz `Contact` en `Contacts.tsx` y `ContactProfile.tsx` para incluir los nuevos campos
- Mostrar indicador visual (icono pequeno) en las tarjetas del Kanban si un contacto ha sido enriquecido
- Agregar los campos `linkedin_url` y `company_domain` al formulario de creacion de contacto

---

## Seccion Tecnica

### Archivos a crear:
1. `supabase/functions/enrich-lusha-contact/index.ts` - Edge Function segura

### Archivos a modificar:
1. `supabase/config.toml` - Agregar configuracion de la nueva funcion (verify_jwt = false)
2. `src/components/contacts/ContactProfile.tsx` - Boton Lusha, datos enriquecidos, badge de estado, boton copiar
3. `src/pages/Contacts.tsx` - Actualizar interfaz Contact, campos linkedin/domain en formulario de creacion, indicador visual en Kanban

### Migracion SQL:
- ALTER TABLE contacts ADD COLUMN para los 8 nuevos campos

### Flujo tecnico:

```text
Usuario abre ficha de contacto
        |
        v
Ve badge "Pendiente" y boton "Enriquecer con Lusha"
        |
  Click boton --> estado "Cargando..."
        |
        v
Frontend llama a Edge Function via supabase.functions.invoke()
        |
        v
Edge Function lee LUSHA_API_KEY del entorno
        |
        v
POST a https://api.lusha.com/person con nombre + empresa + linkedin
        |
        v
+-- Datos encontrados --> UPDATE contacts SET work_email, mobile_phone... lusha_status='enriched'
+-- Sin datos --> UPDATE contacts SET lusha_status='not_found'
        |
        v
Respuesta JSON al frontend
        |
        v
UI se actualiza: badge verde/naranja, datos visibles con boton copiar
```

### Proteccion de creditos:
- El boton se desactiva automaticamente tras el primer uso (estado enriched o not_found)
- Se registra `last_enriched_at` para trazabilidad
- Solo enriquecimiento manual (contacto por contacto), nunca automatico masivo

