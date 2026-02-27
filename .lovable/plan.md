

## Auditoria completa: Errores encontrados y mejoras propuestas

### ERRORES (Bugs)

#### BUG 1: Webhook de WhatsApp crea contactos sin `created_by` (CRITICA)

En `supabase/functions/whatsapp-webhook/index.ts` linea 88-95, cuando llega un mensaje de un numero desconocido, se crea un contacto nuevo **sin campo `created_by`**. La tabla `contacts` tiene RLS que filtra por `created_by = auth.uid()`, lo que significa que:
- El contacto creado sera **invisible** para todos los usuarios del CRM
- Los mensajes asociados tampoco seran visibles (el RLS de `whatsapp_messages` depende de `contacts.created_by`)
- Se acumularan "contactos fantasma" en la base de datos

**Solucion**: El webhook necesita asignar un `created_by` al contacto. Como no hay usuario autenticado en un webhook, se puede buscar el primer usuario con rol `admin` o el propietario de la cuenta, o se puede crear una tabla de configuracion para definir el usuario por defecto para mensajes entrantes.

#### BUG 2: Webhook crea contactos sin `findymail_status`, `hunter_status`, etc. (MEDIA)

En el mismo webhook (linea 89-93), el INSERT solo incluye `full_name`, `phone` y `status`. Los campos `lusha_status`, `hunter_status`, `apollo_status` y `findymail_status` tienen defaults en la DB (`'pending'`), asi que esto funciona. Pero el campo `created_by` es NULL, lo cual rompe todo como se indica en BUG 1.

#### BUG 3: `whatsapp-qr` usa `serve` de std antiguo en vez de `Deno.serve` (BAJA)

En `supabase/functions/whatsapp-qr/index.ts` linea 1, se importa `serve` de `deno.land/std@0.168.0`, mientras que las demas funciones usan `Deno.serve` nativo. Esto puede causar incompatibilidades con versiones futuras del edge runtime.

**Solucion**: Migrar a `Deno.serve` como las demas funciones.

#### BUG 4: Seguridad - Proteccion contra contrasenas filtradas deshabilitada (BAJA)

El linter de seguridad reporta que la proteccion contra contrasenas filtradas ("leaked password protection") esta deshabilitada. Esto permite a usuarios registrarse con contrasenas que han aparecido en brechas de seguridad conocidas.

**Solucion**: Habilitar la proteccion en la configuracion de autenticacion.

---

### MEJORAS PROPUESTAS

#### MEJORA 1: Contacts.tsx tiene 676 lineas - Refactorizar en componentes

El archivo `Contacts.tsx` es muy grande y mezcla logica de enriquecimiento, vistas Kanban, vista lista, formularios y filtros. Seria mas mantenible dividirlo en:
- `ContactKanbanView.tsx` - Vista Kanban
- `ContactListView.tsx` - Vista lista
- `ContactFilters.tsx` - Barra de filtros
- `ContactCreateDialog.tsx` - Dialog de creacion
- `useContactEnrichment.ts` - Hook con toda la logica de enriquecimiento

#### MEJORA 2: Patron duplicado de enriquecimiento

Las funciones `enrichWithLusha`, `enrichWithHunter`, `enrichWithApollo`, `enrichWithFindymail` estan duplicadas entre `Contacts.tsx` y `ContactProfile.tsx` con ligeras variaciones. Esto es propenso a bugs de sincronizacion.

**Solucion**: Extraer un hook compartido `useContactEnrichment(contactId, onUpdate)` que centralice toda la logica.

#### MEJORA 3: Polling del QR sin limite de tiempo

En `Connectors.tsx`, el polling del estado de WhatsApp (cada 5 segundos) no tiene limite de tiempo. Si el usuario deja el modal abierto sin escanear, seguira haciendo peticiones indefinidamente.

**Solucion**: Anadir un timeout de 5 minutos que detenga el polling y muestre un mensaje de "Tiempo expirado, refresca el QR".

#### MEJORA 4: `as any` innecesarios en updates de Supabase

En varios archivos (`Contacts.tsx` linea 251, `ContactProfile.tsx` lineas 115, 217, 240, 270), se usan casts `as any` para los updates de Supabase. Esto puede esconder errores de tipo.

**Solucion**: Actualizar el tipo `Database` generado o usar tipos mas especificos en los updates.

#### MEJORA 5: Sin paginacion real en contactos

La pagina de contactos carga hasta 2000 contactos de golpe (linea 84). Para bases de datos grandes, esto puede causar lentitud.

**Solucion**: Implementar paginacion con scroll infinito o paginacion por paginas.

---

### RESUMEN DE CAMBIOS PROPUESTOS

| Archivo | Cambio | Prioridad |
|---|---|---|
| `supabase/functions/whatsapp-webhook/index.ts` | Asignar `created_by` al crear contactos desconocidos | CRITICA |
| `supabase/functions/whatsapp-qr/index.ts` | Migrar de `serve` a `Deno.serve` | BAJA |
| `src/pages/Connectors.tsx` | Anadir timeout al polling del QR | MEDIA |
| Configuracion de auth | Habilitar leaked password protection | BAJA |
| `src/pages/Contacts.tsx` + `ContactProfile.tsx` | Extraer hook compartido de enriquecimiento | MEDIA |

### Detalle tecnico del BUG 1 (Critico)

El webhook necesita una estrategia para asignar `created_by`. Propuesta:

```text
1. Buscar el contacto existente por telefono
2. Si existe -> usar su created_by para el mensaje
3. Si no existe -> buscar el primer usuario admin en user_roles
4. Crear el contacto con ese created_by
5. Insertar el mensaje con ese created_by
```

Esto requiere modificar `whatsapp-webhook/index.ts` para:
- Consultar `user_roles` buscando un admin
- Pasar ese user_id como `created_by` en el INSERT de contacts
- Pasar ese user_id como `created_by` en el INSERT de whatsapp_messages (actualmente no se pasa `created_by` en mensajes entrantes, lo cual tambien impide que sean visibles via RLS)

