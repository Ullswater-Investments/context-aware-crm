

## Plan: Crear ~39 nuevos contactos desde el PDF

### Contexto
El PDF contiene 40 contactos profesionales. De estos, solo 1 ya existe en la base de datos (Joan M. Molina). Los demas 39 necesitan ser creados junto con sus organizaciones.

### Datos extraidos del PDF

**Pagina 1** (11 contactos):
Sara Martinez (MILOBIONIC), Javier Blanco-de-Torres (Smysecret), Carlos D. (Straumann Group/Neodent), Ramon Vila Ferreres (Ringlab), Miguel Basso (Villa Sistemi Medicali), Tibisay Vielma Toro (Instituto Medico Velazquez), Fermin F. D. (Dentalea.net), Blanca Espinar Segura (Club Clinico), Joaquin Fernandez de Prada (MVP DENTAL), Carine Derangere Lebecque (Turo Park Clinics), Christos Socratous (KlinikMatch)

**Pagina 2** (13 contactos):
Cyril Lefay (Impress), Patricia de Pablo Martinez (Quikprokuo), Aida Bononato Perez (Sanitas), Sonia Cenalmor Saez (Nemotec), Mario Del Pozo (Oracle), Elena Rivera (Dr. Riverita Dental Corp.), Sergi Olive Muntasell (Codent Healthcare Group), Carlos Adan (Schwarz IT), Sajad Ahmadi (Opal Dental Clinic), Fernando Sicilia (BQDC), Ernesto L. (Stella Mattina), Joan M. Molina (Fenin - YA EXISTE), Maria Belen Echazu Higa (SecretAligner)

**Pagina 3** (13 contactos):
Oliver Giraud (Angel Aligner), Borja del Corro Cervera (Optident Espana), Andres Zapata (Unexpected Productions), Laura H. (DONTE GROUP), Eduardo Crooke (Crooke Dental Clinics), Jose Antonio Portugal (Dolby), Jose Mauricio Mejia (Addentra Internet), Danny Pelayo Brito (EOMA), Alina Sazonova (Auditdata), Cesar Becerra Rodriguez (Vitaldent Group), Myriam Diaz (Dentsply Implants), Aitziber Iriarte del Casal (Proclinic Group), Nicolas Andres Anastasiadis (Clinica Dental Crooke & Laguna)

**Pagina 4** (7 contactos):
Teodora M. (TLM Consulting), Anna Tomas (PHC Europe), Alberto Cancelado Gonzalez (SAP/Oracle), Jorg Elbel (SIC invent Group), Wouter Slettenhaar (Chatpatient), Giorgio Mattos (Dental APSS), Olivier Grandjean (IPD Dental Gruppe Germany)

### Cambios a realizar

#### 1. Crear organizaciones nuevas (~30)

Las siguientes organizaciones se crearan con su website:
MILOBIONIC, Smysecret, Ringlab, Villa Sistemi Medicali, Instituto Medico Velazquez, Dentalea.net, Club Clinico, MVP DENTAL, Turo Park Clinics, KlinikMatch, Impress, Quikprokuo, Sanitas, Nemotec, Oracle, Dr. Riverita Dental Corp., Codent Healthcare Group, Schwarz IT, Opal Dental Clinic, BQDC, Stella Mattina, SecretAligner, Angel Aligner, Optident Espana, Unexpected Productions, Crooke Dental Clinics, Dolby, Addentra Internet, EOMA, Auditdata, Proclinic Group, TLM Consulting, PHC Europe, SIC invent Group, Chatpatient, Dental APSS, IPD Dental Gruppe Germany, SAP

Las organizaciones que ya existen se reutilizaran: Straumann Group, Fenin, DONTE GROUP, Vitaldent, Dentsply Sirona

#### 2. Insertar 39 contactos nuevos

Cada contacto se insertara con:
- `full_name`
- `organization_id` (vinculado a su empresa)
- `postal_address` (la direccion del PDF, o NULL si dice "Requiere busqueda local" o similar)
- `created_by` = '7e8a3437-8eb1-4065-8820-a2d4c1c78d2c'
- `status` = 'new_lead'

#### 3. Actualizar Joan M. Molina (ya existe)

Se actualizara su `postal_address` con la direccion del PDF si no la tiene aun, y se vinculara a la organizacion Fenin existente.

### Archivos a modificar

1. **Nueva migracion SQL** -- insertar organizaciones nuevas + insertar contactos nuevos con direcciones postales + actualizar Joan M. Molina

### Resultado esperado

La base de datos pasara de ~62 contactos a ~101 contactos, todos con sus direcciones postales visibles en las tarjetas con el icono MapPin ya implementado.

