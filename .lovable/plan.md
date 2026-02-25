

## Plan: Corregir errores y mejoras en Contactos

### Errores detectados

#### 1. Bug: Lusha no se ejecuta directamente desde la tarjeta Kanban
En `Contacts.tsx` linea 439, el boton "Lusha" en la tarjeta Kanban solo abre el perfil (`openProfile(c)`) en vez de ejecutar la funcion de enriquecimiento directamente. Deberia llamar a la API de Lusha igual que Hunter y Apollo.

#### 2. Bug: mobile_phone nunca se muestra como dato adicional (condicion siempre falsa)
En `Contacts.tsx` linea 397 y 530:
```
c.mobile_phone !== (c.phone || c.mobile_phone || c.work_phone)
```
Si `c.phone` es null y `c.mobile_phone` existe, la expresion `(c.phone || c.mobile_phone)` devuelve `c.mobile_phone`, por lo que la comparacion siempre es `false`. Lo mismo con work_phone. La logica correcta seria mostrar mobile_phone solo si es distinto del telefono principal ya mostrado.

#### 3. Bug: ComposeEmail en el perfil solo usa `contact.email`, ignora work_email/personal_email
En `ContactProfile.tsx` linea 500:
```
defaultTo={contact.email || ""}
```
Si el contacto no tiene `email` pero si `work_email` o `personal_email`, el compositor se abre vacio. Deberia usar `contact.email || contact.work_email || contact.personal_email || ""`.

#### 4. Bug: Boton "Enviar email" en el perfil solo aparece si existe `contact.email`
En `ContactProfile.tsx` linea 362, la condicion es `{contact.email && ...}`. Deberia incluir tambien `work_email` y `personal_email`.

#### 5. Bug: Lusha solo se muestra si status es "pending"
En `ContactProfile.tsx` linea 409, el boton Lusha solo aparece cuando `lushaStatus === "pending"`, pero no cuando es `"not_found"`. Hunter y Apollo si permiten reintentar con `"not_found"`. Lusha deberia ser consistente.

### Mejoras propuestas

#### 6. Mejora: Enriquecimiento Lusha directo desde tarjetas (sin abrir perfil)
Crear una funcion `enrichWithLusha` a nivel de `Contacts.tsx` (similar a `enrichWithHunter` y `enrichWithApollo`) para que el boton Lusha en las tarjetas ejecute el enriquecimiento directamente.

#### 7. Mejora: Boton "Enviar email" en perfil deberia desaparecer si ya hay email clicable arriba
Actualmente hay duplicidad: el email es clicable Y ademas hay un boton separado "Enviar email". Se puede eliminar el boton redundante ya que el email clicable cumple la misma funcion.

### Detalles tecnicos

**Archivos a modificar:**

1. **src/pages/Contacts.tsx**
   - Agregar funcion `enrichWithLusha` (similar a las existentes de Hunter/Apollo) con estado `enrichingLushaId`
   - Actualizar boton Lusha en Kanban (linea 438-444) para llamar a `enrichWithLusha` directamente
   - Actualizar boton Lusha en Lista (linea 567-574) igual
   - Corregir condicion de mobile_phone duplicado (lineas 397 y 530): cambiar a `c.mobile_phone && c.phone && c.mobile_phone !== c.phone`
   - Corregir condicion de work_email duplicado (lineas 392 y 525): cambiar a `c.work_email && c.email && c.work_email !== c.email`

2. **src/components/contacts/ContactProfile.tsx**
   - Linea 500: cambiar `defaultTo` a `contact.email || contact.work_email || contact.personal_email || ""`
   - Linea 362: cambiar condicion del boton "Enviar email" a `(contact.email || contact.work_email || contact.personal_email)` -- o eliminarlo ya que el email clicable ya abre el compositor
   - Linea 409: agregar `|| lushaStatus === "not_found"` para permitir reintentar Lusha

### Resultado esperado
- Lusha funciona directamente desde las tarjetas sin abrir el perfil
- El compositor de email siempre recibe el email correcto (email, work_email o personal_email)
- Los datos adicionales (mobile_phone, work_email) se muestran correctamente sin duplicacion
- Lusha permite reintento igual que Hunter y Apollo
