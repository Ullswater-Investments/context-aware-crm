

## Plan: Correccion de Errores y Mejoras

Tras analizar todo el codigo del sistema de email (EdgeFunctions, componentes UI, base de datos), he identificado los siguientes problemas y mejoras a implementar.

---

### ERRORES CRITICOS

**1. Bucle infinito en EmailSettings.tsx (lineas 84-91)**

El `useEffect` que auto-verifica cuentas depende de `accounts.length`. Cada vez que `fetchAccounts()` se completa (despues de `test-email-connection`), actualiza `accounts`, lo que cambia `accounts.length` y vuelve a disparar el efecto, creando un bucle infinito de llamadas a la Edge Function.

**Solucion:** Usar un flag `hasChecked` con `useRef` para ejecutar la verificacion solo una vez al cargar la pagina.

**2. Consulta duplicada en AppLayout.tsx (linea 49-50)**

La consulta usa dos `.neq("status", ...)` encadenados, lo que en PostgREST se interpreta como `status != 'connected' AND status != 'checking'`. Sin embargo, se ejecuta 3 veces identicas segun los logs de red. Esto probablemente es porque el efecto se dispara multiples veces (React StrictMode + falta de array de dependencias correcto).

**Solucion:** Mantener la consulta pero envolver en un control para evitar multiples ejecuciones.

**3. `is_default` no se actualiza correctamente al crear cuenta nueva (linea 179-184)**

Cuando se crea una cuenta nueva como "default", el codigo intenta hacer `.neq("id", selectedId || "")`. Pero `selectedId` es `null` al crear, asi que pasa `""` como ID, lo que significa que NO excluye ninguna cuenta del update (en realidad excluye IDs que sean cadena vacia, pero podria no excluir la cuenta recien creada). La cuenta recien creada no tiene su ID disponible despues del insert porque no se usa `.select("id").single()`.

**Solucion:** Hacer el insert con `.select("id").single()` para obtener el ID, y usarlo en el update de `is_default`.

**4. Passwords se guardan en texto plano**

La funcion `get_decrypted_email_account` simplemente devuelve `ea.smtp_pass AS decrypted_smtp_pass` sin ninguna desencriptacion real. El parametro `_enc_key` se recibe pero no se usa. Las contrasenas se almacenan como texto plano en la tabla.

**Solucion:** Implementar cifrado real con `pgp_sym_encrypt` al guardar y `pgp_sym_decrypt` al leer, usando la extension `pgcrypto` que ya esta habilitada.

---

### ERRORES MENORES

**5. ComposeEmail.tsx - consulta de cuentas sin filtro de usuario**

En `fetchEmailAccounts()` (linea 113-122), la consulta no filtra por `created_by`. Aunque RLS lo protege, es una buena practica incluirlo.

**6. Falta TooltipProvider en AccountStatusDot**

El componente usa `Tooltip` de Radix directamente, pero necesita estar envuelto en un `TooltipProvider` para funcionar correctamente. Si no hay un Provider global, los tooltips no se mostraran.

**Solucion:** Envolver el `Tooltip` en `TooltipProvider` dentro del componente.

---

### MEJORAS PROPUESTAS

**7. Proteccion contra leaked passwords**

El linter de seguridad reporta que la proteccion contra contrasenas filtradas esta deshabilitada. Se recomienda activarla.

**8. Validacion de email en formularios**

`EmailSettings.tsx` no valida el formato del email antes de guardar. Se puede agregar una validacion basica con regex.

**9. Limpieza de URLs de preview de firmas**

En `SignatureManager.tsx`, se crea un `URL.createObjectURL` (linea 63) pero nunca se libera con `URL.revokeObjectURL`, lo que causa memory leaks.

**10. Sync fallback innecesario en Emails.tsx**

Cuando no hay cuentas en `syncAccounts`, `handleSync` envia `account: "secondary"` (linea 128), que es el fallback legacy. Deberia mostrar un mensaje pidiendo al usuario que configure una cuenta primero.

---

### Archivos a modificar

| Archivo | Cambios |
|---|---|
| `src/pages/EmailSettings.tsx` | Fix bucle infinito (#1), fix is_default (#3), validacion email (#8) |
| `src/components/layout/AppLayout.tsx` | Fix ejecucion multiple (#2) |
| `src/components/email/AccountStatusDot.tsx` | Agregar TooltipProvider (#6) |
| `src/components/email/SignatureManager.tsx` | Liberar object URLs (#9) |
| `src/components/email/ComposeEmail.tsx` | Filtro de usuario en consulta (#5) |
| `src/pages/Emails.tsx` | Mejorar fallback sync (#10) |
| `supabase/migrations/` | Nueva migracion para cifrado real de passwords (#4) |
| Edge Functions | Actualizar para usar contrasenas cifradas (#4) |

### Prioridad de implementacion

1. Fix bucle infinito en EmailSettings (critico - afecta rendimiento y costes)
2. Fix is_default al crear cuenta
3. Implementar cifrado real de passwords
4. Agregar TooltipProvider
5. Resto de mejoras menores

