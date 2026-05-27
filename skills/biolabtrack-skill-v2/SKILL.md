---
name: biolabtrack
description: >
  Skill pour développer et maintenir BioLabTrack (biolabtrack.fr), application Next.js 14
  de traçabilité pour laboratoire médical GCS Bio Med (Épinal, Remiremont, Neufchâteau).
  DÉCLENCHER OBLIGATOIREMENT dès que Fred mentionne : BioLabTrack, tracabilite-centrifugation,
  centrifugation, transport de tubes, bon de transport, sachet, PDF COFRAC, QR code transport,
  NextAuth labo, Neon labo, route API labo, panel admin labo, /recherche, /transport/[id],
  MFXPRO, MFX3, MFST, Minispin, Cytospin, CHRU Nancy, EFS, B2A, MAT Régionale, GCS Bio Med,
  UF 2520, CH Durkheim, ou tout fichier du repo FrederickChenot/tracabilite-centrifugation.
  Ne jamais coder sur ce projet sans avoir lu ce skill en entier.
---

# BioLabTrack — Guide de développement complet

> **Lire ce fichier EN ENTIER avant d'écrire la moindre ligne de code.**  
> Puis lire les fichiers de référence si la tâche implique DB, routes, PDF ou email.

---

## 1. Identité du projet

| Champ           | Valeur                                                              |
| --------------- | ------------------------------------------------------------------- |
| Nom             | BioLabTrack                                                         |
| Domaine         | biolabtrack.fr (DNS OVH)                                            |
| Hébergement     | Vercel (auto-deploy depuis `main`)                                  |
| Base de données | Neon PostgreSQL                                                     |
| Repo            | github.com/FrederickChenot/tracabilite-centrifugation               |
| Contexte métier | Traçabilité COFRAC pour laboratoire de biologie médicale            |
| Réseau          | GCS Bio Med — 3 sites : Épinal (principal), Remiremont, Neufchâteau |
| Utilisateur     | Fred — technicien de laboratoire et IT referent, CH Émile Durkheim  |

---

## 2. Stack technique complète

```
Next.js 14 (App Router)
├── TypeScript strict
├── Tailwind CSS (classes utilitaires uniquement)
├── NextAuth.js v4 (credentials provider)
│   ├── Rôle technicien → accès modules métier
│   └── Rôle admin → accès panel admin + tout
├── Neon PostgreSQL (pg / @neondatabase/serverless)
│   └── Connexion via DATABASE_URL dans .env
├── Resend (emails de notification transport)
│   └── Clé API préfixée "transport."
├── jsPDF + jsPDF-AutoTable (exports PDF)
│   ├── COFRAC centrifugation
│   └── Bon de transport avec QR code
└── qrcode (génération QR codes)
```

### Variables d'environnement (.env.local)

```env
DATABASE_URL=          # Neon connection string
NEXTAUTH_SECRET=       # Secret NextAuth
NEXTAUTH_URL=          # https://biolabtrack.fr
RESEND_API_KEY=        # Clé Resend (préfixe "transport.")
NEXT_PUBLIC_APP_URL=   # https://biolabtrack.fr
```

---

## 3. Conventions de code — RÈGLES ABSOLUES

### 3.1 Params async — LA règle la plus importante

```typescript
// ✅ TOUJOURS — Next.js 14+ impose await sur params
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // ...
}

// ✅ Même chose pour les routes API avec params dynamiques
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // ...
}

// ❌ JAMAIS — provoque erreur 500 silencieuse
export default async function Page({ params }: { params: { id: string } }) {
  const id = params.id; // INTERDIT
}
```

### 3.2 Structure des routes API

```typescript
// ✅ Pattern correct pour toutes les routes API
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const result = await sql`SELECT ...`;

    return Response.json({ data: result });
  } catch (error) {
    console.error("Erreur GET:", error);
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json(); // NE JAMAIS OUBLIER await
    // validation body...

    const sql = neon(process.env.DATABASE_URL!);
    const result = await sql`INSERT INTO ... RETURNING *`;

    return Response.json({ data: result[0] }, { status: 201 });
  } catch (error) {
    console.error("Erreur POST:", error);
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
```

