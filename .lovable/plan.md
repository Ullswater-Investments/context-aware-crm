

## Plan: Correcciones y Mejoras en Contactos

### Errores encontrados

#### 1. Direcciones postales no actualizadas (BUG PRINCIPAL)
La migracion SQL solo contiene `ALTER TABLE public.contacts ADD COLUMN postal_address text;` pero **no incluye el bloque UPDATE** con las direcciones postales. De los 83 contactos, solo 4 tienen direccion postal (Alicia Cervera del Rio y Angela Paredes, que coinciden con la lista proporcionada).

Ademas, la mayoria de nombres de la lista (Marta Bilbao, Esperanza Gross, etc.) **no existen** como contactos en la base de datos. Los contactos actuales son otros (Jorge Blanco, Isabel Ruiz, etc.). Por tanto, se necesita:
- Crear una nueva migracion que actualice los contactos existentes que si coincidan (Alicia Cervera del Rio, Angela Paredes)
- Importar los nuevos contactos de la lista junto con sus direcciones postales

**Accion**: Crear una migracion SQL para insertar los contactos de la lista que no existen, con su empresa, y direccion postal. Los que ya existen y coinciden, actualizar solo la direccion.

#### 2. Contactos duplicados en la base de datos
Hay contactos duplicados: Alicia Cervera del Rio (x2), Angela Paredes (x2), Carmen Hurtado de la Pena (x2), Claudia Gonzalez Blanco (x2), Cristina Lucas (x2), Eduardo Blanco (x2), Francisco Grau (x2), etc.

**Accion**: Crear una migracion que elimine duplicados, conservando el registro mas reciente (o el que tenga mas datos).

#### 3. Uso innecesario de `(c as any).apollo_status`
En `src/pages/Contacts.tsx` (lineas 190, 285, 350-351, 407, 414) y `src/components/contacts/ContactProfile.tsx` (linea 285), se usa `(c as any).apollo_status` a pesar de que `apollo_status` ya esta definido en el interface `Contact`.

**Accion**: Reemplazar todas las instancias de `(c as any).apollo_status` por `c.apollo_status`.

#### 4. Warning de React: forwardRef en App component
El log muestra: "Function components cannot be given refs" en el componente App.

**Accion**: Revisar y corregir el componente App para usar forwardRef donde sea necesario.

---

### Mejoras propuestas

#### 5. Mejorar rendimiento de carga
Actualmente se cargan todos los contactos sin paginacion. Con 83+ contactos no es critico, pero crecera.

**Accion**: Anadir paginacion o carga lazy al listado de contactos.

#### 6. Contacto con nombre invalido
Hay un contacto cuyo `full_name` es `ismael.gilabert@hsn.net` (un email en vez de nombre).

**Accion**: Limpiar este dato en una migracion.

---

### Archivos a modificar

1. **Nueva migracion SQL** -- Importar contactos de la lista con direcciones postales + limpiar duplicados + corregir dato invalido
2. **`src/pages/Contacts.tsx`** -- Eliminar castings `(c as any).apollo_status` a `c.apollo_status`
3. **`src/components/contacts/ContactProfile.tsx`** -- Eliminar casting `(c as any).apollo_status` a `c.apollo_status`

### Prioridad de implementacion

1. Migracion: importar contactos nuevos con direcciones + eliminar duplicados
2. Fix de tipos TypeScript (`as any` innecesario)
3. Correccion de dato invalido (email como nombre)

