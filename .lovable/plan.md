

## Plan: Extraer URLs de empresas de los PDFs y actualizar fichas de contacto

### Contexto
Los 3 PDFs contienen tablas con nombre de contacto, empresa y URL de la empresa. Los contactos ya existen en la base de datos pero tienen el campo `company_domain` vacio. Hay que hacer coincidir cada contacto del PDF con su registro en la base de datos y actualizar el campo `company_domain`.

### Enfoque
Ejecutar una serie de sentencias SQL UPDATE que hagan coincidir los contactos por nombre (`full_name`) y actualicen su `company_domain` con el dominio extraido de los PDFs.

### Datos extraidos de los PDFs

Se han identificado aproximadamente 80+ contactos con sus URLs. Algunos ejemplos:

| Contacto | Dominio |
|---|---|
| Alicia Cervera del Rio | grupoceosa.com |
| Eduardo Blanco | europe.gc.dental |
| Ignasi Heras | crbhealthtech.com |
| Angela Paredes | wh.com |
| Claudia Gonzalez Blanco | dentalmora.com |
| Cristina Lucas | abbott.com |
| Francisco Grau | fgrdental.com |

(y muchos mas)

### Cambios a realizar

**1. Migracion SQL** - Ejecutar un UPDATE masivo que haga coincidir contactos por `full_name` y establezca el `company_domain` correspondiente. Se usara una sentencia con multiples CASE/WHEN para actualizar todos los registros de una sola vez:

```text
UPDATE contacts 
SET company_domain = CASE 
  WHEN full_name ILIKE '%Alicia Cervera%' THEN 'grupoceosa.com'
  WHEN full_name ILIKE '%Eduardo Blanco%' THEN 'europe.gc.dental'
  -- ... (todos los contactos)
END
WHERE company_domain IS NULL 
  AND full_name ILIKE ANY(ARRAY['%Alicia Cervera%', '%Eduardo Blanco%', ...])
```

Se usara `ILIKE` para evitar problemas con acentos o variaciones menores en los nombres.

### Datos completos a mapear (todos los PDFs)

**PDF 1 - Extraccion de Datos:**
- Carlos Aparisi Vano -> docuindexa.es
- Santiago Rodriguez Sanchez-Paulete -> dcycle.io
- Jose Luis Gayo Mateo -> gribeer.com
- Nuria Garcia Ruiz -> grownow.es
- Julieta Escuti -> audidat.com
- Gerard Ghneim Peroy -> factorialhr.es
- Savio Di Donna -> universidadeuropea.com
- Estela Speroto -> g-p.com
- Jose Andres Gomez Cantero -> cima.unav.edu
- Emiliano G. Zarco -> zpsconsultores.es
- Fco. de Borja A. -> iberdrola.com
- Juanjo D. -> ontex.com
- Javier Outon -> re-inventa.es
- Guillermo Taboada -> simplicityforgrants.com
- Paloma Boutellier Moya -> allianz.es
- Sergio Gonzalez Ruiz -> sicnova3d.com
- Elara Fleitas -> clinicadentalfleitas.com
- Elena Martinez Sanz -> sespo.es
- Miguel Corrales -> baleaconsulting.com
- Miguel Angel Meco Diaz -> kalma.es
- Yingjie WENG -> eurasante.com
- Joan Urgell -> ticareimplants.com
- Ronen Horovitz -> qlone.pro
- Chloe Ho -> oodental.com
- flora luo -> shuangqifloor.com
- Pablo Ludman -> bullmarketbrokers.com
- Cosmin Dan -> roquette.com

**PDF 2 - Empresas y Contactos:**
- Alicia Cervera del Rio -> grupoceosa.com
- Eduardo Blanco -> europe.gc.dental
- Ignasi Heras -> crbhealthtech.com
- Javier Martin Ocana -> dontegroup.com
- Pilar Navarro Munoz -> fenin.es
- Javier Gago -> digitalsmiledesign.com
- Stig Nas -> incotrading.net
- Joan M. Molina -> fenin.es
- Javier Ma Gonzalez Tejera -> kodak.com
- Victor Romera -> bostonmedicalgroup.es
- Angela Paredes -> wh.com
- Rita Patricia Sousa Rodrigues -> phibo.com
- Jose Maria Fernandez -> dekra.es
- Javier Gutierrez Murphy -> fenin.es
- Jose Maria Puzo -> dexis.com
- Mariam Rico Belda -> hartmann.info
- Claudia Gonzalez Blanco -> dentalmora.com
- Cristina Lucas -> abbott.com
- Josep Maria Perez Ocana -> medtronic.com