### 3.3 Gestion des dates — pièges connus

```typescript
// ✅ Toujours stocker en ISO / TIMESTAMPTZ dans Neon
const dateISO = new Date().toISOString();

// ✅ Toujours formater à l'affichage côté client
const formatted = new Date(dateString).toLocaleDateString("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

// ❌ JAMAIS afficher directement une string date brute de la DB
// → provoque "Invalid Date" sur certains formats PostgreSQL
```

### 3.4 Connexion Neon

```typescript
// ✅ Pattern recommandé — instancier par appel, pas en module global
import { neon } from "@neondatabase/serverless";

export async function GET() {
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`SELECT * FROM table`;
  return Response.json(rows);
}
```

### 3.5 Protection des routes admin

```typescript
// ✅ Vérification rôle admin dans chaque route admin
const session = await getServerSession(authOptions);
if (!session || session.user.role !== "admin") {
  return Response.json({ error: "Accès refusé" }, { status: 403 });
}
```

---

## 4. Architecture des modules métier

### 4.1 Module Centrifugation

**Flux utilisateur :**

1. Technicien choisit son site → filtre les centrifugeuses disponibles
2. Sélectionne centrifugeuse → filtre les programmes associés
3. Scan des codes-barres tubes (saisie ou scan physique)
4. Validation → enregistrement Neon + génération PDF COFRAC
5. PDF téléchargeable / imprimable

**Données clés :**

```
Centrifugeuses actives :
- MFXPRO_8540  (Épinal)
- MFX3_6421    (Épinal)
- MFX3_5213    (Remiremont)
- MFST_7814    (Neufchâteau)
- Minispin     (multi-sites)
- Cytospin     (multi-sites)
+ centrifugeuses backup selon config admin
```

**Page publique :** `/recherche` — recherche d'un tube par code-barres, sans authentification

### 4.2 Module Transport

**Flux utilisateur :**

1. Technicien crée un bon de transport
2. Scanne les sachets → chaque sachet a une zone de température
3. Zones : `Ambiant` / `+4°C` / `Congelé`
4. Validation → génération PDF bon de transport + QR code unique
5. Email automatique Resend vers le labo destinataire
6. Coursier / destinataire confirme via page publique `/transport/[id]?token=xxx`

**Destinations :**

```
- CHRU Nancy
- EFS (Établissement Français du Sang)
- B2A
- MAT Régionale
```

**Structure sachet (JSONB en DB) :**

```typescript
interface Sachet {
  id: string; // code-barres sachet
  zone_temperature: "Ambiant" | "+4°C" | "Congelé";
  tubes: string[]; // codes-barres tubes dans le sachet
}
```

**Statuts bon de transport :**

```
en_attente → confirme
           → annule
```

### 4.3 Module Auth & Session

```typescript
// Types étendus NextAuth
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      nom: string;
      prenom: string;
      role: "technicien" | "admin";
      site: string;
    };
  }
}
```

**Timeout inactivité :** configurable via table `config` (clé `timeout_inactivite_minutes`)  
**Implémentation :** détection activité côté client, appel logout automatique

### 4.4 Panel Admin

Gestion complète des référentiels :

- **Sites** : CRUD (id, nom, actif)
- **Centrifugeuses** : CRUD + association site
- **Programmes** : CRUD + association centrifugeuse + paramètres (RPM, durée)
- **Destinations** : CRUD + email contact
- **Utilisateurs** : CRUD + rôle + site d'appartenance
- **Config** : timeout inactivité, autres paramètres globaux

---

## 5. Génération PDF

### 5.1 PDF COFRAC (centrifugation)

