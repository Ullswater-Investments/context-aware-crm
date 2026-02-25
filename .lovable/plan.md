
# Plan: Ordenar contactos por completitud de datos en columnas Kanban

## Que cambiara

En todas las columnas del Kanban (no solo "Nuevo Lead"), los contactos se ordenaran automaticamente por nivel de completitud de datos:

1. **Primero**: Contactos con email Y telefono (datos completos)
2. **Despues**: Contactos con solo email (sin telefono)
3. **Al final**: Contactos sin email ni telefono (datos incompletos)

Esto permite identificar visualmente de arriba a abajo cuales necesitan enriquecimiento.

## Seccion Tecnica

### Archivo a modificar: `src/pages/Contacts.tsx`

Modificar la funcion `getColumnContacts` (linea 159-160) para agregar logica de ordenamiento:

```typescript
const getColumnContacts = (status: string) =>
  filtered
    .filter((c) => c.status === status)
    .sort((a, b) => {
      const score = (c: Contact) => {
        const hasEmail = !!(c.email || c.work_email || c.personal_email);
        const hasPhone = !!(c.phone || c.mobile_phone || c.work_phone);
        if (hasEmail && hasPhone) return 0; // primero
        if (hasEmail) return 1;             // segundo
        return 2;                           // ultimo
      };
      return score(a) - score(b);
    });
```

Es un cambio de 1 funcion (2 lineas actuales a ~12 lineas). No requiere cambios de base de datos ni otros archivos.
