

## Plan: Importar contactos del directorio de profesionales y clinicas

### Datos extraidos del PDF
Se han identificado **~55 contactos** en el documento "Directorio de Profesionales y Clinicas (Tercera Parte)". Cada contacto tiene: nombre, empresa/clinica, website (cuando disponible) y direccion postal (cuando disponible).

### Enfoque
1. **Crear organizaciones** que no existan ya en la base de datos
2. **Crear contactos** vinculados a sus organizaciones, con `company_domain` extraido del website para habilitar Hunter/Apollo/Lusha desde las tarjetas
3. Los campos email y telefono se dejaran vacios intencionalmente para que los botones de enriquecimiento (Hunter, Apollo, Lusha) los puedan buscar

### Implementacion

#### 1. Migracion SQL unica
Un solo script SQL que:
- Inserta las organizaciones nuevas (evitando duplicados con organizaciones existentes como Vitaldent, Sanitas, etc.)
- Inserta los contactos asociados a cada organizacion
- Extrae el dominio limpio del website para `company_domain`
- Asigna `postal_address` cuando esta disponible
- Todos los contactos se crean con status `new_lead` y los estados de enriquecimiento en `pending`

#### Contactos a crear (resumen):

**Pagina 1:** Dmitri Naumov (Clinica Naumoff), Nayef Abufayyad (Clinica Cisme), Jose Antonio Martin (Clinica Menorca), Marta Maria Moratinos (DermaMoratinos), Rosalia Fernandez (Dental Catalano), Marta Alvarez Amaro (Smysecret), Fernando Luque (Imboclinics), Pedro Garcia (Clinica Molinon), Marta Sanchez (CUN)

**Pagina 2:** Dr. Javier Cantero (BLife), Ana Carolina J. (Insparya), Alba Valenzuela (Sanitas), Virgilio Leal (Clinica Baviera), Jose Luis Fernandez (Dental Pedroche), Eusebio Villar (Vive-Rie), Jose Duran (Clinica Duran), Marta Fernandez-Coppel (Dental Tera), Santiago Saborido (Saborido & Rodriguez), Angelines Capuchino (Dental Capuchino), Paco Piqueras (Clinica Piqueras), Alfredo Fernandez (Clinica Fernandez Blanco)

**Pagina 3:** Andriy Masalitin (Dental Renessans), Mateo Panadero (Origen Dental), Alvaro Romero (Casanova Dental), Gabriel Costas (Face&Go), Julio Vilacoba (Caredent), Ruth Sanz (Naturadent), Oswaldo Jimenez (Dental Banquez), Alejandro Rodriguez (Vivantadental), Alejandro Nazco (Castro & Dental), Bruno Ruiz (Dental EOS), Adrian Garcia (Dental Caicoya)

**Pagina 4:** Raul Guzman (Clinica VASS), Jose Ma Nieto (Nieto y Llorens), Jesus Recio (JAR Clinica Dental), Jesus Moya (Estudio Dental Melguizo), Davinia Garcia (CD Majadahonda), Vicente Fernandez (Veterinaria Casa de Campo), Francisco Bueno (PRONOS), Marling Monasterios (Sonrisalud), Joaquin Carmona (Clinica Carmona), Laureano Alvarez-Rementeria (Clinica Rementeria), Antonio Gonzalez (Vivanta)

**Pagina 5:** Nacho Varo (Clinica Ityos), Juan Carlos Vazquez (Cemei), Antonella Rapizza (Dental Breeze), David Villanueva (Dentality), Alvaro Cuesta (Clinica Pegadas), Antonio Diaz Huertas (Ergodinamica), Maire Serrano (Vitaldent), Lucas Martin (Vitaldent), Elena Neira (Dental Belvedere), Luis Puyuelo (Clinica Puyuelo), Luis Javier Gil (Gilva), Carlos Escudero (Avance Dental)

**Pagina 6-7:** Javier Planas (Clinica Planas), Jose Angel Madrid (Titanium Dental), Francisco Latorre (KnowPain Castilla), Miguel Angel Sanz (Vitaldent), Rodolfo Lopez (Elite Laser), Joan Lopez (OralStudio), Ignacio Sagardoy (Montpellier), Fernando Martin (Clinica Arquero), Victor Ubero (Sanitas), Belinda Marin (Adelgar), Cesar Contreras (Adelgar), Angel Galindo (CEMTRO), Gonzalo Dorao (Dental Don Ramon de la Cruz)

### Detalles tecnicos

**Archivo a crear:** Nueva migracion SQL

El script SQL utilizara un bloque DO con variables temporales para:
1. Buscar organizaciones existentes por nombre (case-insensitive) antes de insertar
2. Insertar organizaciones nuevas con website y sector
3. Insertar contactos con `organization_id`, `company_domain` (dominio limpio), `postal_address`, y `created_by` del usuario actual

La migracion necesita el `user_id` del usuario autenticado. Se obtendra de la tabla `contacts` existente (tomando el `created_by` mas comun).

### Resultado esperado
- ~55 nuevos contactos creados con status `new_lead`
- Organizaciones creadas automaticamente (sin duplicar las existentes)
- `company_domain` poblado donde hay website, habilitando Hunter y Apollo desde las tarjetas
- Campos email y telefono vacios, mostrando "Sin email" / "Sin telefono" en las tarjetas
- Botones de Lusha, Hunter y Apollo visibles en cada tarjeta para enriquecer datos

