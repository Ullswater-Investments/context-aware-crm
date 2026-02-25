

## Plan: Importar ~50 contactos nuevos del PDF "Directorio de Profesionales y Clinicas"

### Contexto
El PDF contiene contactos de profesionales de clinicas dentales, medicas y veterinarias. Tras cruzar con la base de datos:
- **1 contacto ya existe**: Eduardo Ausin Puertas (Clinica Dental Velazquez)
- **2 excluidos**: "Clinica Spinal" (cuenta de empresa, no persona), "LUIS EDUARDO" (nombre incompleto)
- **~50 contactos nuevos** a crear
- **4 organizaciones ya existen**: Sanitas, Vitaldent Group, Clinica Dental Velazquez, Vivanta (si existe como tal)

### Contactos nuevos a crear (por pagina del PDF)

**Pagina 1** (11 contactos):
1. Alvaro Sanchez Leon - Clinica Universidad de Navarra - C. Marquesado de Sta. Marta, 1, 28027 Madrid
2. Alvaro Otero - Clinica Oterocampos
3. Angel Ruiz Serna - Alegra Clinica Dental
4. Alfonso Cano Jimenez - Grupo Vitaldent (ya existe) - C. de la Basilica, 17, 28020 Madrid
5. Angel Luis Romero Saz - Sanitas Milenium Dental (usar Sanitas existente) - C. de Ribera del Loira, 52, 28042 Madrid
6. Adrian Rosales - Zaldent
7. Abad Chaaban - Clinica Villacerrada
8. Victor Gonzalez Castillo - CLINICA DENTAL VILLAMURIEL SLP
9. Saul Alarza Palacios - CLINICA DENTAL NOROESTE SL
10. Miguel Alamillo Exposito - Clinica Rementeria - C. de Almagro, 36, 28010 Madrid
11. Ricardo Romero Martin - Clinica Oftalmologica Castilla

**Pagina 2** (12 contactos):
12. Raul De Pablo Acedo - Vivanta - vivantadental.es - C. de la Basilica, 17, 28020 Madrid
13. Alvaro Pena Duran - DENTAL STAR SL
14. Arturo Sastre Hernandez - Clinica Sastre - clinicasastre.es
15. Gonzalo Fernandez Alonso - Clinica Dental Puerta de Toledo - clinicadentalpuertadetoledo.es
16. Fernando Garcia Rodriguez - Clinica Madrid - clinicamadrid.com
17. Sergio Hernandez Escacha - SoyDentaria - soydentaria.es
18. Fernando Itza - Clinica Itza - clinicaitza.com
19. Alvaro Vicente Tejerina - Clinica de Fisioterapia Alvaro Vicente Tejerina
20. Carlos Gomez Mira - Clinica Miradent - miradent.es
21. Julia Berrendero - Cuerpo Libre - cuerpolibre.es
22. Gustavo Gastaldi Zanuttini - Clinica BISHEIMER - clinicabisheimer.es
23. Miguel Angel Gismero Corpas - Sanitas (ya existe) - C. de Ribera del Loira, 52, 28042 Madrid

**Pagina 3** (13 contactos):
24. Inge Kormelink - Clinica Tambre - clinicatambre.com - C. de Tambre, 8, 28002 Madrid
25. Jose Miguel Bajo - Clinica CABA
26. Alberto Moreno Pavon - CLINICA LEGANES
27. Sara Benamar - Clinica Pie Vital - clinicapievital.es
28. Vicente Badajoz - Clinica Ginefiv - ginefiv.com
29. Jorge Garrido Blazquez - Epione Clinica Dental
30. Marco Herrera - Grupo Vitaldent (ya existe) - C. de la Basilica, 17, 28020 Madrid
31. Yolanda Bravo Garcia - Grupo Vitaldent (ya existe) - C. de la Basilica, 17, 28020 Madrid
32. Gerardo A. Garcia Perez - GH Clinica Dental
33. Maurizio Vivas Di Cesare - Clinica Trevi - clinicatrevi.com
34. Santos Gonzalez Chaparro - PHYSIOSAN
35. Dr. Angel Martin Hernandez - CLINICA MENORCA - clinicamenorca.com - C. de Menorca, 12, 28009 Madrid
36. Alberto Diaz Alvarez - Clinica Blife - blife.es

