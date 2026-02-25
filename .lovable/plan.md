

## Plan: Boton "Sugerir Respuesta" con selector de tono y generacion IA

### Objetivo

Añadir al panel de detalle de emails un boton "Sugerir Respuesta" con un DropdownMenu que permite elegir entre 4 tonos (Formal, Amigable, Persuasivo, Conciso). Al seleccionar un tono, se llama a una Edge Function que genera un borrador HTML usando Lovable AI, y se abre el compositor pre-rellenado con la respuesta.

No se necesitan API keys adicionales: `LOVABLE_API_KEY` ya esta configurada.

---

### 1. Nueva Edge Function: `suggest-reply`

**Archivo: `supabase/functions/suggest-reply/index.ts`**

- Recibe: `{ subject, body_text, to_email, tone }` donde tone es "formal" | "amigable" | "persuasivo" | "conciso"
- Valida JWT del usuario con `supabase.auth.getUser(token)`
- Mapa de instrucciones de tono:
  - formal: "Usa lenguaje corporativo, respetuoso y estructurado"
  - amigable: "Se calido, cercano y profesional. Puedes usar algun emoji"
  - persuasivo: "Centrate en beneficios. Usa llamadas a la accion claras"
  - conciso: "Responde en maximo 2-3 frases. Directo al grano"
- Llama a Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`) con modelo `google/gemini-3-flash-preview`
- System prompt incluye la instruccion de tono dinamica, pide respuesta en HTML (p, br, strong), en el mismo idioma del email original
- Sin streaming (respuesta completa)
- Retorna `{ suggestion: "<p>...</p>" }`
- Maneja errores 429 (rate limit) y 402 (creditos) con mensajes claros

### 2. Modificar `src/pages/Emails.tsx`

Cambios en el panel derecho (detalle del email seleccionado):

- Importar `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuTrigger` de shadcn
- Importar `Sparkles`, `ChevronDown` de lucide-react
- Nuevo estado `suggestingReply` (boolean) para el loader
- Añadir un DropdownMenu junto al boton "Reenviar" existente (linea 259-274):
  - Trigger: boton con icono Sparkles + texto "Sugerir Respuesta" + chevron
  - 4 opciones de tono: Formal, Amigable, Persuasivo, Conciso (cada una con emoji)
  - Al seleccionar un tono:
    1. Activa `suggestingReply = true`
    2. Extrae body_text del email (strip HTML si solo hay body_html)
    3. Llama a `supabase.functions.invoke("suggest-reply", { body: { subject, body_text, to_email, tone } })`
    4. Al recibir respuesta: setea `resendData` con to, subject prefijado con "Re: ", y body con el HTML sugerido
    5. Abre ComposeEmail
    6. Toast de exito o error
    7. `suggestingReply = false`
- El boton muestra Loader2 animado mientras genera

### 3. Registrar en config.toml

Se registra automaticamente. La funcion usara `verify_jwt = false` (validacion manual en codigo).

---

### Archivos a crear/modificar

1. **`supabase/functions/suggest-reply/index.ts`** (NUEVO) - Edge function con Lovable AI y selector de tono
2. **`src/pages/Emails.tsx`** - Añadir DropdownMenu de tono + logica de llamada

### Flujo del usuario

```text
Usuario selecciona email -> Panel derecho muestra detalle
-> Click en "Sugerir Respuesta" -> Aparece menu con 4 tonos
-> Selecciona "Persuasivo" -> Boton muestra "Redactando..." con spinner
-> Edge function genera HTML con tono persuasivo via Gemini
-> Se abre ComposeEmail con:
   - Para: to_email del email original
   - Asunto: "Re: [asunto original]"
   - Cuerpo: HTML generado por IA con tono seleccionado
-> Usuario revisa/edita -> Envia
```

