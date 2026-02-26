

## Plan: Corregir la carga de cuentas de email en el compositor

### Problema detectado

Cuando abres el compositor de email pulsando "Redactar", las cuentas de email no se cargan en el desplegable "De". Esto ocurre porque `fetchEmailAccounts()` solo se llama dentro de `handleOpenChange`, que es un callback del Sheet que no se ejecuta cuando el compositor se abre programaticamente (via `composeOpen = true`).

El `useEffect` existente (linea 131-133) solo llama a `fetchSignatures()` pero **no llama a `fetchEmailAccounts()`**.

### Solucion

Modificar el `useEffect` en `src/components/email/ComposeEmail.tsx` (linea 131-133) para que tambien llame a `fetchEmailAccounts()` cuando el compositor se abre:

```typescript
useEffect(() => {
  if (open) {
    fetchSignatures();
    fetchEmailAccounts();
  }
}, [open, user]);
```

### Archivo a modificar

| Archivo | Cambio |
|---|---|
| `src/components/email/ComposeEmail.tsx` | Anadir `fetchEmailAccounts()` al `useEffect` de la linea 131 |

Este cambio de una sola linea hara que el desplegable "De" muestre `emilio.mulet@globaldatacare.es` cada vez que se abra el compositor.

