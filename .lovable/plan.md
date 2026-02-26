

## Auditoria de Errores y Soluciones

### BUG 1 (Critico): Edge Functions sin configurar en config.toml

Las funciones `get-api-usage` y `prospector-search` no estan registradas en `supabase/config.toml`. Esto significa que **no se despliegan** y las llamadas desde el frontend fallan silenciosamente.

Tambien faltan: `sync-emails`, `test-email-connection`, `suggest-reply`.

**Solucion:** Anadir las entradas al `config.toml`:
```text
[functions.get-api-usage]
verify_jwt = false

[functions.prospector-search]
verify_jwt = false

[functions.sync-emails]
verify_jwt = false

[functions.test-email-connection]
verify_jwt = false

[functions.suggest-reply]
verify_jwt = false
```

---

### BUG 2 (Critico): `supabase.auth.getClaims()` no existe

Tanto `get-api-usage` (linea 105) como `prospector-search` (linea 118) usan `supabase.auth.getClaims(token)`, que **no es un metodo valido** del cliente Supabase JS v2. Esto causa un error en tiempo de ejecucion y bloquea ambas funciones.

**Solucion:** Reemplazar por `supabase.auth.getUser()` que es el metodo correcto:

```text
// ANTES (no funciona):
const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

// DESPUES (correcto):
const { data: { user }, error: userError } = await supabase.auth.getUser(token);
if (userError || !user) { return 401 }
const userId = user.id;
```

Aplicar en ambos archivos.

---

### BUG 3 (Medio): Inyeccion SQL en anti-duplicados del Prospector

En `prospector-search/index.ts` linea 154, los nombres y emails de los resultados se interpolan directamente en la query `.or()`:

```text
`email.in.(${emails.join(",")}),full_name.in.(${names.join(",")})`
```

Si un nombre contiene comas o parentesis (ej: "O'Brien, James"), la query se rompe o produce resultados incorrectos. No es un riesgo de inyeccion SQL real (Supabase parametriza internamente), pero los resultados seran incorrectos.

**Solucion:** Usar dos queries separadas en lugar de interpolar strings:

```text
const { data: byEmail } = await supabase.from("contacts").select("email").in("email", emails);
const { data: byName } = await supabase.from("contacts").select("full_name").in("full_name", names);
```

---

### BUG 4 (Bajo): Doble renderizado de barra de progreso en ApiCredits

En `ApiCredits.tsx` lineas 81-84, se renderiza el componente `<Progress>` de shadcn Y ademas un `<div>` manual encima con `position: absolute`. Esto produce una barra duplicada visualmente.

**Solucion:** Eliminar el `<div>` manual y usar solo el componente `<Progress>` con la clase de color aplicada via CSS custom property o className.

---

### BUG 5 (Bajo): Limite de 2000 contactos sin aviso

En `Contacts.tsx` linea 84, la query tiene `.limit(2000)`. Si hay mas contactos, se pierden sin aviso.

**Solucion:** Despues de la query, comprobar si `data.length === 2000` y mostrar un `toast.warning("Mostrando los primeros 2000 contactos")`.

---

### Resumen de cambios

| Archivo | Cambio | Prioridad |
|---|---|---|
| `supabase/config.toml` | Registrar 5 edge functions faltantes | Critico |
| `supabase/functions/get-api-usage/index.ts` | Reemplazar `getClaims` por `getUser` | Critico |
| `supabase/functions/prospector-search/index.ts` | Reemplazar `getClaims` por `getUser` + corregir query anti-duplicados | Critico |
| `src/pages/ApiCredits.tsx` | Eliminar div manual de barra de progreso duplicada | Bajo |
| `src/pages/Contacts.tsx` | Aviso al alcanzar limite de 2000 contactos | Bajo |

