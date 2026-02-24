

# Plan: Panel de Estadisticas Lusha + Filtros Avanzados en Contactos

## Resumen

Agregar dos mejoras clave al CRM:
1. Un panel de estadisticas de enriquecimiento Lusha en el Dashboard, con metricas de creditos consumidos y estado de los contactos.
2. Filtros avanzados en la pagina de Contactos (por estado Lusha, cargo y texto) con boton de limpiar filtros.

---

## Parte 1: Panel DashboardStats (Metricas Lusha)

### Que se hara

Agregar una nueva seccion en `src/pages/Dashboard.tsx` que muestre 4 tarjetas con metricas calculadas desde la tabla `contacts`:

| Tarjeta | Metrica | Icono | Color |
|---------|---------|-------|-------|
| Total Contactos | COUNT(*) | Users | azul |
| Pendientes | WHERE lusha_status = 'pending' | Clock | gris |
| Enriquecidos | WHERE lusha_status = 'enriched' | CheckCircle | verde |
| Creditos Estimados | = cantidad de enriched (1 credito c/u) | CreditCard | naranja |

### Detalles tecnicos

- Se agregan 4 consultas count al `useEffect` existente del Dashboard, filtrando por `lusha_status`
- Se usa el componente `Skeleton` para estado de carga
- Grid responsivo: 1 col movil, 2 tablet, 4 escritorio
- Se integra debajo de las tarjetas principales existentes, con un titulo de seccion "Enriquecimiento Lusha"

### Archivo a modificar
- `src/pages/Dashboard.tsx`

---

## Parte 2: Filtros Avanzados en Contactos

### Que se hara

Agregar una barra de filtros inline en `src/pages/Contacts.tsx` con 3 controles:

1. **Buscador de texto** (ya existe): Extender para buscar tambien por `position` y nombre de organizacion
2. **Filtro por Estado Lusha**: Dropdown con opciones: Todos / Pendiente / Enriquecido / No encontrado
3. **Filtro por Cargo**: Input de texto para filtrar por `position` (coincidencia parcial)
4. **Boton "Limpiar filtros"**: Icono FilterX que resetea todos los filtros

### Detalles tecnicos

- Nuevos estados: `lushaFilter` (string: "" | "pending" | "enriched" | "not_found") y `positionFilter` (string)
- Los filtros se aplican en el lado del cliente sobre los contactos ya cargados (no requiere nuevas queries a la BD)
- Se usa `Select` de shadcn/ui para el dropdown de estado Lusha
- Se agrega el icono `FilterX` para limpiar filtros
- La barra de filtros reemplaza el buscador simple actual con un layout en grid responsivo

### Archivo a modificar
- `src/pages/Contacts.tsx`

---

## Seccion Tecnica

### Archivos a modificar:
1. **src/pages/Dashboard.tsx** - Agregar seccion de metricas Lusha con Skeleton loading
2. **src/pages/Contacts.tsx** - Agregar filtros por lusha_status, position y boton limpiar

### No se necesitan cambios de base de datos
- Todas las columnas necesarias (`lusha_status`, `position`) ya existen en la tabla `contacts`

### Flujo de las metricas del Dashboard:

```text
useEffect al montar Dashboard
        |
        v
Promise.all([
  ...consultas existentes (orgs, contacts, projects, tasks, docs),
  contacts WHERE lusha_status = 'pending' (count),
  contacts WHERE lusha_status = 'enriched' (count),
  contacts WHERE lusha_status = 'not_found' (count)
])
        |
        v
Renderizar 4 tarjetas con Skeleton mientras carga
```

### Flujo de filtros en Contactos:

```text
Usuario cambia filtro (texto, estado Lusha, cargo)
        |
        v
Array.filter() sobre contactos en memoria
        |
        v
Filtro texto: full_name, email, tags, position, org name
Filtro Lusha: lusha_status === valor seleccionado
Filtro cargo: position.includes(texto)
        |
        v
Lista/Kanban se actualiza en tiempo real
```

