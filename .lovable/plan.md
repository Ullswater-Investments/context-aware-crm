
Objetivo: hacer un diagnóstico/reparación completa de Findymail para que el usuario vea exactamente por qué falla y para que el enriquecimiento vuelva a funcionar de forma confiable.

Resumen del diagnóstico ya realizado:
1) Secreto: `FINDYMAIL_API_KEY` sí está configurado en backend.
2) Configuración de función: `enrich-findymail-contact` está registrada y activa.
3) Estado de datos: hay 405 contactos, 214 con dominio, y Findymail está en `pending` para todos (0 `enriched`, 0 `not_found`), lo que indica que la integración no está cerrando correctamente los resultados.
4) Código actual:
   - Sí divide `full_name` en nombre/apellido.
   - Sí limpia `http/https` y paths del dominio, pero no limpia `www.` ni casos más complejos.
   - Usa `getClaims` (más frágil) en Findymail.
   - Asume respuesta `data.email`, pero Findymail también puede devolver `contact.email`.
   - En errores HTTP devuelve mensaje poco útil para UI.

Plan de reparación (secuencial y seguro):
1) Endurecer autenticación en la función Findymail
   - Archivo: `supabase/functions/enrich-findymail-contact/index.ts`
   - Cambiar validación a `auth.getUser()` (alineado con política técnica del proyecto y consistente con otras funciones estables).
   - Mantener validación de propiedad del contacto (`created_by`).

2) Normalización robusta de dominio
   - Archivos:
     - `supabase/functions/enrich-findymail-contact/index.ts`
     - `supabase/functions/bulk-enrich/index.ts` (helper Findymail)
   - Implementar helper único de normalización:
     - elimina `http://`, `https://`
     - elimina `www.`
     - elimina path/query/hash/puerto
     - trim + lowercase
   - Si el dominio queda inválido/vacío, devolver error explícito (`invalid_domain`) sin marcar `not_found`.

3) Alinear request/response con Findymail de forma compatible
   - Archivo: `supabase/functions/enrich-findymail-contact/index.ts`
   - Mantener endpoint actual válido (`/api/search/name`) y construir payload compatible:
     - enviar `name` (full_name) y también `first_name/last_name` como compatibilidad defensiva.
   - Parsear email con fallback:
     - `data.email || data.contact?.email || null`
   - Resultado:
     - solo marcar `not_found` cuando hay 200 OK sin email.
     - en errores 4xx/5xx: devolver `api_error` + detalle, sin cambiar a `not_found`.

4) Mejorar trazabilidad y mensajes de error (diagnóstico real)
   - Archivos:
     - `supabase/functions/enrich-findymail-contact/index.ts`
     - `src/pages/Contacts.tsx`
     - `src/components/contacts/ContactProfile.tsx`
   - Backend: mapear códigos de error claros:
     - 401/403 -> `auth_error`
     - 402 -> `no_credits`
     - 423 -> `subscription_paused`
     - 429 -> `rate_limited`
     - 400 -> `invalid_payload_or_domain`
   - Frontend: mostrar toast específico según `error_code`/`message` (en vez de “Error con Findymail” genérico).

5) Corregir flujo masivo para Findymail
   - Archivo: `supabase/functions/bulk-enrich/index.ts`
   - Reutilizar normalizador robusto y parser de respuesta.
   - Mantener política correcta ya existente: errores API => `error` (reintento posible), no `not_found`.
   - En `results`, incluir detalle de error por contacto para facilitar diagnóstico.

6) Validación funcional end-to-end (obligatoria)
   - Caso A (éxito): contacto con dominio válido + nombre completo -> debe guardar `work_email`/`findymail_status=enriched`.
   - Caso B (sin resultado): 200 sin email -> `findymail_status=not_found`.
   - Caso C (fallo API): error de autenticación o créditos -> estado no cambia a `not_found`, UI muestra causa exacta.
   - Caso D (dominio sucio): `www.empresa.com/path` -> normaliza y procesa correctamente.
   - Revisar logs de la función para confirmar request/response sanitizados.

7) Higiene de seguridad
   - El token fue expuesto en conversación; incluiré recomendación operativa de rotarlo en Findymail y actualizar el secreto seguro del proyecto (sin hardcodearlo en código).

Respuesta específica a tu pregunta de nombres:
- Sí: ahora mismo el sistema ya divide `full_name` por espacios para Findymail.
- Mejora prevista: robustecer esa lógica para nombres compuestos y enviar también `name` completo para mejorar compatibilidad con la API.

Archivos que tocaré al implementar:
- `supabase/functions/enrich-findymail-contact/index.ts` (principal)
- `supabase/functions/bulk-enrich/index.ts` (consistencia en enriquecimiento masivo)
- `src/pages/Contacts.tsx` (mensajes de error más claros)
- `src/components/contacts/ContactProfile.tsx` (mensajes de error más claros)

Riesgos y mitigación:
- Riesgo: cambiar endpoint/payload incorrectamente y romper más casos.
  - Mitigación: enfoque compatible (payload dual + parser dual), pruebas por escenarios.
- Riesgo: marcar contactos erróneamente como `not_found`.
  - Mitigación: `not_found` solo con 200 OK y email ausente.
