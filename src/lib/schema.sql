CREATE TABLE IF NOT EXISTS sites (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS centrifugeuses (
  id SERIAL PRIMARY KEY,
  site_id INT REFERENCES sites(id),
  nom VARCHAR(50) NOT NULL,
  modele VARCHAR(50),
  est_backup BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS programmes (
  id SERIAL PRIMARY KEY,
  centrifugeuse_id INT REFERENCES centrifugeuses(id),
  numero INT NOT NULL,
  libelle TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions_centri (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id INT REFERENCES sites(id),
  centri_id INT REFERENCES centrifugeuses(id),
  prog_id INT REFERENCES programmes(id),
  stockage VARCHAR(10) CHECK (stockage IN ('ambiant','+5','-20')) NOT NULL,
  visa VARCHAR(5) NOT NULL,
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  statut VARCHAR(10) DEFAULT 'ouverte' CHECK (statut IN ('ouverte','cloturee'))
);

CREATE TABLE IF NOT EXISTS tubes_centri (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions_centri(id) ON DELETE CASCADE,
  num_echant VARCHAR(50) NOT NULL,
  scanned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tubes_session ON tubes_centri(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions_centri(opened_at);
CREATE INDEX IF NOT EXISTS idx_sessions_site ON sessions_centri(site_id);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nom VARCHAR(50),
  prenom VARCHAR(50),
  site_id INT REFERENCES sites(id),
  role VARCHAR(10) DEFAULT 'technicien' CHECK (role IN ('technicien','admin')),
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS config (
  id SERIAL PRIMARY KEY,
  cle VARCHAR(50) UNIQUE NOT NULL,
  valeur TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by VARCHAR(50)
);

INSERT INTO config (cle, valeur, description) VALUES
  ('session_timeout_minutes', '30', 'Durée inactivité avant déconnexion (minutes)'),
  ('session_warning_minutes', '2', 'Délai avertissement avant déconnexion (minutes)')
ON CONFLICT (cle) DO NOTHING;
