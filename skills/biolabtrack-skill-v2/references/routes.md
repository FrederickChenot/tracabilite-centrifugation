# Routes BioLabTrack — Référence complète App Router

> Reconstruit par inspection réelle du code (`find src/app -name page.tsx -o -name route.ts`
> + lecture de chaque fichier), pas depuis l'ancienne version de ce document qui décrivait
> une arborescence `app/(protected)/...` qui n'existe plus dans ce repo.
> Si un doute subsiste sur un comportement précis, relire le fichier cité avant de s'y fier.

---

## 0. Les 2 systèmes d'accès — lire avant tout le reste

BioLabTrack a **deux mécanismes d'authentification indépendants**, gérés tous les deux dans
`src/proxy.ts` (Next.js 16 a renommé `middleware.ts` en `proxy.ts`) :

1. **Session NextAuth** (`req.auth`, cookie de session signé) — connexion par **matricule**
   via `/login`, credentials provider (`src/lib/auth.ts`). Donne accès à `/tickets`, `/admin`,
   `/profil`, et à la plupart des routes `/api/*` hors `/api/outils/*` et `/api/centri/*`.
   Porte un `role` (voir §1) et un flag `must_change_password`.
2. **Cookie `labo_access`** (httpOnly, `maxAge` 12h) — mot de passe labo **partagé**, saisi via
   `/outils/login`, posé par `POST /api/outils/auth` (compare à `process.env.LABO_PASSWORD`).
   Donne accès à `/outils/centrifugation`, `/outils/transport`, `/recherche` — **aucun rapport
   avec la session NextAuth, aucun rôle, aucun utilisateur identifié individuellement**.

**Erreur la plus fréquente (déjà corrigée 2 fois, voir CLAUDE.md) :** rediriger un utilisateur
qui vient de se connecter par matricule vers `/outils/centrifugation`. Cette route exige le
cookie `labo_access`, pas une session NextAuth — un utilisateur avec une session valide mais
sans le cookie labo est renvoyé en boucle vers `/outils/login`.

### Matrice complète `src/proxy.ts` (dans l'ordre où les règles sont évaluées)

| # | Condition | Comportement |
|---|-----------|--------------|
| 1 | `pathname === '/login'` ET session NextAuth active | Redirige selon le rôle : `/profil` si `must_change_password`, `/admin` si `role === 'admin'`, sinon `/tickets`. Jamais vers `/outils/centrifugation`. |
| 2 | `/outils/centrifugation(/*)`, `/outils/transport(/*)`, `/recherche(/*)` | Exige le cookie `labo_access === 'true'`, sinon redirige vers `/outils/login`. **Ignore complètement la session NextAuth.** |
| 3 | `/`, `/mentions-legales`, `/cgu`, `/login(/*)`, `/api/auth/*`, `/api/contact*`, `/transport/*`, `/t/*`, `/api/transport/*`, `/api/public/*`, `/outils/*`, `/api/centri/*`, `/api/referentiels*`, `/api/admin/sites` (exact), `/api/outils/auth` (exact) | Public au niveau du proxy — laissé passer sans vérification (chaque route API gère elle-même son auth, voir §2). |
| 4 | Aucune session NextAuth (`!req.auth`) | Redirige vers `/login`. |
| 5 | Session active, `must_change_password === true`, pathname hors `/profil` et hors `/api/*` | Redirige vers `/profil`. |
| 6 | `/admin(/*)` ou `/api/admin/*` avec `role !== 'admin'` | Redirige vers `/tickets`. |
| 7 | Sinon | Laisse passer (`NextResponse.next()`). |

Point important : la règle 3 rend `/api/centri/*` et `/api/transport/*` **publics au niveau du
proxy** — c'est chaque route qui décide en interne d'accepter la session, le cookie labo, ou
rien du tout (§2 détaille route par route). Ne pas supposer qu'une route sous ces préfixes est
protégée juste parce qu'elle est sous `/api/`.

---

## 1. Rôles (8 valeurs, contrainte `check_role` sur `users.role`)

`technicien`, `biologiste`, `secretaire`, `cadre`, `assistante_qualite`, `agent_transverse`,
`responsable_processus_info`, `admin`.

Seul `admin` a un traitement particulier dans `proxy.ts` (règle 6 ci-dessus) et dans la plupart
des routes `/api/admin/*`. `biologiste` et `responsable_processus_info` ont un traitement
particulier uniquement pour l'assignation de tickets (voir §3).