```typescript
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function generatePDFCentrifugation(
  session: SessionCentrifugation,
): Blob {
  const doc = new jsPDF();

  // En-tête
  doc.setFontSize(16);
  doc.text("FICHE DE TRAÇABILITÉ CENTRIFUGATION", 105, 20, { align: "center" });
  doc.setFontSize(10);
  doc.text(`GCS Bio Med — ${session.site}`, 105, 28, { align: "center" });

  // Informations session
  autoTable(doc, {
    startY: 40,
    head: [["Champ", "Valeur"]],
    body: [
      ["Date/Heure", formatDate(session.date_heure)],
      ["Opérateur", session.operateur],
      ["Centrifugeuse", session.centrifugeuse_id],
      ["Programme", session.programme_id],
      ["Nombre de tubes", session.tubes.length.toString()],
    ],
  });

  // Liste des tubes
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [["N°", "Code-barres tube"]],
    body: session.tubes.map((tube, i) => [i + 1, tube]),
  });

  // Pied de page COFRAC
  doc.setFontSize(8);
  doc.text("Document généré par BioLabTrack — biolabtrack.fr", 105, 285, {
    align: "center",
  });

  return doc.output("blob");
}
```

### 5.2 PDF Bon de transport avec QR code

```typescript
import QRCode from "qrcode";

export async function generatePDFTransport(bon: BonTransport): Promise<Blob> {
  const doc = new jsPDF();

  // QR code pointant vers la page de confirmation publique
  const qrUrl = `${process.env.NEXT_PUBLIC_APP_URL}/transport/${bon.id}?token=${bon.qr_token}`;
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 150 });

  doc.addImage(qrDataUrl, "PNG", 150, 10, 45, 45);

  // ... reste du PDF
  return doc.output("blob");
}
```

---

## 6. Emails Resend

```typescript
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function envoyerNotificationTransport(bon: BonTransport) {
  const confirmUrl = `${process.env.NEXT_PUBLIC_APP_URL}/transport/${bon.id}?token=${bon.qr_token}`;

  await resend.emails.send({
    from: "BioLabTrack <noreply@biolabtrack.fr>",
    to: bon.destination_email,
    subject: `Bon de transport #${bon.id.slice(0, 8)} — ${bon.site_depart}`,
    html: `
      <h2>Bon de transport reçu</h2>
      <p>Un transport en provenance de <strong>${bon.site_depart}</strong> est en route.</p>
      <p><a href="${confirmUrl}">Confirmer la réception</a></p>
    `,
  });
}
```

---

## 7. Migrations SQL — protocole strict

**RÈGLE : toujours fournir le SQL en bloc séparé, prêt à exécuter dans la console Neon.**

```sql
-- Template de migration
-- Toujours utiliser IF NOT EXISTS / IF EXISTS pour idempotence

-- Nouvelle colonne
ALTER TABLE nom_table
  ADD COLUMN IF NOT EXISTS nouvelle_colonne TYPE DEFAULT valeur;

