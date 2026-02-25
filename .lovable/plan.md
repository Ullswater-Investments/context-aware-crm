

## Plan: Diagnosticar y corregir el enriquecimiento Apollo

### Problema detectado
Se probaron 4 contactos con dominios grandes (fenin.es, hmhospitales.com, vitaldent.com, sanitas.es) y **todos devuelven "not_found"**. Esto es anormal -- Apollo deberia tener datos de al menos algunos de estos contactos en empresas conocidas.

La causa mas probable: la funcion NO loggea la respuesta real de Apollo cuando falla. Si la API key es invalida/expirada o el rate limit se alcanzo, la funcion lo enmascara silenciosamente como "not_found".

### Cambios propuestos

#### 1. Agregar logging de diagnostico a la edge function
Modificar `supabase/functions/enrich-apollo-contact/index.ts` para:

- Loggear el status HTTP y el body de la respuesta de Apollo cuando `apolloResponse.ok` es false
- Loggear el body de la respuesta tambien cuando es exitosa pero `person` es null
- Devolver el codigo de error real de Apollo al frontend en vez de siempre decir "not_found"

```text
Antes:
  if (!apolloResponse.ok) {
    // silenciosamente marca como not_found
  }

Despues:
  if (!apolloResponse.ok) {
    const errorBody = await apolloResponse.text();
    console.error("Apollo API error:", apolloResponse.status, errorBody);
    // devolver el error real al frontend
  }
```

#### 2. Distinguir errores de API de "no encontrado"
Cuando Apollo devuelve un error HTTP (401, 403, 429, 500), NO marcar el contacto como `not_found` (para poder reintentar). Solo marcar como `not_found` cuando Apollo devuelve 200 pero sin datos.

- Error HTTP -> devolver error al frontend, NO actualizar apollo_status
- 200 sin person -> marcar como `not_found`
- 200 con person -> marcar como `enriched`

#### 3. Loggear tambien la respuesta exitosa sin datos
Cuando Apollo devuelve 200 pero `person` es null, loggear la respuesta completa para verificar si la estructura de la API ha cambiado.

### Archivos a modificar

1. **supabase/functions/enrich-apollo-contact/index.ts**
   - Lineas 108-120: agregar logging del error HTTP y devolver error real
   - Lineas 122-133: agregar logging cuando person es null
   - No marcar `apollo_status = "not_found"` en caso de error HTTP (solo en caso de 200 sin datos)

### Resultado esperado
Tras desplegar, podremos ver en los logs exactamente que responde Apollo y diagnosticar si es un problema de API key, rate limit, o simplemente datos no encontrados.