---

## 2. Pages (`page.tsx`)

### 2.1 Publiques (aucune auth, aucun cookie)

| Route | Fichier | Notes |
|---|---|---|
| `/` | `src/app/page.tsx` | Landing page marketing + formulaire de contact (`POST /api/contact`). |
| `/mentions-legales` | `src/app/mentions-legales/page.tsx` | Statique. |
| `/cgu` | `src/app/cgu/page.tsx` | Statique. |
| `/login` | `src/app/login/page.tsx` | Connexion par matricule (credentials NextAuth). Après succès : `getSession()` puis redirige selon rôle (voir §0, même logique que `proxy.ts`). |
| `/login/forgot-password` | `src/app/login/forgot-password/page.tsx` | Envoie un lien de réinitialisation (`POST /api/auth/forgot-password`). |
| `/login/reset-password` | `src/app/login/reset-password/page.tsx` | Consomme le token de `password_reset_tokens`. |
| `/outils/login` | `src/app/outils/login/page.tsx` | Saisie du mot de passe labo partagé → pose le cookie `labo_access`. |
| `/transport/[id]` | `src/app/transport/[id]/page.tsx` | Page de suivi/confirmation d'un bon de transport (prise en charge coursier, réception destinataire). Whitelisted en dur dans `proxy.ts` (`startsWith('/transport/')`). |
| `/t/[code]` | `src/app/t/[code]/page.tsx` | Résout un `code_acces` court (ex. `ABC-1234`) via `GET /api/public/transport/[code]` puis redirige vers `/transport/[id]`. |

### 2.2 Session NextAuth requise (tout rôle)

