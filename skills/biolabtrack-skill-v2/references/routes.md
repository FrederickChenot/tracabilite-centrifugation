# Routes BioLabTrack — Référence complète App Router

---

## Pages publiques (aucune auth requise)

| Route | Fichier | Description |
|-------|---------|-------------|
| `/recherche` | `app/recherche/page.tsx` | Recherche tube par code-barres |
| `/transport/[id]` | `app/transport/[id]/page.tsx` | Confirmation coursier / destinataire |
| `/login` | `app/(auth)/login/page.tsx` | Page de connexion |

### Page `/transport/[id]` — paramètres URL
```
/transport/550e8400-e29b-41d4-a716-446655440000?token=abc123xyz
         └─ id du bon (UUID)                    └─ qr_token pour vérification
```

---

## Pages authentifiées (rôle technicien OU admin)

| Route | Fichier | Description |
|-------|---------|-------------|
| `/` | `app/(protected)/page.tsx` | Dashboard principal |
| `/centrifugation` | `app/(protected)/centrifugation/page.tsx` | Nouvelle session |
| `/centrifugation/historique` | `app/(protected)/centrifugation/historique/page.tsx` | Historique sessions |
| `/transport` | `app/(protected)/transport/page.tsx` | Nouveau bon de transport |
| `/transport/historique` | `app/(protected)/transport/historique/page.tsx` | Historique bons |

---

## Pages admin uniquement (rôle admin)

| Route | Fichier | Description |
|-------|---------|-------------|
| `/admin` | `app/(protected)/admin/page.tsx` | Dashboard admin |
| `/admin/sites` | `app/(protected)/admin/sites/page.tsx` | Gestion sites |
| `/admin/centrifugeuses` | `app/(protected)/admin/centrifugeuses/page.tsx` | Gestion centrifugeuses |
| `/admin/programmes` | `app/(protected)/admin/programmes/page.tsx` | Gestion programmes |
| `/admin/destinations` | `app/(protected)/admin/destinations/page.tsx` | Gestion destinations |
| `/admin/users` | `app/(protected)/admin/users/page.tsx` | Gestion utilisateurs |
| `/admin/config` | `app/(protected)/admin/config/page.tsx` | Configuration globale |

---

## Routes API

### Centrifugation
| Route | Méthode | Auth | Description |
|-------|---------|------|-------------|
| `/api/centrifugation` | GET | ✅ | Liste sessions (filtres: site, date) |
| `/api/centrifugation` | POST | ✅ | Créer nouvelle session |
| `/api/centrifugation/[id]` | GET | ✅ | Détail session |
| `/api/centrifugation/[id]` | PUT | ✅ | Modifier session |
| `/api/centrifugation/[id]` | DELETE | Admin | Supprimer session |
| `/api/centrifugation/[id]/pdf` | GET | ✅ | Générer PDF COFRAC |

### Transport
| Route | Méthode | Auth | Description |
|-------|---------|------|-------------|
| `/api/transport` | GET | ✅ | Liste bons (filtres: site, statut) |
| `/api/transport` | POST | ✅ | Créer bon de transport |
| `/api/transport/[id]` | GET | Public | Détail bon (pour confirmation) |
| `/api/transport/[id]` | PUT | ✅ | Modifier bon |
| `/api/transport/[id]/confirmer` | POST | Public+token | Confirmation destinataire |
| `/api/transport/[id]/pdf` | GET | ✅ | Générer PDF bon transport |

### Recherche (publique)
| Route | Méthode | Auth | Description |
|-------|---------|------|-------------|
| `/api/recherche` | GET | ❌ Public | Recherche tube par code-barres |

**Paramètres :** `?q=CODE_BARRE`

### Admin
| Route | Méthode | Auth | Description |
|-------|---------|------|-------------|
| `/api/admin/sites` | GET/POST/PUT/DELETE | Admin | CRUD sites |
| `/api/admin/centrifugeuses` | GET/POST/PUT/DELETE | Admin | CRUD centrifugeuses |
| `/api/admin/programmes` | GET/POST/PUT/DELETE | Admin | CRUD programmes |
| `/api/admin/destinations` | GET/POST/PUT/DELETE | Admin | CRUD destinations |
| `/api/admin/users` | GET/POST/PUT/DELETE | Admin | CRUD utilisateurs |
| `/api/admin/config` | GET/PUT | Admin | Lire/modifier config |

### Auth
| Route | Méthode | Auth | Description |
|-------|---------|------|-------------|
| `/api/auth/[...nextauth]` | GET/POST | ❌ | NextAuth handler |

---

## Middleware — protection des routes

```typescript
// middleware.ts
export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    '/((?!api/auth|api/recherche|api/transport/[^/]+$|recherche|transport/[^/]+$|login|_next|favicon).*)',
  ],
};
```

> **Note :** `/api/transport/[id]` (GET) et `/api/transport/[id]/confirmer` sont publics  
> car accessibles depuis le QR code sans connexion.