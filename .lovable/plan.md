

## Plan: Importar 26 contactos faltantes y actualizar websites de organizaciones

### Contexto
Se han revisado los 4 PDFs contra los 188 contactos existentes en la base de datos:
- PDFs 1-3 (xxDirectorio, Directorio, Extraccion Perfiles): Todos los contactos ya estan creados
- PDF 4 (Extraccion de Datos y URLs de Empresas): Faltan 26 contactos por crear
- Ademas, hay ~40 organizaciones existentes que no tienen website y los PDFs proporcionan esa informacion

### Contactos faltantes (PDF 4 - Extraccion de Datos y URLs)

1. Carlos Aparisi Vano - Docuindexa - docuindexa.es
2. Enrique Nunez Rosado - Dental Mancha Centro SL
3. Santiago Rodriguez Sanchez-Paulete - Dcycle - dcycle.io
4. Jose Luis Gayo Mateo - GriBeer - gribeer.com
5. Nuria Garcia Ruiz - Grownow nG - grownow.es
6. Julieta Escuti - Audidat Cumplimiento Normativo - audidat.com
7. Gerard Ghneim Peroy - Factorial - factorialhr.es
8. Savio Di Donna - Universidad Europea-Andalucia - universidadeuropea.com
9. Estela Speroto - G-P - g-p.com
10. Jose Andres Gomez Cantero - CIMA Universidad de Navarra - cima.unav.edu
11. Emiliano G. Zarco - ZPS Consultores - zpsconsultores.es
12. Fco. de Borja A. - Iberdrola - iberdrola.com
13. Juanjo D. - DIAGOD GRUP SL - ontex.com
14. Javier Outon - re-inventa - re-inventa.es
15. Guillermo Taboada - Simplicity for Grants - simplicityforgrants.com
16. Paloma Boutellier Moya - Allianz - allianz.es
17. Sergio Gonzalez Ruiz - Sicnova - sicnova3d.com
18. Elara Fleitas - Clinica Dental Fleitas - clinicadentalfleitas.com
19. Elena Martinez Sanz - SESPO - sespo.es
20. Miguel Corrales - Balea Consulting - baleaconsulting.com
21. Miguel Angel Meco Diaz - Grupo Kalma - kalma.es
22. Yingjie WENG - Eurasante - eurasante.com
23. Joan Urgell - Mozo-Grau Ticare - ticareimplants.com
24. Ronen Horovitz - EyeCue / Qlone - qlone.pro
25. Chloe Ho - OO Dental - oodental.com
26. Cosmin Dan - Roquette - roquette.com

Excluidos: bin zaman foundation (cuenta de organizacion), Equiliqua (cuenta de empresa), flora luo raised floor (irrelevante), Pablo Ludman/Bull Market (sector financiero), Vikas Choudhari (irrelevante)

### Cambios a realizar

#### 1. Crear ~22 organizaciones nuevas
Docuindexa, Dental Mancha Centro SL, Dcycle, GriBeer, Grownow nG, Audidat Cumplimiento Normativo, Factorial, G-P, CIMA Universidad de Navarra, ZPS Consultores, Iberdrola, DIAGOD GRUP SL, re-inventa, Simplicity for Grants, Allianz, Sicnova, Clinica Dental Fleitas, SESPO, Balea Consulting, Grupo Kalma, Eurasante, Mozo-Grau Ticare, EyeCue, OO Dental, Roquette

#### 2. Insertar 26 contactos nuevos
Cada contacto con `full_name`, `organization_id`, `status` = 'new_lead', `created_by`. Ninguno de estos contactos tiene direccion postal en el PDF 4.

#### 3. Actualizar websites de ~30 organizaciones existentes
Muchas organizaciones ya creadas tienen website = NULL pero los PDFs proporcionan la URL. Se actualizaran:
- Universidad CEU San Pablo -> uspceu.com
- Clinicas Carlos Pedrol -> pedrolmairal.com
- Universidad Fernando Pessoa Canarias -> ufpcanarias.es
- CRESPO DENTAL -> crespodental.es
- Fundacion Dentistas Sobre Ruedas -> dentistassobreruedas.es
- MENEDENT SL -> menedent.es
- Clinica dental medics Dr. Ferrer -> medics.es
- Universidad Complutense de Madrid -> ucm.es
- Clinica ergodent -> ergodent.es
- Universidad Rey Juan Carlos -> urjc.es
- Grupo de Odontologia Borja Diaz -> borjadiaz.com
- Universitat Internacional de Catalunya -> uic.es
- Clinica dental Dras. Nunez y Ubinas -> nunezyubinas.com
- CLINICA ORGAZ DENTAL SL -> orgazdental.com
- Asociacion de Damas Salesianas -> damassalesianas.org
- Clinicas ClearDent -> cleardent.es
- Asisa Dental SAU -> asisadental.es
- Clinica Althea -> altheadental.com
- Espacio Salud Dental -> dkv.es
- Centro Odontologico Llorente Dental -> llorentedental.co
- Clinicas Dentales CLOROFILA -> (no disponible)
- Universidad Alfonso X el Sabio -> uax.com
- Universidad Europea -> universidadeuropa.com
- AMIR OPEs -> academiamir.co
- Facultad Odontologia UCM -> odontologia.ucm.es
- Elite Dental -> elitedental.es
- DONTE GROUP -> dontegroup.com
- Dentsply Sirona -> dentsplysirona.com
- Fenin -> fenin.es
- Unexpected Productions -> (no disponible)
- VERDENTAL ODONTOLOGIA SL -> (no disponible)
- Odontologia Abulense -> (no disponible)
- Y otras con URLs disponibles

### Archivos a crear/modificar

1. **Nueva migracion SQL** -- Crear organizaciones, insertar 26 contactos, actualizar websites de organizaciones existentes

### Resultado esperado
La base de datos pasara de 188 a ~214 contactos. Las organizaciones tendran sus websites actualizados para mejor visualizacion en las tarjetas.

