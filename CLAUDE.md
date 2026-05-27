# CLAUDE.md — BioLabTrack

> Lire ce fichier en entier avant toute action.  
> Puis lire **skills/biolabtrack-skill-v2/SKILL.md** avant d'écrire le moindre code.

---

## Projet

Application Next.js 14 de traçabilité pour laboratoire médical GCS Bio Med.  
Repo : `github.com/FrederickChenot/tracabilite-centrifugation`  
URL prod : `https://biolabtrack.fr` (Vercel + Neon PostgreSQL)

---

## Règles absolues — à respecter sans exception

1. **Lire le skill complet** avant de coder : `skills/biolabtrack-skill-v2/SKILL.md`
2. **`await params`** — toujours, sans exception (Next.js 14+)
3. **Code complet** — jamais de `// ...` ou d'extraits partiels
4. **SQL séparé** — chaque migration dans un bloc SQL distinct et copier-collable
5. **Git en fin** — terminer par `git add . && git commit -m "..." && git push`
6. **Un prompt à la fois** — ne pas anticiper le prompt suivant de Fred

---

## Stack

```
Next.js 14 · TypeScript · Tailwind CSS
NextAuth.js (rôles: technicien / admin)
Neon PostgreSQL (@neondatabase/serverless)
Resend (emails) · jsPDF (exports COFRAC) · qrcode (QR transport)
Vercel (auto-deploy depuis main)
```

---

## Variables d'environnement requises

```env
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=https://biolabtrack.fr
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=https://biolabtrack.fr
```

---

## Référentiels métier

**Sites GCS Bio Med :** Épinal (principal) · Remiremont · Neufchâteau  
**Centrifugeuses :** MFXPRO_8540 · MFX3_6421 · MFX3_5213 · MFST_7814 · Minispin · Cytospin  
**Destinations transport :** CHRU Nancy · EFS · B2A · MAT Régionale  
**Zones température :** `Ambiant` · `+4°C` · `Congelé`

---

## Fichiers de référence (lire selon le besoin)

| Fichier | Lire quand... |
|---------|---------------|
| `skills/biolabtrack-skill-v2/SKILL.md` | **Toujours en premier** |
| `skills/biolabtrack-skill-v2/references/schema.md` | Migration SQL, nouvelle table, nouvelle colonne |
| `skills/biolabtrack-skill-v2/references/routes.md` | Nouvelle route, middleware, lien interne |
| `skills/biolabtrack-skill-v2/references/pdf-specs.md` | Export PDF COFRAC ou bon de transport |
| `skills/biolabtrack-skill-v2/references/email-templates.md` | Emails Resend |

---

## Bugs déjà résolus — ne pas reproduire

- `Invalid Date` → toujours `new Date(str).toLocaleString('fr-FR')`
- Erreur 500 route API → `const { id } = await params`
- INSERT bloqué → vérifier données avant `ADD CONSTRAINT CHECK`
- Migration non appliquée en prod → toujours exécuter sur Neon Console avant deploy