-- Nouvelle contrainte CHECK (vérifier d'abord les données existantes !)
DO $$ BEGIN
  ALTER TABLE nom_table
    ADD CONSTRAINT check_nom CHECK (colonne IN ('val1', 'val2', 'val3'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Nouvel index
CREATE INDEX IF NOT EXISTS idx_nom ON table(colonne);

-- Nouvelle table
CREATE TABLE IF NOT EXISTS nom_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- colonnes...
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

> ⚠️ **Avant toute migration** : lire `references/schema.md` pour vérifier l'état actuel des tables.

---

## 8. Style de travail — règles de collaboration avec Fred

| #   | Règle                           | Détail                                                                      |
| --- | ------------------------------- | --------------------------------------------------------------------------- |
| 1   | **Un prompt à la fois**         | Fred envoie ses prompts numérotés, ne pas anticiper le suivant              |
| 2   | **Code complet**                | Toujours le fichier entier — jamais de `// ...` ou extraits partiels        |
| 3   | **SQL séparé**                  | Bloc SQL distinct et copier-collable, jamais inline dans le code            |
| 4   | **Grouper les corrections**     | Si plusieurs bugs, tout corriger dans une seule réponse                     |
| 5   | **Git en fin de réponse**       | Terminer par `git add . && git commit -m "feat: ..." && git push`           |
| 6   | **Une seule version**           | Pas d'itérations v1/v2 dans la même réponse — directement la version finale |
| 7   | **Pas de questions superflues** | Si le contexte est clair, coder directement sans demander de confirmation   |
| 8   | **Messages de commit clairs**   | Format `feat:`, `fix:`, `refactor:`, `style:`, `chore:`                     |

---

## 9. Bugs résolus — NE PAS REPRODUIRE

| Bug                            | Cause                                      | Solution                                                     |
| ------------------------------ | ------------------------------------------ | ------------------------------------------------------------ |
| `Invalid Date` à l'affichage   | String date brute PostgreSQL               | Toujours `new Date(str).toLocaleDateString(...)`             |
| Erreur 500 sur route POST      | `params` non awaité                        | `const { id } = await params`                                |
| INSERT bloqué par CHECK        | Contrainte ajoutée avant nettoyage données | Vérifier/nettoyer données avant `ADD CONSTRAINT`             |
| Colonne introuvable en runtime | Migration oubliée sur Neon prod            | Toujours exécuter le SQL sur Neon Console avant deploy       |
| Auth perdue après refresh      | Session mal configurée                     | Vérifier `NEXTAUTH_SECRET` et `NEXTAUTH_URL` en prod         |
| Email non reçu                 | Domaine Resend non vérifié                 | Vérifier DNS Resend sur OVH (biolabtrack.fr)                 |
| PDF vide                       | jsPDF chargé côté serveur                  | Générer les PDF uniquement côté client ou dans une API route |

---

## 10. Structure des fichiers du projet

```
tracabilite-centrifugation/
├── app/
│   ├── (auth)/
│   │   └── login/
│   ├── (protected)/
│   │   ├── centrifugation/
│   │   │   ├── page.tsx          # Nouvelle session
│   │   │   └── historique/
│   │   ├── transport/
│   │   │   ├── page.tsx          # Nouveau bon
│   │   │   └── historique/
│   │   └── admin/
│   │       ├── page.tsx
│   │       ├── sites/
│   │       ├── centrifugeuses/
│   │       ├── programmes/
│   │       ├── destinations/
│   │       ├── users/
│   │       └── config/
│   ├── recherche/                # PUBLIC — sans auth
│   │   └── page.tsx
│   ├── transport/
│   │   └── [id]/                 # PUBLIC — confirmation
│   │       └── page.tsx
│   └── api/
│       ├── auth/[...nextauth]/
│       ├── centrifugation/
│       │   └── [id]/
│       ├── transport/
│       │   └── [id]/
│       │       └── confirmer/
│       ├── recherche/
│       └── admin/
│           ├── sites/
│           ├── centrifugeuses/
│           ├── programmes/
│           ├── destinations/
│           ├── users/
│           └── config/
├── lib/
│   ├── auth.ts                   # Config NextAuth + authOptions
│   ├── db.ts                     # Connexion Neon
│   ├── pdf-centrifugation.ts     # Génération PDF COFRAC
│   ├── pdf-transport.ts          # Génération PDF bon de transport
│   └── email.ts                  # Resend notifications
├── components/
│   ├── ui/                       # Composants réutilisables
│   ├── centrifugation/
│   ├── transport/
│   └── admin/
├── middleware.ts                  # Protection routes auth
├── .env.local
└── CLAUDE.md                     # Contexte pour Claude Code
```

---

## 11. Checklist avant chaque déploiement

- [ ] Migration SQL exécutée sur Neon Console (pas seulement en local)
- [ ] Variables d'environnement à jour sur Vercel
- [ ] `git push` sur `main` (déclenche auto-deploy Vercel)
- [ ] Tester `/recherche` (page publique, sans auth)
- [ ] Tester `/transport/[id]` (page publique confirmation)
- [ ] Vérifier les logs Vercel si erreur 500

---

## 12. Fichiers de référence — quand les lire

| Fichier                         | Lire quand...                                           |
| ------------------------------- | ------------------------------------------------------- |
| `references/schema.md`          | Nouvelle table, migration, nouvelle colonne, contrainte |
| `references/routes.md`          | Nouvelle route, middleware, redirect, lien interne      |
| `references/pdf-specs.md`       | Modification export PDF COFRAC ou bon de transport      |
| `references/email-templates.md` | Modification des emails Resend                          |
