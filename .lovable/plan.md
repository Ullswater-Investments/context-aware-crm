

## Plan: Corregir fallos y proponer mejoras en el sistema de contactos y enriquecimiento

### Fallos detectados

#### 1. Lusha marca "not_found" en errores HTTP (BUG CRITICO)
En `bulk-enrich/index.ts` lineas 159-161, cuando la API de Lusha devuelve un error HTTP (401, 429, 500), el codigo marca `lusha_status: "not_found"`, impidiendo reintentos futuros. Esto viola la politica de errores del sistema (solo marcar "not_found" cuando la API responde 200 sin datos).

**Correccion:** No actualizar `lusha_status` en caso de error HTTP, devolver "error" para permitir reintentos.

#### 2. Paginacion rota en bulk-enrich (BUG CRITICO)
La query SQL usa `.range(offset, offset + BATCH_SIZE - 1)` pero luego filtra en JavaScript los contactos que ya tienen datos. Esto causa que el offset avance de 3 en 3 aunque solo se enriquezca 1 contacto, saltandose contactos validos.

**Correccion:** Mover toda la logica de filtrado a la query SQL para que el offset funcione correctamente, o usar un cursor basado en ID en lugar de offset numerico.

#### 3. Boton Apollo solo visible con company_domain
En `Contacts.tsx` lineas 457 y 589, el boton de Apollo solo aparece si el contacto tiene `company_domain`. Pero Apollo puede buscar tambien por `linkedin_url` o por nombre + empresa. Contactos sin dominio pero con LinkedIn no pueden enriquecerse via Apollo desde la UI.

**Correccion:** Mostrar el boton de Apollo tambien cuando el contacto tiene `linkedin_url`.

#### 4. Bulk-enrich no filtra por estado de enriquecimiento
La query no excluye contactos que ya fueron marcados como "not_found" o "enriched" por los 3 servicios. Esto genera llamadas innecesarias a APIs de pago.

**Correccion:** Agregar filtro SQL para excluir contactos donde los 3 servicios ya devolvieron resultado definitivo.

#### 5. `getClaims()` potencialmente invalido
Las edge functions usan `supabaseAuth.auth.getClaims(token)` que no es un metodo estandar de supabase-js v2. Deberia usar `supabase.auth.getUser()`.

**Correccion:** Reemplazar `getClaims` por `getUser()` en `bulk-enrich` y `enrich-apollo-contact`.

### Mejoras propuestas

#### 6. Boton de enriquecimiento masivo en la UI
Actualmente no hay forma de lanzar el bulk-enrich desde la interfaz. El usuario depende del chat para ejecutarlo.

**Mejora:** Agregar un boton "Enriquecer todos" junto a los filtros que lance el proceso en batches con un indicador de progreso.

#### 7. Contador de contactos sin datos en el dashboard
No hay visibilidad rapida de cuantos contactos necesitan enriquecimiento.

**Mejora:** Mostrar un badge con el numero de contactos sin email/telefono junto al titulo "Contactos".

### Archivos a modificar

1. **`supabase/functions/bulk-enrich/index.ts`**
   - Corregir Lusha error handling (no marcar not_found en errores HTTP)
   - Corregir paginacion (usar cursor basado en ID)
   - Filtrar contactos ya procesados por los 3 servicios
   - Reemplazar `getClaims` por `getUser()`

2. **`supabase/functions/enrich-apollo-contact/index.ts`**
   - Reemplazar `getClaims` por `getUser()`

3. **`src/pages/Contacts.tsx`**
   - Mostrar boton Apollo tambien cuando hay `linkedin_url`
   - Agregar boton "Enriquecer todos" con progreso
   - Agregar badge con contactos pendientes de enriquecimiento

### Detalles tecnicos

**Paginacion corregida (bulk-enrich):**
```text
Antes: .range(offset, offset + BATCH_SIZE - 1) + filtro JS
Despues: Filtro SQL completo + cursor por ID (.gt("id", last_id))
```

**Auth corregida:**
```text
Antes: supabaseAuth.auth.getClaims(token)
Despues: supabaseAuth.auth.getUser() -> data.user.id
```

**Boton Apollo corregido:**
```text
Antes: c.company_domain && (c.apollo_status === "pending" || ...)
Despues: (c.company_domain || c.linkedin_url) && (c.apollo_status === "pending" || ...)
```