**Pagina 4** (12 contactos):
37. Carlos Zarazaga Fresnillo - (sin empresa clara)
38. Javier Vega Puerta - Clinica Vega
39. Jose Carlos Salguero Rincon - Vivanta - vivantadental.es - C. de la Basilica, 17, 28020 Madrid
40. Santiago Palacios - Clinica Palacios - clinicapalacios.com
41. Jose Luis Esquivias Diaz - Clinica Dental Villaverde Alto
42. Pepe Correonero - Sanitas (ya existe) - C. de Ribera del Loira, 52, 28042 Madrid
43. Ruben Blanco Arnaiz - Soy Dentaria - soydentaria.es
44. Sergio Ramos Gonzalez - CLINICAS UNIDENTAL - unidental.es
45. Pedro Arquero - Clinica Dr Arquero - clinicaarquero.com
46. Teresa Perez-Espinosa - Clinica Perez-Espinosa - clinicaperezespinosa.com
47. Daniel Sanchez Vicario - Clinica Dental Sanchez Gonzalez
48. Dr. Julian Bayon - Clinica Bayon

**Pagina 4 (cont) + Pagina 5** (3 contactos):
49. Susana Nieto - Puerta de Alcala Clinica Dental
50. Natalia Parada - Clinica Llado (veterinaria)
51. Jesus Lozano Rey - Clinica Veterinaria Zarey (veterinaria)

**Excluidos:**
- Clinica Spinal (es cuenta de empresa, no persona)
- LUIS EDUARDO (nombre incompleto, sin apellido)
- Fidel Egas / Banco Pichincha (sector financiero, no relevante)
- Eduardo Ausin Puertas (ya existe en BD)

### Cambios a realizar

#### 1. Crear ~35 organizaciones nuevas
Clinica Universidad de Navarra, Clinica Oterocampos, Alegra Clinica Dental, Zaldent, Clinica Villacerrada, CLINICA DENTAL VILLAMURIEL SLP, CLINICA DENTAL NOROESTE SL, Clinica Rementeria, Clinica Oftalmologica Castilla, Vivanta, DENTAL STAR SL, Clinica Sastre, Clinica Dental Puerta de Toledo, Clinica Madrid, SoyDentaria, Clinica Itza, Clinica de Fisioterapia Alvaro Vicente Tejerina, Clinica Miradent, Cuerpo Libre, Clinica BISHEIMER, Clinica Tambre, Clinica CABA, CLINICA LEGANES, Clinica Pie Vital, Clinica Ginefiv, Epione Clinica Dental, GH Clinica Dental, Clinica Trevi, PHYSIOSAN, CLINICA MENORCA, Clinica Blife, Clinica Vega, Clinica Palacios, Clinica Dental Villaverde Alto, CLINICAS UNIDENTAL, Clinica Dr Arquero, Clinica Perez-Espinosa, Clinica Dental Sanchez Gonzalez, Clinica Bayon, Puerta de Alcala Clinica Dental, Clinica Llado, Clinica Veterinaria Zarey

(Se reutilizaran las existentes: Sanitas, Vitaldent Group, Clinica Dental Velazquez)

#### 2. Insertar 51 contactos nuevos
Cada contacto con `full_name`, `organization_id`, `postal_address` (cuando disponible), `status` = 'new_lead', `created_by`.

#### 3. Actualizar websites de organizaciones nuevas
Las organizaciones que tienen URL en el PDF se crearan directamente con el campo `website` rellenado.

### Archivos a modificar
1. **Nueva migracion SQL** -- Crear organizaciones con websites, insertar 51 contactos con direcciones postales

### Resultado esperado
La base de datos pasara de ~214 contactos a ~265 contactos.

