

## Plan: Eliminar Bandeja Unificada y Dejar Solo Carpetas por Cuenta

### Objetivo

Eliminar la seccion "Vistas Globales" y la "Bandeja Unificada" del sidebar, dejando unicamente las secciones por cuenta (Global Data Care / Next Generation) con sus carpetas Inbox y Enviados independientes.

---

### Cambios en `src/components/email/EmailSidebar.tsx`

- Eliminar el bloque "Vistas Globales" (lineas 108-126): quitar la seccion completa con el boton "Bandeja Unificada"
- Eliminar `unifiedCount` de las props (ya no se necesita)
- Eliminar la variable `isUnified`
- Eliminar el import de `LayoutGrid` (ya no se usa)

### Cambios en `src/pages/Emails.tsx`

- Cambiar el estado inicial de `selectedAccountId` de `"all"` a seleccionar la primera cuenta disponible automaticamente (via `useEffect` cuando se cargan las cuentas)
- Eliminar el estado `unifiedCount` y su calculo
- Eliminar la prop `unifiedCount` del componente `EmailSidebar`
- En `fetchEmails`: eliminar el bloque `if (selectedAccountId === "all")` — si no hay cuenta seleccionada, simplemente no cargar nada
- En la lista de emails: eliminar la logica del badge de cuenta en vista unificada (lineas 303-313)
- Mobile: eliminar el boton "Unificada" (lineas 224-232) y el import de `LayoutGrid`
- Eliminar `getMobileFolderLabel` si no se usa en otro sitio

### Comportamiento por defecto

Al entrar en `/emails`, el sistema seleccionara automaticamente la primera cuenta disponible y mostrara su Inbox. Si no hay cuentas configuradas, mostrara un mensaje invitando a configurar una.

### Archivos a modificar

| Archivo | Cambios |
|---|---|
| `src/components/email/EmailSidebar.tsx` | Eliminar seccion "Vistas Globales", limpiar props |
| `src/pages/Emails.tsx` | Eliminar logica unificada, auto-seleccionar primera cuenta, limpiar badges |

