

## Sistema de Envio Masivo de Emails (Campana)

### Resumen

Anadir checkboxes de seleccion en las tarjetas de contacto (Kanban y Lista) para seleccionar hasta 20 contactos y enviarles un email personalizado individualmente. Cada receptor recibe su propio email (no ve a los demas). Se reutiliza el compositor de email existente (`ComposeEmail`) con soporte para variables como `{{empresa}}`, `{{nombre}}`, `{{cargo}}`.

---

### Paso 1: Nuevos estados en `src/pages/Contacts.tsx`

Anadir estados para gestionar la seleccion de contactos y el modo campana:

- `selectedForCampaign: Set<string>` - IDs de contactos seleccionados
- `campaignMode: boolean` - activa/desactiva el modo de seleccion
- `campaignOpen: boolean` - abre el compositor en modo campana
- `campaignSending: boolean` - estado de envio masivo
- `campaignProgress: { sent: number; total: number; errors: number }` - progreso

Limite maximo: 20 contactos por campana.

### Paso 2: UI de seleccion en tarjetas Kanban y Lista

**Modo campana:**
- Boton "Campana email" en la barra de herramientas (junto a "Detectar bounces")
- Al activar, aparece un checkbox cuadrado en cada tarjeta de contacto que tenga email
- Contador visible: "X/20 seleccionados"
- Botones: "Enviar campana" (abre compositor) y "Cancelar" (desactiva modo)

**Checkbox en tarjetas:**
- Posicion: esquina superior izquierda de cada tarjeta, antes del grip handle (Kanban) o al inicio (Lista)
- Solo visible cuando `campaignMode === true`
- Solo clicable si el contacto tiene email valido (no bounced, no vacio)
- Click en checkbox NO abre el perfil del contacto (stopPropagation)

### Paso 3: Modificar `ComposeEmail` para modo campana

Anadir nuevas props opcionales:

```text
campaignContacts?: Array<{
  id: string;
  email: string;
  full_name: string;
  organization_id: string | null;
  position: string | null;
}>
```

Cuando `campaignContacts` esta presente:
- El campo "Para" muestra un badge con "X destinatarios" (no editable)
- El campo CC/BCC se oculta (cada email es individual)
- Las variables `{{nombre}}`, `{{empresa}}`, `{{cargo}}` se sustituyen por contacto
- El boton "Enviar" cambia a "Enviar campana (X emails)"

**Logica de envio:**
- Iterar sobre cada contacto seleccionado
- Para cada uno: sustituir variables en subject y body, invocar `send-email` individualmente
- Cada email se envia como BCC/privado: solo aparece el destinatario en "To"
- Mostrar progreso en tiempo real
- Al finalizar, toast con resumen: "X enviados, Y errores"

### Paso 4: Sustitucion de variables por contacto

Para cada contacto en la campana:
1. Clonar el HTML del body
2. Reemplazar `{{nombre}}` con `contact.full_name`
3. Reemplazar `{{cargo}}` con `contact.position || ""`
4. Reemplazar `{{empresa}}` consultando la organizacion del contacto (pre-cargada)
5. Reemplazar `{{email}}` con `contact.email`
6. Enviar con el subject tambien personalizado (puede contener variables)

### Paso 5: Proteccion de privacidad

- Cada email se envia con un unico destinatario en "To"
- NO se usa CC ni BCC masivo
- Cada receptor solo ve su propia direccion
- Cada `email_log` se crea individualmente con su `contact_id`

---

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/pages/Contacts.tsx` | Anadir modo campana, checkboxes en tarjetas, logica de seleccion, boton enviar campana |
| `src/components/email/ComposeEmail.tsx` | Anadir prop `campaignContacts`, modo campana con envio iterativo y sustitucion de variables |

### Flujo del usuario

```text
1. Usuario pulsa "Campana email" en toolbar
2. Aparecen checkboxes en las tarjetas
3. Selecciona hasta 20 contactos con email
4. Pulsa "Enviar campana"
5. Se abre ComposeEmail con badge "X destinatarios"
6. Redacta el email usando plantillas/variables
7. Pulsa "Enviar campana (X emails)"
8. Sistema envia 1 email individual por contacto
9. Progreso visible, resumen al finalizar
10. Modo campana se desactiva
```

### Detalle tecnico de la iteracion de envio

```text
for (const contact of campaignContacts) {
  // 1. Sustituir variables en body y subject
  // 2. Subir adjuntos (una sola vez, reutilizar paths)
  // 3. Invocar send-email con to=contact.email
  // 4. Actualizar progreso
  // 5. Si falla, registrar error y continuar con el siguiente
}
```

Los adjuntos se suben al storage UNA sola vez antes del loop, y se reutilizan los paths para todos los envios.

