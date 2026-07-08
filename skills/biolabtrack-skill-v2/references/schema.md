# Schéma Neon PostgreSQL — BioLabTrack (reconstruction depuis le code)

> ⚠️ **Ce n'est pas un schéma exhaustif généré depuis la base.** Impossible de se connecter à
> Neon depuis cet environnement. Chaque table ci-dessous liste uniquement les colonnes qui
> apparaissent réellement dans une requête SQL (`SELECT`, `INSERT INTO`, `UPDATE ... SET`,
> `CREATE TABLE`, `ALTER TABLE ... ADD COLUMN`) quelque part dans `src/`. Il peut exister en
> base des colonnes que le code n'utilise jamais (donc invisibles ici), et à l'inverse une
> colonne citée ici a pu être supprimée en base sans que le code correspondant ait été retiré.
> **En cas de doute avant une migration, vérifier directement sur la console Neon.**
>
> Sources principales : `src/lib/schema.sql` (bootstrap initial, partiellement obsolète —
> `users.role` y limite encore à `('technicien','admin')`), `src/lib/schemas.ts` (types
> TypeScript des entités), et les `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE` dispersés dans
> les routes `/api/admin/migrate`, `/api/transport/envois`, `/api/admin/laboratoires`,
> `/api/transport/laboratoires`.
>
> Deux noms de table ne correspondent pas à l'intuition — vérifiés dans le code, pas supposés :
> - la table des sessions de centrifugation s'appelle **`sessions_centri`**, pas
>   `sessions_centrifugation`.
> - la table des sachets de transport s'appelle **`envoi_sachets`**, pas `sachets_transport`.

---

## Tables métier — Centrifugation

### `sites`
```sql
CREATE TABLE IF NOT EXISTS sites (
  id                  SERIAL PRIMARY KEY,
  nom                 VARCHAR(50) NOT NULL,
  actif               BOOLEAN DEFAULT true,
  email_notifications VARCHAR(100)  -- ajoutée après coup (ALTER dans /api/admin/migrate)
);
```
Sites connus en usage : Épinal (id=1), Remiremont (id=2), Neufchâteau (id=3) — valeurs codées
en dur côté client (`Sidebar.tsx`, pages outils), pas de garantie que ce soit ces IDs exacts en
base ; se fier à `GET /api/admin/sites` pour la valeur réelle.

### `centrifugeuses`
```sql
CREATE TABLE IF NOT EXISTS centrifugeuses (
  id         SERIAL PRIMARY KEY,
  site_id    INT REFERENCES sites(id),
  nom        VARCHAR(50) NOT NULL,
  modele     VARCHAR(50),
  est_backup BOOLEAN DEFAULT false,
  actif      BOOLEAN DEFAULT true,
  ordre      INT
);
```

### `programmes`
```sql
CREATE TABLE IF NOT EXISTS programmes (
  id               SERIAL PRIMARY KEY,
  centrifugeuse_id INT REFERENCES centrifugeuses(id),
  numero           INT NOT NULL,
  libelle          TEXT NOT NULL
);
```
Nommée `programmes`, pas `programmes_centrifugation`.

### `sessions_centri`
```sql
CREATE TABLE IF NOT EXISTS sessions_centri (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id    INT REFERENCES sites(id),
  centri_id  INT REFERENCES centrifugeuses(id),
  prog_id    INT REFERENCES programmes(id),
  stockage   VARCHAR(10) CHECK (stockage IN ('ambiant','+5','-20')),
  visa       VARCHAR(5) NOT NULL,
  opened_at  TIMESTAMPTZ DEFAULT NOW(),
  closed_at  TIMESTAMPTZ,
  statut     VARCHAR(10) DEFAULT 'ouverte' CHECK (statut IN ('ouverte','cloturee'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions_centri(opened_at);
CREATE INDEX IF NOT EXISTS idx_sessions_site ON sessions_centri(site_id);
```
`stockages_tubes` (vu dans `HistoriqueSession` / `archives/centrifugation`) **n'est pas une
colonne** : c'est un `array_agg(...)` calculé à la volée dans `GET /api/centri/archives`,
agrégeant `tubes_centri.stockage` par session.

### `tubes_centri`
```sql
CREATE TABLE IF NOT EXISTS tubes_centri (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions_centri(id) ON DELETE CASCADE,
  num_echant VARCHAR(50) NOT NULL,
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  stockage   VARCHAR(10) CHECK (stockage IN ('ambiant','+5','-20')),
  remarque   TEXT  -- absente de schema.sql, mais lue/filtrée dans /api/centri/recherche
);

CREATE INDEX IF NOT EXISTS idx_tubes_session ON tubes_centri(session_id);
```

---

## Tables métier — Transport

