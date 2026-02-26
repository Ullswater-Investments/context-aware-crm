

## Prospector Pro + Centro de Creditos y APIs

Este plan implementa dos nuevas secciones en el CRM: un **Dashboard de Creditos** para monitorizar el estado de las APIs, y un **Prospector Inteligente** para buscar y cualificar leads directamente desde el CRM.

---

### Fase 1: Edge Function `get-api-usage`

Crear `supabase/functions/get-api-usage/index.ts` que consulte los balances de creditos de las 4 APIs usando los Secrets ya configurados:

- **Hunter**: `GET https://api.hunter.io/v2/account?api_key=...` -- extraer `requests.searches.available`, `requests.searches.used`, `requests.verifications.available`
- **Apollo**: `GET https://api.apollo.io/v1/auth/health` con header `x-api-key` -- extraer estado de suscripcion y limites
- **Findymail**: `GET https://app.findymail.com/api/credits` con `Authorization: Bearer ...` -- extraer creditos totales
- **Lusha**: `GET https://api.lusha.com/account/usage` con header `api_key` -- extraer `remaining`, `used`, `total`

La funcion consultara las 4 APIs en paralelo (`Promise.allSettled`) y devolvera un objeto unificado con el estado de cada proveedor. Si una API falla, devolvera `status: "error"` para ese proveedor sin afectar a los demas.

Incluir autenticacion JWT y CORS headers estandar.

Anadir `[functions.get-api-usage] verify_jwt = false` en `supabase/config.toml`.

### Fase 2: Pagina Centro de Creditos (`src/pages/ApiCredits.tsx`)

Nueva pagina en la ruta `/api-credits` con:

- **Cuadricula de 4 tarjetas** (Card de shadcn/ui), una por proveedor
- Cada tarjeta muestra:
  - Icono y nombre del servicio
  - Badge de estado: "Conectado" (verde), "Error" (rojo)
  - Barra de progreso (Progress) con creditos usados vs total
  - Colores adaptativos: azul (normal), naranja (menos del 20%), rojo (menos del 5%)
  - Fecha de ultima consulta
- **Boton "Refrescar todo"** en la parte superior
- **React Query** (`useQuery`) para cachear los datos con `staleTime: 5min`

### Fase 3: Edge Function `prospector-search`

Crear `supabase/functions/prospector-search/index.ts` que actue como hub de busqueda unificado:

- Recibe `{ provider, filters }` donde filters puede incluir: `job_title`, `company`, `domain`, `location`, `industry`, `company_size`
- Segun el provider seleccionado:
  - **Apollo**: `POST https://api.apollo.io/api/v1/mixed_people/search` con filtros mapeados a `person_titles`, `organization_domains`, `person_locations`, `organization_industry_tag_ids`
  - **Hunter**: `GET https://api.hunter.io/v2/domain-search?domain=...` (reutiliza la logica existente de `hunter-domain-search`)
  - **Lusha**: `GET https://api.lusha.com/v2/person?...` con los parametros de busqueda
- Devuelve resultados normalizados con formato unificado: `{ name, position, company, domain, email, confidence, source }`
- Incluye deteccion anti-duplicados: consulta la tabla `contacts` del usuario para marcar resultados que ya existen en el CRM

Anadir `[functions.prospector-search] verify_jwt = false` en `supabase/config.toml`.

### Fase 4: Pagina Prospector (`src/pages/Prospector.tsx`)

Nueva pagina en la ruta `/prospector` con layout de dos paneles:

**Panel izquierdo (filtros):**
- Inputs: Cargo, Empresa, Dominio, Ubicacion, Industria, Tamano de empresa
- Selector de fuente: grupo de botones (Apollo / Hunter / Lusha)
- Boton "Buscar"

**Panel derecho (resultados):**
- Tabla con columnas: Nombre, Cargo, Empresa, Email, Confianza, Estado (nuevo/duplicado)
- Badge "Ya en CRM" si el contacto ya existe (detectado por email o nombre+empresa)
- Checkbox de seleccion multiple
- Boton "Importar seleccionados al CRM" que:
  1. Crea los contactos en la tabla `contacts` con `created_by = user.id`
  2. Opcionalmente lanza verificacion con Findymail para los emails importados
  3. Muestra toast con resumen: "X contactos importados, Y duplicados omitidos"

### Fase 5: Navegacion

Anadir dos entradas al sidebar en `AppLayout.tsx`:

```text
{ to: "/prospector", icon: Search, label: "Prospector" },
{ to: "/api-credits", icon: Activity, label: "Creditos APIs" },
```

Registrar las rutas en `App.tsx`:

```text
<Route path="/prospector" element={<Prospector />} />
<Route path="/api-credits" element={<ApiCredits />} />
```

---

### Archivos a crear

| Archivo | Descripcion |
|---|---|
| `supabase/functions/get-api-usage/index.ts` | Edge Function para consultar balances de creditos |
| `supabase/functions/prospector-search/index.ts` | Edge Function hub de busqueda unificada |
| `src/pages/ApiCredits.tsx` | Pagina del Centro de Creditos |
| `src/pages/Prospector.tsx` | Pagina del Prospector Inteligente |

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/components/layout/AppLayout.tsx` | Anadir 2 entradas al sidebar |
| `src/App.tsx` | Registrar 2 rutas nuevas |
| `supabase/config.toml` | Anadir configuracion de las 2 nuevas Edge Functions |

### Notas tecnicas

- Los Secrets necesarios (`HUNTER_API_KEY`, `APOLLO_API_KEY`, `LUSHA_API_KEY`, `FINDYMAIL_API_KEY`) ya estan configurados
- La deteccion anti-duplicados usara email como clave primaria y nombre+empresa como fallback
- El diseno sera extensible para anadir Crunchbase y PhantomBuster en el futuro (estructura de datos generica)
- Se usara `Promise.allSettled` para tolerancia a fallos en consultas paralelas