**PDF 3 - Tabla de Datos:**
- Marta Bilbao -> vitaldent.com
- Esperanza Gross Trujillo -> straumann.com
- Berta Rodriguez Gatuellas -> vitaldent.com
- Pedro Esteban Frances -> grupohla.com
- Annabel Chaussat -> 3ds.com
- Liria Ines Oset Terrado -> turbodeco.es
- Tamara Lopez -> wtca.org
- Maria Pesquera reina -> clinicasmoonz.com
- Angel Garcia-Prieto Checa -> dontegroup.com
- Manuel Estebanez Blanco -> dontegroup.com
- Javier Gardeazabal Ispizua -> indas.com
- Jose Luis Lopez Morales -> straumann.com
- Sonia Torres Rivera -> vitaldent.com
- Ricardo Alvaro Apezteguia -> vitaldent.com
- Marta Villanueva Fernandez -> fundacionidis.com
- Juan Manuel Guinea Ramos -> becoolpublicidad.com
- Yafeht Gonzalez -> henryschein.es
- Jesus Sales -> henryschein.es
- Yolanda Murciego Orallo -> vitaldent.com
- Jose Antonio Rodriguez Hernandez -> grupoceosa.com
- Alberto Cuevas Millan -> vithas.es
- Ilenia Piccioni -> dontegroup.com
- Joana Gallego Guijarro -> vitaldent.com
- Santiago Atienza Rodriguez -> dontegroup.com
- Sofia Rubia -> vitaldent.com
- Alvaro Martin Tordera -> esic.edu
- Diego Guinea -> lilly.com
- Juan Pedro Barba Trejo -> geniova.com
- Rocio Toribio Ortiz de Zugasti -> rsi.es
- Luis Molina -> 3shape.com
- Yolanda Navarro -> vitaldent.com
- Cira Cuberes -> bain.com
- Victoria Delgado Regueiro -> dontegroup.com
- David nogales guillen -> vitaldent.com
- Carlos Santos Marques -> lusiadas.pt
- Ignacio Martin Gil -> phibo.com
- Marc Perez Pey -> hartmann.info
- Diana Silva Cruz -> dontegroup.com
- Filipa Nunes Pereira -> maexdental.com
- Alejandro Ramiro Buitrago -> aligntech.com
- Francisco Lopez -> wh.com
- Ladislao Real Mendez -> aligntech.com
- Andere Parejo Gonzalez -> vitaldent.com
- Oscar Romero Jimenez -> dontegroup.com
- Clara Esteban Escobar -> dontegroup.com
- Montserrat Lopez Ambel -> impactco.es
- Jose Manuel Mendoza Medina -> cuevasqueipo.com
- Fabrizio Serpa Industriato -> henryschein.es
- Roberto Rosso -> key-stone.it
- Ana Serrano Briegas -> dontegroup.com
- Leticia de la Pena -> nelly.es
- Ivan Villanueva Martinez -> asisadental.es
- Oscar Salamanca Garcia -> smileup.pt
- Eva Beloso -> fenin.es
- Daniel Paris Rujas -> gmdental.es
- Luis Herrero Garro -> bdo.es
- Daniel Morata -> luscofusco.com
- Dafne Berman -> pridecom.es
- Borja Alvarez -> wikendsmile.com
- Pedro Rodriguez -> kroll.com
- Aran Patino Oset -> wtca.org
- Pablo Crespo de la Cruz -> fenin.es
- Juan Carlos Perez Varela -> maexdental.com
- David Marques -> oplium.com
- Jesus Castano Navarro -> dentsplysirona.com

### Resultado esperado
Todos los contactos que coincidan por nombre tendran su campo `company_domain` actualizado, lo que permitira usar el boton "Enriquecer con Hunter.io" directamente sin necesidad de editarlos manualmente.

