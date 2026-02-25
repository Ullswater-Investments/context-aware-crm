

## Plan: Crear ~35 nuevos contactos desde el PDF de Profesionales Odontologicos

### Contexto
El PDF contiene ~36 contactos profesionales del sector odontologico. De estos, 1 ya existe en la base de datos (Javier Martin Ocana) y 1 es invalido (RAF undefined). Los demas ~34 necesitan ser creados junto con sus organizaciones.

### Datos extraidos del PDF

**Pagina 1** (10 contactos):
- Andres Eduardo Lecuna Leyva (Universidad CEU San Pablo) - C. de Julian Romea, 18, 28003 Madrid
- Carlos P. (Clinicas Carlos Pedrol / Pedrol-Mairal) - Sin direccion
- Cristina Martinez (Adeslas) - P. de la Castellana, 259, 28046 Madrid
- Carla Macias (Universidad Fernando Pessoa Canarias) - C. de la Democracia, s/n, 35450 Sta. Maria de Guia, Las Palmas
- Begona Vicente Ruiz (Denpros s.l) - Sin direccion
- Eduardo Crespo (CRESPO DENTAL) - Sin direccion
- Maria Lopez Perez (Fundacion Dentistas Sobre Ruedas) - C/ de la Reina, 56, 07013 Palma, Illes Balears
- Nathalia Adobbato Rojas (Clinica dental C) - Sin direccion
- ~~RAF undefined (Sanitas) - EXCLUIDO: nombre invalido~~
- Cristina Andujar Queipo (MENEDENT SL) - Sin direccion

**Pagina 2** (13 contactos):
- Paloma Munoz Mula (Clinica dental medics Dr. Ferrer) - Sin direccion
- Elias Alvarez Cuadro (Universidad Complutense de Madrid) - Av. de Seneca, 2, 28040 Madrid
- Inaki Mendiguren Garelli (Clinica ergodent) - Sin direccion
- Diana Casanez Garcia (NORPRODENT DC / DC dental) - Sin direccion
- Eiharne Z. (Universidad Rey Juan Carlos) - C. Tulipan, s/n, 28933 Mostoles, Madrid
- Borja Diaz Oliver (Grupo de Odontologia Borja Diaz) - Sin direccion
- Ma Pilar Vargas de Pablos (Universitat Internacional de Catalunya UIC) - Carrer de la Immaculada, 22, 08017 Barcelona
- Rohelith Hidalgo (Clinica dental Dras. Nunez y Ubinas) - Sin direccion
- Natalia Moreno Perez (CLINICA ORGAZ DENTAL SL) - Sin direccion
- Victoria Diaz Diaz (Asociacion de Damas Salesianas) - Sin direccion
- Darina S. (Clinicas ClearDent) - Multiples sedes, sede central en Jaen
- Carmen Ninoska Toro Diaz (Centro odontologico AAR) - Sin direccion
- Alejandro Pena Leal (Asisa Dental SAU) - C/ Juan Ignacio Luca de Tena, 12, 28027 Madrid

**Pagina 3** (12 contactos):
- Ana Cogolludo Corroto (Clinica Althea) - Sin direccion
- David de Paz (Espacio Salud Dental / DKV) - Av. de Maria Zambrano, 31, 50018 Zaragoza
- Maria Gabriela Marini D. (Grupo Vitaldent) - C. de la Basilica, 17, 28020 Madrid
- Daniela Maya Cajiao (Centro Odontologico Llorente Dental) - Sin direccion
- Laura Perez (Sanitas / Caser Salud) - C. de Ribera del Loira, 52, 28042 Madrid
- Andrea Miranda de Pedro (Universidad San Pablo-CEU) - C. de Julian Romea, 18, 28003 Madrid
- David Carbajal Garcia (Clinicas Dentales CLOROFILA) - Sin direccion
- ~~Javier Martin Ocana (DONTE GROUP) - YA EXISTE~~
- SIMONA ALEXANDRA TANASE (Sanitas) - C. de Ribera del Loira, 52, 28042 Madrid
- Manuel Blanco Morgado (Universidad Alfonso X el Sabio) - Av. de la Universidad, 1, 28691 Villanueva de la Canada, Madrid
- Carmen Cifuentes Canorea (Universidad Europea) - C. Tajo, s/n, 28690 Villaviciosa de Odon, Madrid
- Cristina Carmona (CENTRO DENTAL VALDES SL) - Sin direccion

**Pagina 4** (3 contactos):
- Luis Ferrer Galvan (AMIR OPEs) - C/ de Arturo Soria, 336, 28033 Madrid
- Anet Suarez Hernandez (Facultad Odontologia UCM) - Plaza Ramon y Cajal, s/n, 28040 Madrid
- Paula Gutierrez Berbis (Elite Dental) - Sin direccion

### Cambios a realizar

#### 1. Crear ~25 organizaciones nuevas

Las siguientes organizaciones se crearan:
Universidad CEU San Pablo, Clinicas Carlos Pedrol, Adeslas, Universidad Fernando Pessoa Canarias, Denpros s.l, CRESPO DENTAL, Fundacion Dentistas Sobre Ruedas, Clinica dental C, MENEDENT SL, Clinica dental medics Dr. Ferrer, Universidad Complutense de Madrid, Clinica ergodent, NORPRODENT DC, Universidad Rey Juan Carlos, Grupo de Odontologia Borja Diaz, Universitat Internacional de Catalunya, Clinica dental Dras. Nunez y Ubinas, CLINICA ORGAZ DENTAL SL, Asociacion de Damas Salesianas, Clinicas ClearDent, Centro odontologico AAR, Asisa Dental SAU, Clinica Althea, Espacio Salud Dental, Centro Odontologico Llorente Dental, Clinicas Dentales CLOROFILA, Universidad Alfonso X el Sabio, Universidad Europea, CENTRO DENTAL VALDES SL, AMIR OPEs, Facultad Odontologia UCM, Elite Dental

Las organizaciones que ya existen se reutilizaran: Sanitas, Vitaldent Group, DONTE GROUP

#### 2. Insertar 34 contactos nuevos

Cada contacto con: `full_name`, `organization_id`, `postal_address` (o NULL si no disponible), `created_by`, `status` = 'new_lead'

#### 3. Actualizar Javier Martin Ocana (ya existe)

Se verificara que tenga la direccion postal correcta vinculada a DONTE GROUP.

### Archivos a modificar

1. **Nueva migracion SQL** -- insertar organizaciones nuevas + insertar 34 contactos nuevos con direcciones postales + actualizar Javier Martin Ocana si necesario

### Resultado esperado

La base de datos pasara de ~104 contactos a ~138 contactos, todos visibles en las tarjetas de contacto con el icono MapPin para los que tienen direccion postal.