### `laboratoires_dest`
```sql
CREATE TABLE IF NOT EXISTS laboratoires_dest (
  id              SERIAL PRIMARY KEY,
  nom             VARCHAR(100) UNIQUE NOT NULL,
  email_reception VARCHAR(100),
  actif           BOOLEAN DEFAULT true
);
```
Destinations métier connues : CHRU Nancy, EFS, B2A, MAT Régionale — valeurs de données, pas de
contrainte CHECK en base sur `nom`.

### `envois_transport`
```sql
CREATE TABLE IF NOT EXISTS envois_transport (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id              INT REFERENCES sites(id),
  dest_id              INT REFERENCES laboratoires_dest(id),
  visa_expediteur      VARCHAR(10) NOT NULL,
  matricule_expediteur VARCHAR(20),                 -- ajoutée après coup
  statut               VARCHAR(20) DEFAULT 'en_preparation',
  -- statut ∈ 'en_preparation' | 'valide' | 'envoye' | 'receptionne' (StatutEnvoi, src/lib/schemas.ts)
  code_acces           VARCHAR(8) UNIQUE,            -- ex. 'ABC-1234', généré à la création
  numero_bordereau     VARCHAR(30),                  -- 'TR-AAAA-MM-JJ-NNNN', généré à la création
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  valide_at            TIMESTAMPTZ,
  envoye_at            TIMESTAMPTZ,
  receptionne_at       TIMESTAMPTZ,
  nom_transporteur     VARCHAR(100),
  visa_transporteur    VARCHAR(10),
  nom_receptionnaire   VARCHAR(100),
  visa_receptionnaire  VARCHAR(10)
);
```
Nommée `envois_transport`, table des bons de transport (un "envoi" = un bon).

### `envoi_sachets`
```sql
CREATE TABLE IF NOT EXISTS envoi_sachets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  envoi_id    UUID REFERENCES envois_transport(id) ON DELETE CASCADE,
  temperature VARCHAR(10) NOT NULL,
  -- CHECK (temperature IN ('ambiant','plus4','congele')) — contrainte envoi_sachets_temperature_check
  code_barre  VARCHAR(100) NOT NULL,
  ordre       INT NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```
Nommée `envoi_sachets` (singulier "envoi"), **pas** `sachets_transport`.

---

## Tables métier — Tickets

Aucun `CREATE TABLE` trouvé dans le code pour `tickets`, `ticket_assignations` ni
`ticket_historique` — elles ont été créées manuellement en base (cohérent avec le protocole du
skill : migrations exécutées à la main sur la console Neon). Colonnes reconstruites depuis les
`INSERT`/`SELECT`/`UPDATE` du code et le type `Ticket` de `src/app/tickets/[id]/page.tsx`.

### `tickets`
```sql
-- Reconstruction, PAS un CREATE TABLE trouvé dans le code
CREATE TABLE IF NOT EXISTS tickets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_ticket     VARCHAR(30),        -- 'T-AAAA-MM-JJ-NNNN', généré à la création
  titre             TEXT NOT NULL,
  description       TEXT,
  statut            VARCHAR(20) DEFAULT 'a_faire',
  -- statut ∈ 'a_faire' | 'en_cours' | 'termine' | 'annule' (STATUTS_EDIT côté UI + 'annule' via /annuler)
  priorite          VARCHAR(20) NOT NULL,
  -- priorite ∈ 'basse' | 'normale' | 'haute' | 'urgente'
  cree_par          INT REFERENCES users(id),
  site              VARCHAR(50) NOT NULL,
  motif_annulation  TEXT,
  echeance          DATE,
  checklist         JSONB,              -- [{ id, texte, fait }]
  pieces_jointes    JSONB,              -- [{ id, nom, url, type, taille, uploaded_le, uploaded_par }]
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ
);
```
Pièces jointes stockées sur Vercel Blob avec `access: 'private'` — l'URL en base ne suffit pas à
lire le fichier, il faut passer par `GET /api/tickets/[id]/files/[pieceId]` (voir routes.md).

### `ticket_assignations`
```sql
-- Reconstruction
CREATE TABLE IF NOT EXISTS ticket_assignations (
  ticket_id   UUID REFERENCES tickets(id),
  user_id     INT REFERENCES users(id),
  assigne_par INT REFERENCES users(id),
  assigne_le  TIMESTAMPTZ DEFAULT NOW()
);
```

