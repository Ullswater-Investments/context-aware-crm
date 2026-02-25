

## Plan: Bandeja de Email Multicuenta con Carpetas por Cuenta y Vista Unificada

### Objetivo

Redisenar la pagina de Emails para que el sidebar izquierdo muestre carpetas dinamicas (Inbox / Enviados) por cada cuenta registrada en `email_accounts`, una Bandeja Unificada que agrupe todo, y un buscador global. Cada email en la lista mostrara un badge de identidad de cuenta.

---

### 1. Redisenar el Sidebar de `Emails.tsx`

**Estado actual:** El sidebar tiene filtros estaticos (Todos, Recibidos, Enviados, Fallidos).

**Nuevo diseno:**

```text
+---------------------------+
| [+ Redactar]              |
| [Sincronizar v]           |
|---------------------------|
| VISTAS GLOBALES           |
|   Bandeja Unificada (12)  |
|---------------------------|
| v GLOBAL DATA CARE        |
|     Inbox (5)             |
|     Enviados (3)          |
| v NEXT GENERATION         |
|     Inbox (4)             |
|     Enviados (2)          |
+---------------------------+
```

- Usar `Accordion` (Radix) para secciones colapsables por cuenta
- Cada cuenta se carga dinamicamente desde `email_accounts`
- Contadores por carpeta usando queries `count: "exact", head: true`

### 2. Nuevo estado de filtrado

Reemplazar `statusFilter` por un sistema de dos variables:

| Variable | Tipo | Valores |
|---|---|---|
| `selectedAccountId` | `string` | `"all"` o UUID de cuenta |
| `selectedFolder` | `string` | `"inbox"` o `"sent"` |

### 3. Logica de consulta actualizada

La query principal de `fetchEmails` cambia segun la seleccion:

- **Bandeja Unificada (`all` + `inbox`)**: Trae todos los emails `direction = 'inbound'` (de cualquier cuenta del usuario)
- **Cuenta especifica + Inbox**: Filtra `direction = 'inbound'` AND (`to_email = account.email_address` OR `from_email` para outbound)
- **Cuenta especifica + Sent**: Filtra `direction = 'outbound'` AND `from_email = account.email_address`

Para filtrar por cuenta usaremos `from_email` (para enviados) y `to_email` (para recibidos), comparando con el `email_address` de la cuenta seleccionada.

### 4. Badge de identidad en la lista de emails

Cada fila de email en la lista central mostrara un pequeno badge de color que identifica a que cuenta pertenece:

- Color dinamico por cuenta (primer cuenta = azul, segunda = purpura, etc.)
- Texto abreviado del nombre de la cuenta (ej: "GDC", "NextGen")
- Solo visible en la vista unificada

### 5. Buscador global

El buscador existente ya busca por `to_email` y `subject`. Lo ampliaremos para buscar tambien por `from_email` y `body_text`, y funcionara en cualquier vista (unificada o por cuenta).

### 6. Contadores por carpeta

Para cada cuenta, calcularemos:
- **Inbox count**: `direction = 'inbound'` AND (`to_email` contiene el email de la cuenta)
- **Sent count**: `status = 'sent'` AND `direction = 'outbound'` AND (`from_email` contiene el email de la cuenta)
- **Unificada count**: suma de todos los inbox

### 7. Mobile: filtros adaptados

En mobile, los filtros del sidebar se mostraran como chips horizontales con el nombre abreviado de la cuenta + carpeta seleccionada.

---

### Archivos a modificar

| Archivo | Cambios |
|---|---|
| `src/pages/Emails.tsx` | Redisenar sidebar completo: Accordion multicuenta, Bandeja Unificada, badge de identidad, nueva logica de filtrado, buscador ampliado |

### Flujo del usuario

```text
1. Entra a Emails -> Ve "Bandeja Unificada" seleccionada por defecto
2. Ve todos los emails recibidos de ambas cuentas, con badges "GDC" (azul) y "NextGen" (purpura)
3. Busca "inversores" -> resultados de ambas cuentas
4. Despliega "Next Generation" -> Click en "Inbox" -> solo emails recibidos en esa cuenta
5. Click en "Enviados" -> solo emails enviados desde esa cuenta
6. Vuelve a "Bandeja Unificada" para ver el panorama completo
```

