

# Plan: Integrar Hunter.io Domain Search en GLOBAL DATA CARE

## Resumen

Se creara una integracion con la API de Hunter.io que permite buscar correos electronicos de una empresa introduciendo solo su dominio (ej: `vitaldent.com`). Los resultados se pueden importar directamente como contactos al CRM.

## Paso 1: Guardar la API Key de Hunter.io

Se almacenara de forma segura la clave API que has proporcionado como secreto del backend (`HUNTER_API_KEY`).

## Paso 2: Crear la funcion backend `hunter-domain-search`

Nueva funcion que:
- Recibe un dominio (ej: `vitaldent.com`)
- Llama a `https://api.hunter.io/v2/domain-search` con la API key
- Devuelve: patron de correo de la empresa, lista de emails con nombre, cargo y puntuacion de confianza
- Valida el token JWT del usuario

## Paso 3: Crear componente `HunterSearch`

Un dialogo modal con:
- Input para introducir el dominio (limpia automaticamente https://, www., etc.)
- Seccion de resultados que muestra:
  - El patron de correo de la empresa (ej: `{first}.{last}@empresa.com`) destacado visualmente
  - Lista de emails encontrados con checkboxes, mostrando nombre, cargo, email y score de confianza (badge verde >80%, amarillo >50%, rojo <50%)
- Herramienta "Generar email manual": si no aparece el contacto deseado, el usuario escribe nombre y apellido y se genera el email usando el patron detectado
- Boton "Importar seleccionados" que crea los contactos en la base de datos con status `new_lead`

## Paso 4: Integrar en la pagina de Contactos

- Nuevo boton "Hunter.io" en la barra de herramientas junto a "Importar" y "Nuevo contacto"
- Al pulsarlo se abre el dialogo de HunterSearch

## Paso 5: Integrar en la pagina de Organizaciones

- Para organizaciones que tengan campo `website`, mostrar un boton "Buscar emails" que abre HunterSearch con el dominio pre-rellenado

## Seccion Tecnica

### Archivos a crear

1. `supabase/functions/hunter-domain-search/index.ts` - Edge function que llama a la API de Hunter.io
2. `src/components/contacts/HunterSearch.tsx` - Componente de busqueda y resultados

### Archivos a modificar

3. `supabase/config.toml` - Añadir configuracion de la nueva funcion
4. `src/pages/Contacts.tsx` - Añadir boton Hunter.io
5. `src/pages/Organizations.tsx` - Añadir boton "Buscar emails" en organizaciones con website

### Secret necesario

- `HUNTER_API_KEY` con el valor proporcionado por el usuario

### Endpoint de Hunter.io

```text
GET https://api.hunter.io/v2/domain-search?domain={domain}&api_key={key}

Respuesta relevante:
- data.pattern: patron de correo (ej: "{first}.{last}")
- data.emails[]: lista con value, type, confidence, first_name, last_name, position
```

