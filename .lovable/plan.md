

## Auditoria Completa: Errores y Mejoras

### BUG 1 (Critico): `getClaims()` sigue roto en 5 Edge Functions

El metodo `supabase.auth.getClaims(token)` **no existe** en el cliente Supabase JS v2. Esto bloquea completamente las siguientes funciones:

| Funcion | Linea | Impacto |
|---|---|---|
| `enrich-hunter-contact` | 31 | Enriquecimiento Hunter no funciona |
| `hunter-domain-search` | 31 | Busqueda de dominio Hunter no funciona |
| `prospector-search` | 118 | Prospector no funciona |
| `get-api-usage` | 105 | Pagina de creditos API no funciona |
| `chat` | 517 | Chat IA no funciona |

**Solucion:** En cada una, reemplazar:
```text
const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
if (claimsError || !claimsData?.claims) { ... }
const userId = claimsData.claims.sub;
```
Por:
```text
const { data: { user }, error: userError } = await supabase.auth.getUser(token);
if (userError || !user) { ... }
const userId = user.id;
```

---

### BUG 2 (Medio): `send-whatsapp` usa `err.message` sin tipo seguro

En `send-whatsapp/index.ts` linea 137, el catch usa `err.message` sin verificar el tipo:
```text
JSON.stringify({ error: err.message })
```

**Solucion:** Cambiar a:
```text
const message = err instanceof Error ? err.message : "Unknown error";
JSON.stringify({ error: message })
```

---

### BUG 3 (Medio): `whatsapp-webhook` usa `err.message` sin tipo seguro

Mismo problema en `whatsapp-webhook/index.ts` linea 117.

**Solucion:** Igual que BUG 2.

---

### BUG 4 (Bajo): `whatsapp-webhook` tiene CORS headers incompletos

En `whatsapp-webhook/index.ts` linea 4, los CORS headers no incluyen los headers de plataforma Supabase:
```text
"authorization, x-client-info, apikey, content-type"
```

Aunque es un webhook publico, por consistencia y para evitar problemas si se llama desde el frontend:

**Solucion:** Actualizar a los headers completos estandar.

---

### MEJORA 1: Auto-test de conectores al cargar la pagina

Actualmente la pagina de Conectores muestra "Sin probar" para todos hasta que el usuario pulsa manualmente. Seria mas util ejecutar un test automatico al cargar la pagina.

**Solucion:** Anadir un `useEffect` que llame a `testAll()` al montar el componente.

---

### MEJORA 2: Indicador visual del numero conectado en WhatsApp

Cuando WhatsApp esta conectado, la tarjeta solo muestra "Conectado" pero no indica que numero esta vinculado. El endpoint `test-connector` ya devuelve `phone` y `name` en los detalles.

**Solucion:** Mostrar el numero/nombre del detalle debajo del badge cuando el estado es "connected", lo cual ya funciona con `getDetailText()` - solo falta que WhatsApp use el mismo flujo de `test-connector` para obtener los detalles iniciales tras conectar por QR.

---

### Resumen de cambios

| Archivo | Cambio | Prioridad |
|---|---|---|
| `supabase/functions/enrich-hunter-contact/index.ts` | Reemplazar `getClaims` por `getUser` | Critico |
| `supabase/functions/hunter-domain-search/index.ts` | Reemplazar `getClaims` por `getUser` | Critico |
| `supabase/functions/prospector-search/index.ts` | Reemplazar `getClaims` por `getUser` | Critico |
| `supabase/functions/get-api-usage/index.ts` | Reemplazar `getClaims` por `getUser` | Critico |
| `supabase/functions/chat/index.ts` | Reemplazar `getClaims` por `getUser` | Critico |
| `supabase/functions/send-whatsapp/index.ts` | Tipo seguro en catch | Medio |
| `supabase/functions/whatsapp-webhook/index.ts` | Tipo seguro en catch + CORS headers completos | Medio |
| `src/pages/Connectors.tsx` | Auto-test al cargar + detalles WhatsApp tras QR | Mejora |

