

# Plan: Chat IA Agentico con Creacion de Contactos y Etiquetas

## Resumen

Transformar el chat en un agente IA capaz de crear contactos directamente en la base de datos cuando el usuario lo solicite, incluyendo etiquetas personalizadas para clasificar el origen o sector del contacto (ej: "dental", "farmaceutico", "tech").

## Arquitectura: Function Calling

En lugar de detectar contactos con regex en el frontend (metodo actual, limitado), la IA usara **function calling** (herramientas) para decidir autonomamente cuando crear un contacto. El flujo sera:

```text
Usuario: "Guarda a Juan Perez, email juan@dental.com, es del sector dental"
     |
     v
IA detecta intencion -> llama tool "create_contact"
     |
     v
Edge Function ejecuta INSERT en Supabase
     |
     v
IA responde: "He creado el contacto Juan Perez con etiqueta 'dental'"
     |
     v
Frontend muestra tarjeta del contacto creado
```

## Cambios

### 1. Edge Function `chat/index.ts` - Agregar tools y ejecucion

- Definir herramienta `create_contact` con parametros: `full_name`, `email`, `phone`, `position`, `company_name`, `tags` (array de etiquetas)
- Cuando la IA invoque la herramienta, ejecutar el INSERT en la tabla `contacts` con el `user_id` del JWT
- Buscar si ya existe una organizacion con ese nombre; si no, crearla
- Devolver el resultado al modelo para que continue la respuesta
- Cambiar de streaming simple a un loop de function calling (non-streaming para tool calls, streaming para respuesta final)

### 2. Edge Function `chat/index.ts` - Herramienta `search_contacts`

- Agregar una segunda herramienta para que la IA pueda buscar contactos existentes antes de crear duplicados
- Parametros: `query` (texto libre para buscar por nombre, email o empresa)
- Ejecuta SELECT con ilike en la tabla contacts

### 3. Frontend `Index.tsx` - Mostrar tarjetas de contactos creados

- Detectar en la respuesta del asistente marcadores especiales (ej: `[CONTACT_CREATED:uuid]`) que indiquen que se creo un contacto
- Renderizar una tarjeta visual inline con los datos del contacto creado y un enlace para verlo
- Eliminar la deteccion regex actual de contactos (ya no es necesaria, la IA lo hace mejor)

### 4. Frontend `Index.tsx` - Manejo del streaming con tool calls

- Actualizar `chat-stream.ts` para manejar respuestas que incluyan marcadores de contactos creados
- El edge function insertara marcadores en el texto de respuesta cuando cree un contacto

---

## Seccion Tecnica

### Definicion de herramientas para el modelo:

```json
{
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "create_contact",
        "description": "Crea un nuevo contacto en el CRM. Usa esta herramienta cuando el usuario pida guardar, registrar o crear un contacto nuevo.",
        "parameters": {
          "type": "object",
          "properties": {
            "full_name": { "type": "string", "description": "Nombre completo" },
            "email": { "type": "string", "description": "Email principal" },
            "phone": { "type": "string", "description": "Telefono" },
            "position": { "type": "string", "description": "Cargo o puesto" },
            "company_name": { "type": "string", "description": "Nombre de la empresa" },
            "tags": { "type": "array", "items": { "type": "string" }, "description": "Etiquetas para clasificar (ej: dental, farmaceutico, tech, lead-frio)" }
          },
          "required": ["full_name"]
        }
      }
    },
    {
      "type": "function",
      "function": {
        "name": "search_contacts",
        "description": "Busca contactos existentes en el CRM por nombre, email o empresa.",
        "parameters": {
          "type": "object",
          "properties": {
            "query": { "type": "string", "description": "Texto de busqueda" }
          },
          "required": ["query"]
        }
      }
    }
  ]
}
```

### Flujo en la Edge Function (loop de tool calling):

```text
1. Enviar mensajes + tools al modelo (sin streaming)
2. Si respuesta tiene tool_calls:
   a. Ejecutar cada tool call (INSERT contact, SELECT contacts)
   b. Agregar tool results al historial
   c. Volver a llamar al modelo con los resultados
   d. Repetir hasta que no haya mas tool_calls
3. Cuando el modelo responde con texto final, hacer streaming al frontend
```

### INSERT de contacto con etiquetas:

```sql
INSERT INTO contacts (full_name, email, phone, position, tags, created_by)
VALUES ($1, $2, $3, $4, $5::text[], $6)
```

Las etiquetas se guardan en la columna `tags` (tipo text[]) que ya existe en la tabla contacts.

### Busqueda de organizacion existente:

Cuando el usuario indica empresa, buscar primero en `organizations` con ilike. Si existe, vincular con `organization_id`. Si no existe, crear la organizacion automaticamente.

### Archivos a modificar:
1. **supabase/functions/chat/index.ts** - Agregar tools, loop de function calling, ejecucion de herramientas
2. **src/pages/Index.tsx** - Mostrar tarjetas de contactos creados, eliminar deteccion regex
3. **src/lib/chat-stream.ts** - Sin cambios mayores (el streaming sigue igual, solo cambia el contenido)

### Sistema de mensajes del prompt:
Actualizar el system prompt para instruir a la IA sobre cuando usar las herramientas y como manejar etiquetas.

