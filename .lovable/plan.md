

## Plan: Gestor de Emails integrado

### Enfoque

En lugar de integrar un gestor de emails externo (que requeriria conexion IMAP/OAuth con Gmail/Outlook y seria complejo), vamos a construir un **gestor de emails interno** que aprovecha la infraestructura que ya tienes:

- Ya tienes **Resend** configurado para enviar emails
- Ya tienes la tabla **email_logs** con todo el historial de envios
- Ya tienes el componente **ComposeEmail** para redactar

El gestor sera una pagina completa con: bandeja de enviados, redaccion de nuevos emails, vista detallada de cada email, filtros y busqueda.

---

### Cambios a realizar

#### 1. Nueva pagina: `src/pages/Emails.tsx`

Pagina principal del gestor con tres secciones:

- **Barra lateral izquierda**: Acciones rapidas (Redactar nuevo) y filtros (Todos, Enviados, Fallidos, Por contacto, Por organizacion)
- **Lista central**: Tabla/lista de emails de `email_logs` ordenados por fecha, con busqueda por destinatario o asunto
- **Panel derecho** (opcional): Vista previa del email seleccionado mostrando el HTML renderizado

Funcionalidades:
- Consulta `email_logs` filtrado por `created_by = usuario actual`
- Busqueda por `to_email`, `subject`
- Filtros por `status` (sent/failed)
- Paginacion
- Boton "Redactar" que abre el componente ComposeEmail existente
- Vista detallada de cada email enviado (asunto, destinatario, fecha, cuerpo HTML, estado, contacto/organizacion asociados)
- Indicador visual de estado (verde=enviado, rojo=fallido)

#### 2. Actualizar sidebar: `src/components/layout/AppLayout.tsx`

- Importar icono `Mail` de lucide-react
- Anadir `{ to: "/emails", icon: Mail, label: "Emails" }` al array `navItems`, entre "Tareas" y el final

#### 3. Actualizar rutas: `src/App.tsx`

- Importar la nueva pagina `Emails`
- Anadir `<Route path="/emails" element={<Emails />} />` dentro de las rutas protegidas

#### 4. Mejorar ComposeEmail: `src/components/email/ComposeEmail.tsx`

- Anadir campo CC y BCC (opcionales, colapsables)
- Callback `onSent` ya existe, se reutiliza para refrescar la lista

---

### Diseno de la pagina Emails

```text
+------------------+-----------------------------+---------------------+
|  ACCIONES        |  LISTA DE EMAILS            |  VISTA PREVIA       |
|                  |                             |                     |
|  [+ Redactar]    |  Buscar... [____]           |  Asunto: ...        |
|                  |                             |  Para: ...          |
|  FILTROS         |  email1@... - Asunto 1  OK  |  Fecha: ...         |
|  - Todos (24)    |  email2@... - Asunto 2  OK  |  Estado: Enviado    |
|  - Enviados (22) |  email3@... - Asunto 3  ERR |                     |
|  - Fallidos (2)  |  ...                        |  [Cuerpo HTML]      |
|                  |                             |                     |
+------------------+-----------------------------+---------------------+
```

### Archivos a crear/modificar

1. **`src/pages/Emails.tsx`** -- nueva pagina completa del gestor
2. **`src/components/layout/AppLayout.tsx`** -- anadir "Emails" al menu
3. **`src/App.tsx`** -- anadir ruta `/emails`

No se necesitan cambios en base de datos ni edge functions: la tabla `email_logs` ya tiene toda la informacion necesaria.

