

# Revision de Errores y Mejoras del CRM

## Errores Detectados

### 1. CRITICO - Lusha API: Header de autorizacion incorrecto
En `supabase/functions/enrich-lusha-contact/index.ts` (linea 47), el header se envia como `"api_key": "Bearer ..."`. Segun la documentacion de Lusha, el header correcto es `"api_key": "TU_API_KEY"` (sin el prefijo "Bearer"). Esto causa que TODAS las llamadas a Lusha fallen con error de autorizacion.

**Correccion:** Cambiar linea 47 de:
```
"api_key": `Bearer ${lushaApiKey}`,
```
a:
```
"api_key": lushaApiKey,
```

### 2. CRITICO - Seguridad: Edge Functions sin verificacion JWT
Las 3 Edge Functions (`chat`, `send-email`, `enrich-lusha-contact`) tienen `verify_jwt = false` en `supabase/config.toml`. Cualquier persona puede llamar a estas funciones sin estar autenticado, lo que permite:
- Usar creditos de IA del chat sin limite
- Enviar emails desde tu cuenta
- Gastar creditos de Lusha sin control

**Correccion:** Cambiar `verify_jwt = true` para las 3 funciones y ajustar las llamadas del frontend para incluir el token de autorizacion del usuario (ya lo hace `chat-stream.ts` parcialmente pero usando la anon key, no el token del usuario).

### 3. CRITICO - Seguridad: RLS permisivas (USING true)
4 politicas RLS usan `true` como condicion, dejando tablas abiertas a cualquier usuario autenticado:
- `projects`: cualquier usuario puede ver, editar y eliminar TODOS los proyectos de TODOS los usuarios
- `project_partners`: cualquier usuario puede gestionar partners de cualquier proyecto
- `profiles`: lectura publica (aceptable)

**Correccion:** Cambiar las politicas de `projects` y `project_partners` para filtrar por `created_by = auth.uid()` o un campo de membresía.

### 4. MEDIO - Dashboard: falta Skeleton en tarjetas principales
Las tarjetas de la seccion principal del Dashboard (Empresas, Contactos, etc.) no tienen estado de carga. Muestran "0" mientras se cargan los datos, dando impresion de base vacia.

**Correccion:** Usar `Skeleton` en las 5 tarjetas principales, igual que ya se hace en la seccion Lusha.

### 5. MENOR - Tipado: uso excesivo de `as any`
En `ContactProfile.tsx`, los campos Lusha se acceden con `(contact as any).work_email`, `(contact as any).lusha_status`, etc. Aunque la interfaz `Contact` ya define estos campos como opcionales, el codigo los castea innecesariamente.

**Correccion:** Eliminar los cast `as any` y usar directamente `contact.work_email`, `contact.lusha_status`, etc., ya que la interfaz ya los tiene definidos.

### 6. MENOR - Chat: posible fuga de memoria
En `Index.tsx`, `uploadFilesToStorage` se ejecuta con `.catch(console.error)` en segundo plano sin cancelacion. Si el usuario navega fuera antes de completar, la promesa queda huerfana.

---

## Mejoras Propuestas

### 7. Enriquecer Lusha en lote (batch controlado)
Agregar un boton "Enriquecer pendientes" en la pagina de Contactos que procese de a 1 contacto con confirmacion, mostrando progreso. Esto evita clics repetitivos sin gastar todos los creditos de golpe.

### 8. Chat IA con acceso a datos reales del CRM
Actualmente el chat no consulta la base de datos. Agregar herramientas (function calling) para que la IA pueda responder preguntas como "cuantos leads tengo" o "dame el email de Juan" consultando las tablas directamente.

### 9. Grafico de embudo de ventas en Dashboard
Agregar un grafico de barras/embudo con Recharts mostrando contactos por etapa (Nuevo Lead, Contactado, Propuesta, Cliente, Perdido).

### 10. Actividad reciente en Dashboard
Mostrar las ultimas 5-10 acciones: contactos creados, emails enviados, tareas completadas, enriquecimientos Lusha.

---

## Plan de Implementacion

### Archivos a modificar:
1. **supabase/functions/enrich-lusha-contact/index.ts** - Corregir header `api_key` (quitar "Bearer")
2. **supabase/config.toml** - Cambiar `verify_jwt = true` en las 3 funciones
3. **src/lib/chat-stream.ts** - Enviar token JWT del usuario en lugar de la anon key
4. **src/components/contacts/ContactProfile.tsx** - Pasar token JWT en `supabase.functions.invoke`, eliminar casts `as any`
5. **src/pages/Dashboard.tsx** - Agregar Skeleton a tarjetas principales
6. **Migracion SQL** - Corregir RLS de `projects` y `project_partners` para filtrar por usuario

### Seccion tecnica - Correccion JWT en chat-stream:

```text
Actual:  Authorization: Bearer {ANON_KEY}
Correcto: Authorization: Bearer {USER_SESSION_TOKEN}
```

Para obtener el token del usuario se usa `supabase.auth.getSession()` y se pasa `session.access_token` en el header. Esto permite que las Edge Functions validen que el usuario esta autenticado.

### Seccion tecnica - Correccion RLS projects:

```sql
-- Reemplazar politicas permisivas por restrictivas
DROP POLICY "Authenticated can view projects" ON projects;
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (created_by = auth.uid());

-- Repetir para UPDATE, DELETE, INSERT
```

### Orden de ejecucion:
1. Corregir header Lusha (impacto inmediato en funcionalidad)
2. Corregir seguridad JWT + RLS (proteccion de datos)
3. Agregar Skeleton y limpiar tipado (calidad de codigo)
4. Mejoras opcionales (embudo, actividad, batch Lusha)

