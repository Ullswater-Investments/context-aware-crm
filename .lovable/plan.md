

# CRM Inteligente con IA para Gestión de Proyectos Europeos

## Visión General
Un CRM centrado en un **chat de IA** que actúa como asistente personal para gestionar contactos, empresas, proyectos europeos y documentos. El agente IA aprende de toda la información que le proporcionas (emails, documentos, pantallazos) y construye una base de conocimiento que te permite interactuar de forma inteligente con tus datos.

---

## 1. Autenticación y Gestión de Usuarios
- Login/registro con email y contraseña
- Roles básicos: **Administrador** y **Usuario**
- Perfiles de usuario con nombre, avatar y preferencias
- Equipo de 2-5 personas con acceso compartido a los datos

## 2. Panel Principal (Dashboard)
- Resumen de actividad reciente: últimos emails, tareas pendientes, próximas reuniones
- Acceso rápido al chat IA (protagonista de la interfaz)
- Indicadores clave: contactos activos, proyectos en curso, tareas pendientes
- Notificaciones de tareas vencidas o emails sin responder

## 3. Chat de IA (Centro del CRM)
- **Interfaz de chat** como pantalla principal del CRM
- Subir documentos, pantallazos, emails directamente al chat
- El agente IA analiza y extrae información: nombres, empresas, fechas, importes
- Preguntar al agente cosas como:
  - *"Redáctame un email de respuesta a María sobre el presupuesto Lump Sum"*
  - *"¿Qué proyectos tenemos pendientes con el socio italiano?"*
  - *"Resúmeme los últimos emails con la Comisión Europea"*
- El agente usa la base de conocimiento acumulada para dar respuestas contextuales
- Historial de conversaciones guardado y organizable

## 4. Gestión de Contactos
### Empresas/Organizaciones
- Ficha de empresa: nombre, sector, país, tipo (socio, institución, cliente)
- Historial de interacciones (emails, llamadas, reuniones)
- Documentos vinculados a la empresa
- Proyectos europeos en los que participa

### Personas/Contactos
- Ficha de contacto: nombre, cargo, email, teléfono
- Vinculación a una o varias empresas
- Historial de comunicaciones
- Notas y etiquetas personalizadas

## 5. Gestión de Proyectos/Oportunidades
- Ficha de proyecto: título, convocatoria, estado (propuesta, en curso, finalizado)
- Socios del consorcio vinculados
- Documentos del proyecto (presupuestos, mandatos, informes)
- Fechas clave y deadlines
- Pipeline visual tipo Kanban para seguimiento de oportunidades

## 6. Gestión Documental
- Subida y almacenamiento de documentos (PDFs, Excel, imágenes)
- Vinculación de documentos a empresas, contactos o proyectos
- El agente IA extrae y resume el contenido de los documentos
- Búsqueda inteligente dentro de los documentos subidos

## 7. Integración de Email
- Conexión con Gmail/Google Workspace, Outlook/Microsoft 365 y cuentas IMAP
- Bandeja de entrada unificada dentro del CRM
- Envío de emails desde el CRM
- El agente IA sugiere y redacta respuestas basándose en el contexto
- Vinculación automática de emails a contactos y proyectos

## 8. Calendario y Tareas
- Calendario integrado con vista diaria, semanal y mensual
- Tipos de eventos: llamadas, reuniones, deadlines de proyecto
- Lista de tareas pendientes con prioridad y fecha límite
- Categorías: emails pendientes, llamadas, documentos por revisar
- Recordatorios y notificaciones
- El agente IA puede crear tareas y eventos cuando se lo pides en el chat

## 9. Base de Conocimiento IA
- Todo lo que subes (documentos, emails, pantallazos, notas) alimenta la base de conocimiento
- Organizada por empresa, contacto y proyecto
- El agente IA la consulta automáticamente al responder preguntas
- Crece con el uso: cuanto más usas el CRM, más inteligente se vuelve

---

## Stack Técnico
- **Frontend**: React con la interfaz actual (shadcn/ui + Tailwind)
- **Backend**: Supabase (base de datos, autenticación, almacenamiento de archivos, edge functions)
- **IA**: Lovable AI Gateway para el agente inteligente
- **Email**: Integración vía edge functions con Gmail API y Microsoft Graph API

## Fases de Implementación
1. **Fase 1**: Autenticación, dashboard, estructura de contactos/empresas/proyectos y chat IA básico
2. **Fase 2**: Gestión documental con análisis IA y base de conocimiento
3. **Fase 3**: Integración de email (recibir y enviar)
4. **Fase 4**: Calendario, tareas y recordatorios
5. **Fase 5**: Redacción inteligente de emails y automatizaciones IA avanzadas

