# Schéma Neon PostgreSQL — BioLabTrack (référence complète)

> Toujours vérifier ici avant d'écrire une migration SQL.  
> Si une table manque ou diffère de la réalité, signaler à Fred pour mise à jour.

---

## Tables métier

### `sessions_centrifugation`
```sql
CREATE TABLE IF NOT EXISTS sessions_centrifugation (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site            VARCHAR(50)   NOT NULL,
  centrifugeuse_id VARCHAR(50)  NOT NULL,
  programme_id    VARCHAR(50)   NOT NULL,
  operateur       VARCHAR(100)  NOT NULL,
  date_heure      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  tubes           JSONB         NOT NULL DEFAULT '[]',
  -- tubes: ["CODE_BARRE_1", "CODE_BARRE_2", ...]
  pdf_url         TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_site        ON sessions_centrifugation(site);
CREATE INDEX IF NOT EXISTS idx_sessions_date        ON sessions_centrifugation(date_heure DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_centrifugeuse ON sessions_centrifugation(centrifugeuse_id);
```

### `bons_transport`
```sql
CREATE TABLE IF NOT EXISTS bons_transport (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_depart     VARCHAR(50)   NOT NULL,
  destination_id  VARCHAR(50)   NOT NULL,
  destination_nom VARCHAR(100)  NOT NULL,
  operateur       VARCHAR(100)  NOT NULL,
  date_heure      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  sachets         JSONB         NOT NULL DEFAULT '[]',
  -- sachets: [{id: string, zone_temperature: 'Ambiant'|'+4°C'|'Congelé', tubes: string[]}]
  statut          VARCHAR(20)   NOT NULL DEFAULT 'en_attente',
  confirme_par    TEXT,
  confirme_le     TIMESTAMPTZ,
  pdf_url         TEXT,
  qr_token        VARCHAR(100)  UNIQUE NOT NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ   DEFAULT NOW(),
  
  CONSTRAINT check_statut_transport 
    CHECK (statut IN ('en_attente', 'confirme', 'annule'))
);

CREATE INDEX IF NOT EXISTS idx_bons_site_depart ON bons_transport(site_depart);
CREATE INDEX IF NOT EXISTS idx_bons_date        ON bons_transport(date_heure DESC);
CREATE INDEX IF NOT EXISTS idx_bons_statut      ON bons_transport(statut);
CREATE INDEX IF NOT EXISTS idx_bons_qr_token    ON bons_transport(qr_token);
```

---

## Tables référentiel

### `sites`
```sql
CREATE TABLE IF NOT EXISTS sites (
  id    VARCHAR(50) PRIMARY KEY,
  -- Valeurs : 'epinal', 'remiremont', 'neufchateau'
  nom   VARCHAR(100) NOT NULL,
  actif BOOLEAN DEFAULT true
);

-- Données initiales
INSERT INTO sites (id, nom) VALUES
  ('epinal',      'Épinal — CH Émile Durkheim'),
  ('remiremont',  'Remiremont'),
  ('neufchateau', 'Neufchâteau')
ON CONFLICT (id) DO NOTHING;
```

### `centrifugeuses`
```sql
CREATE TABLE IF NOT EXISTS centrifugeuses (
  id         VARCHAR(50) PRIMARY KEY,
  nom        VARCHAR(100) NOT NULL,
  site_id    VARCHAR(50)  REFERENCES sites(id),
  modele     VARCHAR(100),
  numero_serie VARCHAR(50),
  actif      BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Données initiales
INSERT INTO centrifugeuses (id, nom, site_id) VALUES
  ('MFXPRO_8540', 'MFX Pro 8540',  'epinal'),
  ('MFX3_6421',   'MFX3 6421',     'epinal'),
  ('MFX3_5213',   'MFX3 5213',     'remiremont'),
  ('MFST_7814',   'MFST 7814',     'neufchateau'),
  ('Minispin',    'Minispin',       NULL),  -- multi-sites
  ('Cytospin',    'Cytospin',       NULL)   -- multi-sites
ON CONFLICT (id) DO NOTHING;
```

### `programmes_centrifugation`
```sql
CREATE TABLE IF NOT EXISTS programmes_centrifugation (
  id                VARCHAR(50) PRIMARY KEY,
  nom               VARCHAR(100) NOT NULL,
  centrifugeuse_id  VARCHAR(50) REFERENCES centrifugeuses(id),
  vitesse_rpm       INTEGER,
  duree_minutes     INTEGER,
  temperature_c     INTEGER,
  actif             BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### `destinations`
```sql
CREATE TABLE IF NOT EXISTS destinations (
  id            VARCHAR(50) PRIMARY KEY,
  nom           VARCHAR(100) NOT NULL,
  email_contact TEXT,
  telephone     VARCHAR(20),
  adresse       TEXT,
  actif         BOOLEAN DEFAULT true
);

-- Données initiales
INSERT INTO destinations (id, nom) VALUES
  ('chru_nancy',    'CHRU Nancy'),
  ('efs',           'EFS — Établissement Français du Sang'),
  ('b2a',           'B2A'),
  ('mat_regionale', 'MAT Régionale')
ON CONFLICT (id) DO NOTHING;
```

---

## Tables système

### `users`
```sql
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  matricule     VARCHAR(50)  UNIQUE,
  password_hash TEXT NOT NULL,
  nom           VARCHAR(100) NOT NULL,
  prenom        VARCHAR(100) NOT NULL,
  role          VARCHAR(30)  NOT NULL DEFAULT 'technicien',
  site_id       VARCHAR(50)  REFERENCES sites(id),
  actif         BOOLEAN DEFAULT true,
  derniere_connexion TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT check_role CHECK (role IN
    ('technicien', 'biologiste', 'secretaire', 'cadre',
     'assistante_qualite', 'agent_transverse', 'responsable_processus_info', 'admin'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_site  ON users(site_id);
```

### `config`
```sql
CREATE TABLE IF NOT EXISTS config (
  cle         VARCHAR(100) PRIMARY KEY,
  valeur      TEXT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Valeurs par défaut
INSERT INTO config (cle, valeur, description) VALUES
  ('timeout_inactivite_minutes', '30', 'Durée avant déconnexion automatique (minutes)'),
  ('version_app', '1.0.0', 'Version de l''application')
ON CONFLICT (cle) DO NOTHING;
```

---

## Requêtes courantes

### Recherche tube par code-barres (page /recherche)
```sql
SELECT 
  s.id,
  s.date_heure,
  s.site,
  s.centrifugeuse_id,
  s.programme_id,
  s.operateur,
  s.tubes
FROM sessions_centrifugation s
WHERE s.tubes @> '["CODE_BARRE_ICI"]'::jsonb
ORDER BY s.date_heure DESC
LIMIT 20;
```

### Historique transport par site
```sql
SELECT *
FROM bons_transport
WHERE site_depart = 'epinal'
ORDER BY date_heure DESC
LIMIT 50;
```

### Stats dashboard
```sql
SELECT 
  COUNT(*) FILTER (WHERE date_heure >= NOW() - INTERVAL '24 hours') AS sessions_24h,
  COUNT(*) FILTER (WHERE date_heure >= NOW() - INTERVAL '7 days')  AS sessions_7j,
  COUNT(*) AS total
FROM sessions_centrifugation
WHERE site = $1;
```