
DO $$
DECLARE
  v_user_id uuid := '7e8a3437-8eb1-4065-8820-a2d4c1c78d2c';
  v_org_id uuid;
BEGIN

  -- Helper: get or create org
  -- We'll use a pattern: try to find, if not found insert

  -- ============ PAGE 1 ============

  -- Clinica Naumoff
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Clinica Naumoff') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Clinica Naumoff', 'https://clinicanaumoff.com', 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, company_domain, postal_address, created_by) VALUES ('Dmitri Naumov', v_org_id, 'clinicanaumoff.com', NULL, v_user_id);
  v_org_id := NULL;

  -- Clinica Cisme
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Clinica Cisme') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Clinica Cisme', 'https://clinicacisme.com', 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, company_domain, postal_address, created_by) VALUES ('Nayef Abufayyad', v_org_id, 'clinicacisme.com', NULL, v_user_id);
  v_org_id := NULL;

  -- Clinica Menorca
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Clinica Menorca') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Clinica Menorca', 'https://clinicamenorca.com', 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, company_domain, postal_address, created_by) VALUES ('Jose Antonio Martin', v_org_id, 'clinicamenorca.com', NULL, v_user_id);
  v_org_id := NULL;

  -- DermaMoratinos
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('DermaMoratinos') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('DermaMoratinos', 'https://dermamoratinos.com', 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, company_domain, postal_address, created_by) VALUES ('Marta Maria Moratinos', v_org_id, 'dermamoratinos.com', NULL, v_user_id);
  v_org_id := NULL;

  -- Dental Catalano
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Dental Catalano') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Dental Catalano', 'https://dentalcatalano.com', 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, company_domain, postal_address, created_by) VALUES ('Rosalia Fernandez', v_org_id, 'dentalcatalano.com', NULL, v_user_id);
  v_org_id := NULL;

  -- Smysecret
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Smysecret') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Smysecret', 'https://smysecret.com', 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, company_domain, postal_address, created_by) VALUES ('Marta Alvarez Amaro', v_org_id, 'smysecret.com', NULL, v_user_id);
  v_org_id := NULL;

  -- Imboclinics
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Imboclinics') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Imboclinics', 'https://imboclinics.com', 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, company_domain, postal_address, created_by) VALUES ('Fernando Luque', v_org_id, 'imboclinics.com', NULL, v_user_id);
  v_org_id := NULL;

  -- Clinica Molinon
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Clinica Molinon') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Clinica Molinon', 'https://clinicamolinon.com', 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, company_domain, postal_address, created_by) VALUES ('Pedro Garcia', v_org_id, 'clinicamolinon.com', NULL, v_user_id);
  v_org_id := NULL;

  -- CUN (Clinica Universidad de Navarra)
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('CUN') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('CUN', 'https://cun.es', 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, company_domain, postal_address, created_by) VALUES ('Marta Sanchez', v_org_id, 'cun.es', NULL, v_user_id);
  v_org_id := NULL;

  -- ============ PAGE 2 ============

  -- BLife
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('BLife') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('BLife', 'https://blifeclinic.com', 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, company_domain, created_by) VALUES ('Javier Cantero', v_org_id, 'blifeclinic.com', v_user_id);
  v_org_id := NULL;

  -- Insparya
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Insparya') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Insparya', 'https://insparya.com', 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, company_domain, created_by) VALUES ('Ana Carolina J.', v_org_id, 'insparya.com', v_user_id);
  v_org_id := NULL;

  -- Sanitas (may exist)
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Sanitas') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Sanitas', 'https://sanitas.es', 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, company_domain, created_by) VALUES ('Alba Valenzuela', v_org_id, 'sanitas.es', v_user_id);
  v_org_id := NULL;

  -- Clinica Baviera
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Clinica Baviera') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Clinica Baviera', 'https://clinicabaviera.com', 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, company_domain, created_by) VALUES ('Virgilio Leal', v_org_id, 'clinicabaviera.com', v_user_id);
  v_org_id := NULL;

  -- Dental Pedroche
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Dental Pedroche') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Dental Pedroche', 'https://dentalpedroche.com', 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, company_domain, created_by) VALUES ('Jose Luis Fernandez', v_org_id, 'dentalpedroche.com', v_user_id);
  v_org_id := NULL;

  -- Vive-Rie
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Vive-Rie') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Vive-Rie', NULL, 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, created_by) VALUES ('Eusebio Villar', v_org_id, v_user_id);
  v_org_id := NULL;

  -- Clinica Duran
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Clinica Duran') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Clinica Duran', 'https://clinicaduran.com', 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, company_domain, created_by) VALUES ('Jose Duran', v_org_id, 'clinicaduran.com', v_user_id);
  v_org_id := NULL;

  -- Dental Tera
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Dental Tera') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Dental Tera', 'https://dentaltera.com', 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, company_domain, created_by) VALUES ('Marta Fernandez-Coppel', v_org_id, 'dentaltera.com', v_user_id);
  v_org_id := NULL;

  -- Saborido & Rodriguez
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Saborido & Rodriguez') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Saborido & Rodriguez', NULL, 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, created_by) VALUES ('Santiago Saborido', v_org_id, v_user_id);
  v_org_id := NULL;

  -- Dental Capuchino
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Dental Capuchino') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Dental Capuchino', NULL, 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, created_by) VALUES ('Angelines Capuchino', v_org_id, v_user_id);
  v_org_id := NULL;

  -- Clinica Piqueras
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Clinica Piqueras') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Clinica Piqueras', NULL, 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, created_by) VALUES ('Paco Piqueras', v_org_id, v_user_id);
  v_org_id := NULL;

  -- Clinica Fernandez Blanco
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Clinica Fernandez Blanco') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Clinica Fernandez Blanco', 'https://clinicafernandezblanco.com', 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, company_domain, created_by) VALUES ('Alfredo Fernandez', v_org_id, 'clinicafernandezblanco.com', v_user_id);
  v_org_id := NULL;

  -- ============ PAGE 3 ============

  -- Dental Renessans
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Dental Renessans') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Dental Renessans', NULL, 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, created_by) VALUES ('Andriy Masalitin', v_org_id, v_user_id);
  v_org_id := NULL;

  -- Origen Dental
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Origen Dental') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Origen Dental', NULL, 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, created_by) VALUES ('Mateo Panadero', v_org_id, v_user_id);
  v_org_id := NULL;

  -- Casanova Dental
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Casanova Dental') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Casanova Dental', NULL, 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, created_by) VALUES ('Alvaro Romero', v_org_id, v_user_id);
  v_org_id := NULL;

  -- Face&Go
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Face&Go') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Face&Go', NULL, 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, created_by) VALUES ('Gabriel Costas', v_org_id, v_user_id);
  v_org_id := NULL;

  -- Caredent
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Caredent') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Caredent', 'https://caredent.es', 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, company_domain, created_by) VALUES ('Julio Vilacoba', v_org_id, 'caredent.es', v_user_id);
  v_org_id := NULL;

  -- Naturadent
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Naturadent') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Naturadent', NULL, 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, created_by) VALUES ('Ruth Sanz', v_org_id, v_user_id);
  v_org_id := NULL;

  -- Dental Banquez
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Dental Banquez') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Dental Banquez', NULL, 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, created_by) VALUES ('Oswaldo Jimenez', v_org_id, v_user_id);
  v_org_id := NULL;

  -- Vivantadental
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Vivantadental') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Vivantadental', 'https://vivantadental.com', 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, company_domain, created_by) VALUES ('Alejandro Rodriguez', v_org_id, 'vivantadental.com', v_user_id);
  v_org_id := NULL;

  -- Castro & Dental
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Castro & Dental') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Castro & Dental', NULL, 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, created_by) VALUES ('Alejandro Nazco', v_org_id, v_user_id);
  v_org_id := NULL;

  -- Dental EOS
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Dental EOS') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Dental EOS', NULL, 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, created_by) VALUES ('Bruno Ruiz', v_org_id, v_user_id);
  v_org_id := NULL;

  -- Dental Caicoya
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Dental Caicoya') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Dental Caicoya', NULL, 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, created_by) VALUES ('Adrian Garcia', v_org_id, v_user_id);
  v_org_id := NULL;

  -- ============ PAGE 4 ============

  -- Clinica VASS
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Clinica VASS') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Clinica VASS', NULL, 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, created_by) VALUES ('Raul Guzman', v_org_id, v_user_id);
  v_org_id := NULL;

  -- Nieto y Llorens
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Nieto y Llorens') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Nieto y Llorens', NULL, 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, created_by) VALUES ('Jose Ma Nieto', v_org_id, v_user_id);
  v_org_id := NULL;

  -- JAR Clinica Dental
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('JAR Clinica Dental') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('JAR Clinica Dental', NULL, 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, created_by) VALUES ('Jesus Recio', v_org_id, v_user_id);
  v_org_id := NULL;

  -- Estudio Dental Melguizo
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Estudio Dental Melguizo') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Estudio Dental Melguizo', NULL, 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, created_by) VALUES ('Jesus Moya', v_org_id, v_user_id);
  v_org_id := NULL;

  -- CD Majadahonda
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('CD Majadahonda') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('CD Majadahonda', NULL, 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, created_by) VALUES ('Davinia Garcia', v_org_id, v_user_id);
  v_org_id := NULL;

  -- Veterinaria Casa de Campo
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Veterinaria Casa de Campo') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Veterinaria Casa de Campo', NULL, 'Veterinaria', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, created_by) VALUES ('Vicente Fernandez', v_org_id, v_user_id);
  v_org_id := NULL;

  -- PRONOS
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('PRONOS') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('PRONOS', NULL, 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, created_by) VALUES ('Francisco Bueno', v_org_id, v_user_id);
  v_org_id := NULL;

  -- Sonrisalud
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Sonrisalud') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Sonrisalud', NULL, 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, created_by) VALUES ('Marling Monasterios', v_org_id, v_user_id);
  v_org_id := NULL;

  -- Clinica Carmona
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Clinica Carmona') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Clinica Carmona', NULL, 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, created_by) VALUES ('Joaquin Carmona', v_org_id, v_user_id);
  v_org_id := NULL;

  -- Clinica Rementeria
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Clinica Rementeria') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Clinica Rementeria', 'https://clinicarementeria.com', 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, company_domain, created_by) VALUES ('Laureano Alvarez-Rementeria', v_org_id, 'clinicarementeria.com', v_user_id);
  v_org_id := NULL;

  -- Vivanta
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Vivanta') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Vivanta', 'https://vivanta.es', 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, company_domain, created_by) VALUES ('Antonio Gonzalez', v_org_id, 'vivanta.es', v_user_id);
  v_org_id := NULL;

  -- ============ PAGE 5 ============

  -- Clinica Ityos
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Clinica Ityos') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Clinica Ityos', NULL, 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, created_by) VALUES ('Nacho Varo', v_org_id, v_user_id);
  v_org_id := NULL;

  -- Cemei
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Cemei') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Cemei', NULL, 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, created_by) VALUES ('Juan Carlos Vazquez', v_org_id, v_user_id);
  v_org_id := NULL;

  -- Dental Breeze
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Dental Breeze') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Dental Breeze', NULL, 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, created_by) VALUES ('Antonella Rapizza', v_org_id, v_user_id);
  v_org_id := NULL;

  -- Dentality
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Dentality') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Dentality', NULL, 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, created_by) VALUES ('David Villanueva', v_org_id, v_user_id);
  v_org_id := NULL;

  -- Clinica Pegadas
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Clinica Pegadas') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Clinica Pegadas', NULL, 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, created_by) VALUES ('Alvaro Cuesta', v_org_id, v_user_id);
  v_org_id := NULL;

  -- Ergodinamica
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Ergodinamica') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Ergodinamica', 'https://ergodinamica.com', 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, company_domain, created_by) VALUES ('Antonio Diaz Huertas', v_org_id, 'ergodinamica.com', v_user_id);
  v_org_id := NULL;

  -- Vitaldent (may exist)
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Vitaldent') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Vitaldent', 'https://vitaldent.com', 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, company_domain, created_by) VALUES ('Maire Serrano', v_org_id, 'vitaldent.com', v_user_id);
  INSERT INTO contacts (full_name, organization_id, company_domain, created_by) VALUES ('Lucas Martin', v_org_id, 'vitaldent.com', v_user_id);
  v_org_id := NULL;

  -- Dental Belvedere
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Dental Belvedere') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Dental Belvedere', NULL, 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, created_by) VALUES ('Elena Neira', v_org_id, v_user_id);
  v_org_id := NULL;

  -- Clinica Puyuelo
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Clinica Puyuelo') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Clinica Puyuelo', 'https://clinicapuyuelo.com', 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, company_domain, created_by) VALUES ('Luis Puyuelo', v_org_id, 'clinicapuyuelo.com', v_user_id);
  v_org_id := NULL;

  -- Gilva
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Gilva') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Gilva', NULL, 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, created_by) VALUES ('Luis Javier Gil', v_org_id, v_user_id);
  v_org_id := NULL;

  -- Avance Dental
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Avance Dental') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Avance Dental', 'https://avancedental.com', 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, company_domain, created_by) VALUES ('Carlos Escudero', v_org_id, 'avancedental.com', v_user_id);
  v_org_id := NULL;

  -- ============ PAGES 6-7 ============

  -- Clinica Planas
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Clinica Planas') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Clinica Planas', 'https://clinicaplanas.com', 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, company_domain, created_by) VALUES ('Javier Planas', v_org_id, 'clinicaplanas.com', v_user_id);
  v_org_id := NULL;

  -- Titanium Dental
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Titanium Dental') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Titanium Dental', NULL, 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, created_by) VALUES ('Jose Angel Madrid', v_org_id, v_user_id);
  v_org_id := NULL;

  -- KnowPain Castilla
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('KnowPain Castilla') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('KnowPain Castilla', NULL, 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, created_by) VALUES ('Francisco Latorre', v_org_id, v_user_id);
  v_org_id := NULL;

  -- Vitaldent again (reuse)
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Vitaldent') LIMIT 1;
  INSERT INTO contacts (full_name, organization_id, company_domain, created_by) VALUES ('Miguel Angel Sanz', v_org_id, 'vitaldent.com', v_user_id);
  v_org_id := NULL;

  -- Elite Laser
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Elite Laser') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Elite Laser', NULL, 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, created_by) VALUES ('Rodolfo Lopez', v_org_id, v_user_id);
  v_org_id := NULL;

  -- OralStudio
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('OralStudio') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('OralStudio', NULL, 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, created_by) VALUES ('Joan Lopez', v_org_id, v_user_id);
  v_org_id := NULL;

  -- Montpellier
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Montpellier') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Montpellier', NULL, 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, created_by) VALUES ('Ignacio Sagardoy', v_org_id, v_user_id);
  v_org_id := NULL;

  -- Clinica Arquero
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Clinica Arquero') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Clinica Arquero', 'https://clinicaarquero.com', 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, company_domain, created_by) VALUES ('Fernando Martin', v_org_id, 'clinicaarquero.com', v_user_id);
  v_org_id := NULL;

  -- Sanitas again (reuse)
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Sanitas') LIMIT 1;
  INSERT INTO contacts (full_name, organization_id, company_domain, created_by) VALUES ('Victor Ubero', v_org_id, 'sanitas.es', v_user_id);
  v_org_id := NULL;

  -- Adelgar
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Adelgar') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Adelgar', 'https://adelgar.com', 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, company_domain, created_by) VALUES ('Belinda Marin', v_org_id, 'adelgar.com', v_user_id);
  INSERT INTO contacts (full_name, organization_id, company_domain, created_by) VALUES ('Cesar Contreras', v_org_id, 'adelgar.com', v_user_id);
  v_org_id := NULL;

  -- CEMTRO
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('CEMTRO') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('CEMTRO', 'https://cemtro.com', 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, company_domain, created_by) VALUES ('Angel Galindo', v_org_id, 'cemtro.com', v_user_id);
  v_org_id := NULL;

  -- Dental Don Ramon de la Cruz
  SELECT id INTO v_org_id FROM organizations WHERE LOWER(name) = LOWER('Dental Don Ramon de la Cruz') LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, website, sector, created_by) VALUES ('Dental Don Ramon de la Cruz', NULL, 'Salud', v_user_id) RETURNING id INTO v_org_id;
  END IF;
  INSERT INTO contacts (full_name, organization_id, created_by) VALUES ('Gonzalo Dorao', v_org_id, v_user_id);
  v_org_id := NULL;

END $$;