### `ticket_historique`
```sql
-- Reconstruction
CREATE TABLE IF NOT EXISTS ticket_historique (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id       UUID REFERENCES tickets(id),
  user_id         INT REFERENCES users(id),
  action          VARCHAR(30) NOT NULL,
  -- action ∈ 'creation' | 'commentaire' | 'assignation' | 'desassignation' |
  --          'changement_statut' | 'changement_priorite' | 'changement_echeance' |
  --          'piece_jointe' | 'annulation' (déduit des INSERT dans le code)
  ancienne_valeur TEXT,
  nouvelle_valeur TEXT,
  commentaire     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Tables système

### `users`
```sql
CREATE TABLE IF NOT EXISTS users (
  id                    SERIAL PRIMARY KEY,
  email                 VARCHAR(255) UNIQUE NOT NULL,
  matricule             VARCHAR(50) UNIQUE,     -- obligatoire côté API (POST /api/admin/users), pas de NOT NULL trouvé en base
  password_hash         TEXT NOT NULL,
  nom                   VARCHAR(100) NOT NULL,
  prenom                VARCHAR(100) NOT NULL,
  role                  VARCHAR(30) NOT NULL DEFAULT 'technicien',
  site_id               INT REFERENCES sites(id),
  actif                 BOOLEAN DEFAULT true,
  must_change_password  BOOLEAN DEFAULT false,   -- ajoutée après coup (ALTER dans /api/admin/migrate)
  created_at            TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT check_role CHECK (role IN
    ('technicien', 'biologiste', 'secretaire', 'cadre',
     'assistante_qualite', 'agent_transverse', 'responsable_processus_info', 'admin'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```
`derniere_connexion` figurait dans une ancienne version de ce document mais n'apparaît dans
aucune requête du code — probablement jamais implémentée ou colonne morte ; retirée d'ici tant
que rien dans le code ne la référence.

**Règle à respecter pour tout nouveau rôle** (voir aussi CLAUDE.md) : mettre à jour ensemble la
contrainte `check_role` en base, `Role`/`ROLE_LABELS`/`ROLE_CLS` dans
`src/app/admin/users/page.tsx`, et `VALID_ROLES` dans `src/app/api/admin/users/route.ts` +
`src/app/api/admin/users/[id]/route.ts`.

### `config`
```sql
CREATE TABLE IF NOT EXISTS config (
  id         SERIAL PRIMARY KEY,
  cle        VARCHAR(50) UNIQUE NOT NULL,
  valeur     TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by VARCHAR(50)
);

-- Clés connues, vues dans le code :
-- 'session_timeout_minutes', 'session_warning_minutes' (InactivityGuard)
INSERT INTO config (cle, valeur, description) VALUES
  ('session_timeout_minutes', '30', 'Durée inactivité avant déconnexion (minutes)'),
  ('session_warning_minutes', '2', 'Délai avertissement avant déconnexion (minutes)')
ON CONFLICT (cle) DO NOTHING;
```

### `password_reset_tokens`
```sql
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    INT REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(100) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `audit_logs`
```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(100),
  action     VARCHAR(50) NOT NULL,
  -- actions vues : CREATE_SESSION, CLOSE_SESSION, VALIDATE_ENVOI, REOPEN_ENVOI,
  --                PICKUP_ENVOI, RECEIVE_ENVOI (src/lib/audit.ts + appels dans les routes)
  entity     VARCHAR(50),
  entity_id  VARCHAR(100),
  site_id    INT,
  details    JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
```

---

## Requêtes courantes (vérifiées dans le code actuel)

### Recherche tube par code-barres (page `/recherche`, via `/api/centri/recherche`)
```sql
SELECT
  t.id, t.session_id, t.num_echant, t.scanned_at, t.remarque, t.stockage,
  s.opened_at, s.closed_at, s.statut, s.visa,
  c.nom AS centrifugeuse, c.est_backup,
  p.numero AS prog_numero, p.libelle AS prog_libelle,
  si.nom AS site_nom, si.id AS site_id
FROM tubes_centri t
JOIN sessions_centri s ON s.id = t.session_id
LEFT JOIN centrifugeuses c ON c.id = s.centri_id
LEFT JOIN programmes p ON p.id = s.prog_id
LEFT JOIN sites si ON si.id = s.site_id
-- + filtres dynamiques : q, site_id, centri_id, date_debut/date_fin, visa, stockage[], avec_remarque
```

### Rappels d'échéance ticket (cron quotidien, `/api/cron/rappels`)
```sql
SELECT t.id, t.titre, t.numero_ticket, t.echeance, u.email, u.prenom
FROM tickets t
JOIN ticket_assignations ta ON ta.ticket_id = t.id
JOIN users u ON u.id = ta.user_id
WHERE t.statut NOT IN ('termine', 'annule')
  AND u.actif = true
  AND (t.echeance::date = CURRENT_DATE OR t.echeance::date = CURRENT_DATE + 2)
```

### Historique transport par site
```sql
SELECT e.*, s.nom AS site_nom, d.nom AS dest_nom,
       COUNT(sa.id) FILTER (WHERE sa.temperature = 'ambiant') AS nb_ambiant,
       COUNT(sa.id) FILTER (WHERE sa.temperature = 'plus4')   AS nb_plus4,
       COUNT(sa.id) FILTER (WHERE sa.temperature = 'congele') AS nb_congele
FROM envois_transport e
JOIN sites s ON s.id = e.site_id
JOIN laboratoires_dest d ON d.id = e.dest_id
LEFT JOIN envoi_sachets sa ON sa.envoi_id = e.id
WHERE e.site_id = $1
GROUP BY e.id, s.nom, d.nom
```
