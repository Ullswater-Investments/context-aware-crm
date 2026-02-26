
## Plan: Sistema de Plantillas de Email Inteligentes

### Resumen
Crear una tabla `email_templates` en la base de datos, un componente selector de plantillas con busqueda rapida (CommandDialog), e integrarlo en el compositor de email para que al elegir una plantilla se rellene automaticamente el asunto y el cuerpo del mensaje.

### 1. Base de datos: Migracion SQL

Crear tabla `email_templates` con los siguientes campos:
- `id` (UUID, PK)
- `name` (TEXT, NOT NULL) - Nombre de la plantilla
- `subject` (TEXT) - Asunto predefinido
- `content_html` (TEXT, NOT NULL) - Cuerpo HTML
- `category` (TEXT) - Categoria: Ventas, Legal, Seguimiento, etc.
- `entity` (TEXT) - Filtro por empresa: GDC, NextGen, General
- `created_by` (UUID) - Vinculado al usuario autenticado
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

Politicas RLS: CRUD completo restringido a `created_by = auth.uid()`.

Insertar 3 plantillas de ejemplo (Propuesta de Inversion, Saludo Inicial GDC, Factura Pendiente).

### 2. Nuevo componente: `src/components/email/TemplatePicker.tsx`

Un boton "Plantillas" que abre un `CommandDialog` (ya disponible en el proyecto) con:
- Buscador de texto (CommandInput)
- Plantillas agrupadas por categoria (CommandGroup)
- Cada item muestra nombre y asunto
- Al seleccionar, dispara callback `onSelect(template)` con subject y content_html
- Carga plantillas desde la base de datos al abrirse
- Filtrado opcional por `entity`

### 3. Modificar: `src/components/email/ComposeEmail.tsx`

- Importar `TemplatePicker`
- Anadir boton de plantillas en el footer (lado izquierdo, junto a los controles existentes)
- Al seleccionar una plantilla:
  - `setSubject(template.subject)` si la plantilla tiene asunto
  - `setBody(template.content_html)` para reemplazar el contenido del editor
- Sustitucion basica de variables: si el `defaultTo` coincide con un contacto, reemplazar `{{nombre}}` por el nombre del contacto (busqueda simple en la tabla contacts por email)

### Archivos afectados

| Archivo | Accion |
|---|---|
| Migracion SQL | Crear tabla `email_templates` + RLS + datos ejemplo |
| `src/components/email/TemplatePicker.tsx` | Crear - selector con CommandDialog |
| `src/components/email/ComposeEmail.tsx` | Modificar - integrar TemplatePicker en el footer |

### Flujo de usuario
1. Abre el compositor de email
2. Pulsa el boton "Plantillas" en el footer
3. Busca o navega por las plantillas disponibles
4. Selecciona una plantilla
5. El asunto y el cuerpo se rellenan automaticamente
6. El usuario edita lo que necesite y envia