| Route | Fichier | Notes |
|---|---|---|
| `/profil` | `src/app/profil/page.tsx` | Changement de mot de passe (`POST /api/auth/change-password`), infos du compte. Cible de redirection si `must_change_password`. |
| `/tickets` | `src/app/tickets/page.tsx` | Kanban des tickets (drag & drop). |
| `/tickets/nouveau` | `src/app/tickets/nouveau/page.tsx` | Création d'un ticket ; charge la liste des utilisateurs via `GET /api/admin/users` pour l'assignation à la création. |
| `/tickets/[id]` | `src/app/tickets/[id]/page.tsx` | Détail ticket : commentaires, pièces jointes, historique, checklist. Bloc "Assignés" et annulation avec droits différenciés — voir §3. |
| `/archives/centrifugation` | `src/app/archives/centrifugation/page.tsx` | Historique complet des sessions (appelle `GET /api/centri/archives`, qui exige une session NextAuth, **pas** le cookie labo — contrairement à l'outil live). |
| `/archives/transport` | `src/app/archives/transport/page.tsx` | Historique complet des envois (`GET /api/transport/historique`, session requise). |

### 2.3 Rôle `admin` requis (appliqué par `proxy.ts` règle 6, pas par la page elle-même)

| Route | Fichier | Notes |
|---|---|---|
| `/admin` | `src/app/admin/page.tsx` | Dashboard : onglets Sessions / Référentiels / Configuration (`ConfigTab`, `ReferentielsTab`). |
| `/admin/users` | `src/app/admin/users/page.tsx` | CRUD utilisateurs complet (seule page de gestion des utilisateurs — le formulaire dupliqué dans `ConfigTab` a été supprimé). |

### 2.4 Cookie `labo_access` requis (proxy.ts règle 2 — **pas** de session NextAuth)

| Route | Fichier | Notes |
|---|---|---|
| `/outils/centrifugation` | `src/app/outils/centrifugation/page.tsx` | Outil de saisie centrifugation temps réel. |
| `/outils/transport` | `src/app/outils/transport/page.tsx` | Création/suivi des bons de transport (accès rapide, pas d'historique complet — voir `/archives/transport` pour ça). |
| `/recherche` | `src/app/recherche/page.tsx` | Recherche de tube par code-barres. |

### 2.5 Legacy / à vérifier — ne pas prendre pour des routes actives sans relire le code

| Route | Fichier | Constat |
|---|---|---|
| `/admin/login` | `src/app/admin/login/page.tsx` | Formulaire `signIn('credentials', { email, password })` — mais `authorize()` dans `src/lib/auth.ts` n'accepte que `{ matricule, password }` (`email` n'est jamais lu). Login toujours en échec silencieux. De plus, `proxy.ts` ne whiteliste que `startsWith('/login')`, pas `/admin/login` : un visiteur non connecté y est immédiatement redirigé vers `/login`. Page à priori inatteignable et non fonctionnelle en l'état — semble être un reliquat d'avant la migration vers l'auth par matricule. |
| `/app` | `src/app/app/page.tsx` | `useEffect` qui redirige immédiatement vers `/login`. Reliquat, sans effet de bord dangereux. |

---

## 3. Module Tickets — détail

| Endpoit | Fichier | Auth |
|---|---|---|
| `GET /api/tickets` | `src/app/api/tickets/route.ts` | Session requise. Liste tous les tickets (pas de filtre par rôle). |
| `POST /api/tickets` | `src/app/api/tickets/route.ts` | Session requise. Génère `numero_ticket` (`T-AAAA-MM-JJ-NNNN`). |
| `GET /api/tickets/[id]` | `src/app/api/tickets/[id]/route.ts` | Session requise. |
| `PUT /api/tickets/[id]` | `src/app/api/tickets/[id]/route.ts` | Session requise. Modifie statut/priorité/description/échéance/checklist ; journalise chaque changement dans `ticket_historique`. |
| `POST /api/tickets/[id]/commenter` | `src/app/api/tickets/[id]/commenter/route.ts` | Session requise. |
| `DELETE /api/tickets/[id]/commenter/[histId]` | `src/app/api/tickets/[id]/commenter/[histId]/route.ts` | Session requise + (auteur du commentaire OU `role === 'admin'`). |
| `POST /api/tickets/[id]/upload` | `src/app/api/tickets/[id]/upload/route.ts` | Session requise. Upload Vercel Blob **`access: 'private'`** obligatoire (voir CLAUDE.md — a régressé une fois via merge). Suppression d'une pièce : auteur de l'upload OU admin. |
| `GET /api/tickets/[id]/files/[pieceId]` | `src/app/api/tickets/[id]/files/[pieceId]/route.ts` | Session requise. Proxy de lecture du blob privé (le blob n'est pas exposé en URL publique directe). |
| `POST /api/tickets/[id]/annuler` | `src/app/api/tickets/[id]/annuler/route.ts` | **`role === 'admin'` uniquement.** Motif obligatoire. |
| `POST /api/tickets/[id]/assigner` | `src/app/api/tickets/[id]/assigner/route.ts` | **`role` ∈ `{'admin', 'biologiste', 'responsable_processus_info'}`** (`ROLES_ASSIGNATION`). Envoie un email Resend à chaque nouvel assigné. |
| `GET /api/tickets/count` | `src/app/api/tickets/count/route.ts` | Session requise. Nombre de tickets `a_faire`/`en_cours` assignés à l'utilisateur courant — alimente le badge de la Sidebar. |
| `GET /api/cron/rappels` | `src/app/api/cron/rappels/route.ts` | **Pas de session** — header `Authorization: Bearer ${CRON_SECRET}` uniquement. Appelé par le cron Vercel (`vercel.json`, 7h) : email de rappel aux assignés dont l'échéance est J ou J+2. |

Composant client `src/app/tickets/[id]/page.tsx` — deux variables de droits distinctes, à ne pas
confondre :
- `isAdmin` (`role === 'admin'`) : annulation du ticket, suppression de n'importe quel
  commentaire/pièce jointe.
- `peutAssigner` (`isAdmin || role === 'biologiste' || role === 'responsable_processus_info'`) :
  affichage du bloc "Assignés" (liste éditable vs lecture seule). Doit rester strictement
  aligné avec `ROLES_ASSIGNATION` côté serveur dans `assigner/route.ts`, et avec la liste de
  rôles autorisés sur `GET /api/admin/users` (sinon le bloc s'affiche mais la liste
  d'utilisateurs à cocher ne charge jamais — voir entrée CLAUDE.md correspondante).

---

## 4. Toutes les routes API — détail par module

Légende auth : **Public** = aucune vérification · **Session** = `auth()` non nul, tout rôle ·
**Session+cookie** = accepte l'un OU l'autre (`auth()` non nul OU cookie `labo_access==='true'`)
· **Admin** = `role === 'admin'` · **Token** = vérification par jeton/secret hors NextAuth.

### 4.1 Auth / compte

| Route | Méthode | Fichier | Auth |
|---|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | `src/app/api/auth/[...nextauth]/route.ts` | Public (handler NextAuth lui-même) |
| `/api/auth/change-password` | POST | `src/app/api/auth/change-password/route.ts` | Session |
| `/api/auth/forgot-password` | GET/POST | `src/app/api/auth/forgot-password/route.ts` | Public (par design — ne révèle jamais si l'email existe) |
| `/api/auth/reset-password` | GET/POST | `src/app/api/auth/reset-password/route.ts` | Public (protégé par token à usage unique dans l'URL) |
| `/api/outils/auth` | POST | `src/app/api/outils/auth/route.ts` | Public — compare à `LABO_PASSWORD`, pose le cookie `labo_access` |
| `/api/config` | GET | `src/app/api/config/route.ts` | Session — expose `session_timeout_minutes` / `session_warning_minutes` (pour `InactivityGuard`) |
| `/api/contact` | POST | `src/app/api/contact/route.ts` | Public — formulaire de contact landing page |

### 4.2 Centrifugation (`/api/centri/*`)

| Route | Méthode | Fichier | Auth |
|---|---|---|---|
| `/api/centri/sessions` | GET/POST | `src/app/api/centri/sessions/route.ts` | Session+cookie (POST vérifie en plus `site_id` cohérent avec l'utilisateur si non-admin) |
| `/api/centri/sessions/[id]` | GET | `src/app/api/centri/sessions/[id]/route.ts` | Session+cookie |
| `/api/centri/sessions/[id]/cloturer` | PATCH | `src/app/api/centri/sessions/[id]/cloturer/route.ts` | Session+cookie |
| `/api/centri/sessions/[id]/rouvrir` | PATCH | `src/app/api/centri/sessions/[id]/rouvrir/route.ts` | Session+cookie — refuse après 5 min (`diffMinutes > 5`) |
| `/api/centri/tubes` | POST | `src/app/api/centri/tubes/route.ts` | Session+cookie |
| `/api/centri/tubes/[id]` | PATCH/DELETE | `src/app/api/centri/tubes/[id]/route.ts` | Session+cookie |
| `/api/centri/historique` | GET | `src/app/api/centri/historique/route.ts` | Session+cookie |
| `/api/centri/users` | GET | `src/app/api/centri/users/route.ts` | Session+cookie — liste `id, prenom, nom, matricule` des utilisateurs actifs (pour le sélecteur d'opérateur) |
| `/api/centri/recherche` | GET | `src/app/api/centri/recherche/route.ts` | **Session uniquement** (pas de cookie labo) |
| `/api/centri/archives` | GET | `src/app/api/centri/archives/route.ts` | **Session uniquement** (pas de cookie labo) |
| `/api/referentiels` | GET | `src/app/api/referentiels/route.ts` | Public au niveau proxy (`startsWith('/api/referentiels')`) — pas de vérification dans le fichier lui-même. Retourne centrifugeuses + programmes par site. |

### 4.3 Transport (`/api/transport/*`, `/api/public/transport/*`)

| Route | Méthode | Fichier | Auth |
|---|---|---|---|
| `/api/transport/envois` | GET/POST | `src/app/api/transport/envois/route.ts` | Session — génère `code_acces` (ex. `ABC-1234`) et `numero_bordereau` (`TR-AAAA-MM-JJ-NNNN`) |
| `/api/transport/envois/[id]` | GET | `src/app/api/transport/envois/[id]/route.ts` | **Public** — aucune vérification dans le fichier |
| `/api/transport/envois/[id]/valider` | PATCH | `src/app/api/transport/envois/[id]/valider/route.ts` | Session |
| `/api/transport/envois/[id]/rouvrir` | PATCH | `src/app/api/transport/envois/[id]/rouvrir/route.ts` | Session |
| `/api/transport/envois/[id]/envoyer` | POST | `src/app/api/transport/envois/[id]/envoyer/route.ts` | **Public** — prise en charge coursier, action déclenchée depuis `/transport/[id]` sans login |
| `/api/transport/envois/[id]/receptionner` | POST | `src/app/api/transport/envois/[id]/receptionner/route.ts` | **Public** — réception destinataire, même logique |
| `/api/transport/sachets` | POST | `src/app/api/transport/sachets/route.ts` | Session |
| `/api/transport/sachets/[id]` | DELETE | `src/app/api/transport/sachets/[id]/route.ts` | Session |
| `/api/transport/historique` | GET | `src/app/api/transport/historique/route.ts` | Session |
| `/api/transport/laboratoires` | GET | `src/app/api/transport/laboratoires/route.ts` | **Public** — liste des labos destinataires actifs (lecture seule ; la version admin avec CRUD est `/api/admin/laboratoires`) |
| `/api/public/transport/[code]` | GET | `src/app/api/public/transport/[code]/route.ts` | Public — résout un `code_acces` court en `envoi_id` pour `/t/[code]` |

Toutes les routes `/api/transport/*` sont whitelistées au niveau `proxy.ts` (public au niveau
middleware) ; l'auth ci-dessus est celle vérifiée **dans le fichier lui-même**. Les 3 routes
publiques (`GET [id]`, `envoyer`, `receptionner`) correspondent au parcours coursier/destinataire
sans compte, déclenché depuis `/transport/[id]`.

### 4.4 Tickets

Voir §3 (tableau dédié, plus détaillé).

### 4.5 Admin — référentiels et configuration (`role === 'admin'` sur toutes ces routes, sans exception)

| Route | Méthodes | Fichier |
|---|---|---|
| `/api/admin/sites` | GET/POST | `src/app/api/admin/sites/route.ts` |
| `/api/admin/sites/[id]` | PATCH | `src/app/api/admin/sites/[id]/route.ts` |
| `/api/admin/centrifugeuses` | GET/POST | `src/app/api/admin/centrifugeuses/route.ts` |
| `/api/admin/centrifugeuses/[id]` | PATCH | `src/app/api/admin/centrifugeuses/[id]/route.ts` |
| `/api/admin/centrifugeuses/ordre` | PATCH | `src/app/api/admin/centrifugeuses/ordre/route.ts` |
| `/api/admin/programmes` | GET/POST | `src/app/api/admin/programmes/route.ts` |
| `/api/admin/programmes/[id]` | PATCH/DELETE | `src/app/api/admin/programmes/[id]/route.ts` |
| `/api/admin/laboratoires` | GET/POST | `src/app/api/admin/laboratoires/route.ts` |
| `/api/admin/laboratoires/[id]` | PATCH | `src/app/api/admin/laboratoires/[id]/route.ts` |
| `/api/admin/config` | GET/PATCH | `src/app/api/admin/config/route.ts` |
| `/api/admin/config/[cle]` | PATCH | `src/app/api/admin/config/[cle]/route.ts` |
| `/api/admin/migrate` | POST | `src/app/api/admin/migrate/route.ts` | Utilitaire one-shot (ALTER/CREATE idempotents) — à lancer manuellement après déploiement d'une migration, pas appelé par l'UI |
| `/api/admin/migrate-users` | POST | `src/app/api/admin/migrate-users/route.ts` | Utilitaire one-shot legacy (recrée une table `users` minimale si absente) |
| `/api/admin/seed-demo` | POST | `src/app/api/admin/seed-demo/route.ts` | Crée le compte démo `D00001` si absent |

### 4.6 Admin — utilisateurs (seule famille de routes avec un niveau d'auth différencié par méthode)

| Route | Méthode | Fichier | Auth |
|---|---|---|---|
| `/api/admin/users` | **GET** | `src/app/api/admin/users/route.ts` | **`role` ∈ `{'admin', 'biologiste', 'responsable_processus_info'}`** (`ROLES_LECTURE`) — ouvert à ces 3 rôles car c'est cette route qui alimente le picker d'assignation de tickets (`tickets/[id]/page.tsx`, `tickets/nouveau/page.tsx`) |
| `/api/admin/users` | **POST** | `src/app/api/admin/users/route.ts` | **Admin uniquement** |
| `/api/admin/users/[id]` | PUT/PATCH | `src/app/api/admin/users/[id]/route.ts` | **Admin uniquement** |
| `/api/admin/users/[id]/reset-password` | POST | `src/app/api/admin/users/[id]/reset-password/route.ts` | **Admin uniquement** — génère un mot de passe temporaire, force `must_change_password = true` |

**Ne pas régresser** : si un futur rôle doit accéder à l'assignation de tickets, il faut mettre à
jour **ensemble** `ROLES_ASSIGNATION` (`tickets/[id]/assigner/route.ts`), `ROLES_LECTURE`
(`admin/users/route.ts` GET) et `peutAssigner` (`tickets/[id]/page.tsx`) — les trois doivent
rester synchronisés, sinon le picker d'assignation s'affiche mais reste vide (403 silencieux sur
le fetch de la liste).
