<div align="center">

# ⚽ DaronsFC

### Le jeu de pronos entre darons (et fiers de l'être) 🏆

*Pronostique, mets ton joker, chambre tes potes dans le tchat, et grimpe au classement.*

![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-blue?logo=postgresql&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?logo=pwa&logoColor=white)

</div>

---

## 🎯 C'est quoi ?

**DaronsFC** est une appli web (PWA installable) de pronostics de foot, pensée pour une bande de potes. Chacun prédit le score des matchs, gagne des points selon sa lucidité, déclenche des **jokers** pour doubler la mise, débloque des **badges**, et défend son rang dans le **classement de son groupe** — le tout avec un **tchat** pour mettre l'ambiance.

L'appli suit **une compétition à la fois**, la « saison » : la **Ligue des Champions 2026/2027** est celle en cours, la **Coupe du Monde 2026** est archivée (cf. [Saisons](#-saisons)).

Pas de données bidon : les matchs et scores viennent en direct de l'API **football-data.org**, synchronisés automatiquement.

## ✨ Les fonctionnalités

- 🔮 **Pronostics** — saisie du score au but près, modifiable jusqu'au coup d'envoi (verrouillé après, anti-triche).
- 🃏 **Jokers** — double les points d'un prono. Budget par phase, réglé par saison : **8 / 4** en Ligue des Champions (8 journées de phase de ligue), **4 / 2** en Coupe du Monde.
- 🏆 **Classement live** — points acquis + points provisoires pendant les matchs en cours, avec flèches d'évolution ▲▼.
- 👥 **Groupes** — crée ta bande via un lien d'invitation, chacun son classement.
- 💬 **Tchat de groupe** — messages, réactions emoji, épinglage (admin), notifications push.
- 🤖 **Récaps automatiques** — après chaque match, un bandeau récap tombe dans le tchat : podium, meilleurs pronos, jokers gagnés/grillés, changement de leader.
- 🎖️ **Badges** — 10 hauts faits à débloquer (voir plus bas).
- 🇫🇷 **Thème tricolore** — sur les compétitions de sélections, l'interface passe en **bleu nuit / bleu-blanc-rouge** les jours de match des Bleus. Allez les Bleus ! 💙🤍❤️
- 📲 **Notifications push** — résultat tombé, tu t'es fait doubler, récap… directement sur ton téléphone.
- 📊 **Classements officiels** — la phase de ligue à 36 clubs (avec les barres de qualification 1-8 / 9-24 / 25-36) ou les poules, selon la compétition, et le tableau de la phase finale.
- 🗄️ **Archives** — chaque saison terminée garde son palmarès figé (classement final par groupe, vainqueur, badges) et tous ses résultats.
- 📖 **Règles du jeu** (`/regles`) — la page de référence, générée d'après la saison en cours : barème, budgets de jokers, périmètre des pronos, format de la compétition. C'est là qu'on explique ce qui n'est pas devinable depuis l'interface.
- ⚔️ **Duels & rivalités** — à chaque journée tu affrontes un membre du groupe par rotation ; bilan tête-à-tête, « ton miroir », « ta bête noire » et « il fallait recopier X ».
- 🔥 **Séries et couronnes** — 3 bons résultats d'affilée s'affichent au classement, et le vainqueur de la saison précédente porte un 👑.
- ❤️ **Club de cœur** — purement décoratif, affiché à côté de ton nom.
- 🍻 **Enjeu de saison** — une mise déclarée par un admin, affichée en permanence sur le Hub avec le nom du dernier au classement.
- 💀 **Musée des horreurs** — les pires pronos du groupe, toutes saisons confondues.

## 🗓️ Saisons

L'appli suit **une compétition active à la fois**. Tout ce qui est propre à une compétition — matchs, résultats, pronostics, groupes d'amis et leur tchat — est rattaché à une saison. Les agrégats de jeu (points, badges, pari champion) sont ceux de la saison en cours ; ils sont **figés dans les archives** à la clôture, puis remis à zéro.

| Saison | Format | Emblèmes | Jokers |
|---|---|---|:---:|
| `CL-2026-2027` — Ligue des Champions 2026/2027 | Phase de ligue à 36 clubs (8 journées) → barrages → finale, tours en **aller-retour** sauf la finale | écussons de clubs | 8 / 4 |
| *(pronos limités aux clubs français tant qu'il en reste — voir ci-dessous)* | | | |
| `WC-2026` — Coupe du Monde 2026 *(archivée)* | Poules A→L → 16èmes → finale, matchs secs | drapeaux de nations | 4 / 2 |

Les particularités du format sont prises en compte de bout en bout :

- **Phase de ligue** — un seul classement de 36 clubs, avec les barres de qualification (1-8 qualifiés, 9-24 barrages, 25-36 éliminés).
- **Aller-retour** — les deux manches sont pronostiquées séparément ; le tableau final affiche le **score cumulé**, qui qualifie. Sur une manche, un nul est un résultat normal : on ne demande le vainqueur aux tirs au but **qu'en finale** (match sec).
- **Journées** — la clé d'une journée combine l'étape et le numéro, car en C1 les manches aller/retour portent `matchday` 1 et 2, qui collisionneraient avec les journées 1 et 2 de la phase de ligue.
- **Cotes** — l'appariement avec The Odds API se fait par code drapeau pour les sélections, et par **clé canonique de nom de club** sinon (« FC Bayern München » ↔ « Bayern Munich », cf. `lib/teams.ts`).

### Périmètre de pari

Une phase de ligue de C1, c'est **144 matchs** : injouable pour une bande de potes. Tant qu'un club d'un pays « suivi » (`Season.focusCountries`, réglé à `FRA` + `MCO` — l'AS Monaco est un club de Ligue 1 que football-data classe sous la principauté) est en lice, **seuls ses matchs sont pronosticables**. Dès qu'ils sont tous éliminés, tout s'ouvre — il reste alors peu d'affiches.

Sur l'édition 2025/26 (Marseille, PSG, Monaco), ça donne **33 matchs pronosticables sur 189** : 24 en phase de ligue (3 clubs × 8 journées) puis 2 par tour.

La règle exacte (`lib/betting.ts`) : un match est pronosticable s'il implique un club suivi, **ou** si son coup d'envoi est postérieur au dernier match connu d'un club suivi. Cette formulation est stable dans le temps — un simple « reste-t-il un club français ? » basculerait d'un coup et rendrait rétroactivement pronosticables des matchs déjà joués, ce qui fausserait les badges de journée.

Le verrou est côté serveur (`POST /api/predictions`), l'onglet **Matchs** ne liste que les affiches ouvertes (avec un bandeau expliquant combien sont masquées), et le badge « L'Assidu » ne compte que les matchs pronosticables d'une journée. Liste vide = aucune restriction (cas de la Coupe du Monde).

### Basculer de saison

En CLI :

```bash
npm run season:switch                 # archive la saison active → ouvre CL-2026-2027
npm run season:switch -- WC-2026      # cible explicite
npm run season:switch -- --clone-groups   # reprend les groupes de la saison passée
```

…ou depuis la console admin, panneau **🗓️ Saisons** (« Archiver la saison », puis « Ouvrir et remettre à zéro »).

La bascule enchaîne : palmarès figé + 👑 Daronissime décerné → nouvelle saison active → points, badges et paris champion remis à zéro. Les matchs et pronos des saisons passées ne sont jamais touchés.

La nouvelle saison démarre **sans groupe** : chacun recrée sa bande depuis l'onglet Groupes (l'occasion de rebattre les cartes). `--clone-groups` — ou la case correspondante dans la console admin — reprend au contraire les groupes et leurs membres de la saison passée, avec un tchat vierge et de **nouveaux liens d'invitation**.

> ℹ️ Entre deux saisons, l'API ne publie pas encore le calendrier (la phase de ligue de C1 est tirée au sort fin août). La synchro l'annonce calmement (`calendrier CL 2026 pas encore publié`) et retentera à chaque cycle — rien à faire.

## 🧮 Le barème (façon MPP, indexé sur les cotes)

Les points d'un **bon résultat** suivent la difficulté du match : **`R`** vaut de **1 pt** (grand favori) à **6 pts** (gros exploit) selon la cote 1X2 figée avant le coup d'envoi. Plus l'issue est improbable, plus elle rapporte — l'audace paie.

| Résultat | Points |
|---|:---:|
| 🎯 **Score exact** | **R × 2** |
| ⚽ Bon vainqueur **+** bonne différence de buts (hors nul) | **R + 1** |
| ✅ Bon sens du résultat (bon vainqueur ou bon nul) | **R** |
| ❌ Mauvais pronostic | **0 pt** |
| 🃏 Joker activé | **× 2** |

> 🤓 *Subtilité sur les nuls : un nul a toujours une différence de buts nulle, donc le bonus « bonne diff » ne s'applique pas aux nuls — un nul bien vu mais au mauvais score vaut R (R × 2 si exact).*
>
> *Cotes via [The Odds API](https://the-odds-api.com) (palier gratuit), capturées ~toutes les 6 h jusqu'au coup d'envoi puis figées (closing odds), identiques pour tous. Match sans cote → repli sur le barème classique 3 / 2 / 1.*

## 🎖️ Les badges

| Badge | Comment l'obtenir |
|---|---|
| 👣 Premier pas | Ton tout premier pronostic |
| 🔮 Nostradamus | 3 scores exacts consécutifs |
| 🔥 En feu | 5 bons résultats d'affilée |
| 💎 Le Perfectionniste | Un score exact avec le joker |
| 📅 L'Assidu | Tous les matchs d'une journée pronostiqués |
| 💀 Même pas mal | 0 pt sur une journée complète |
| 🎯 Sniper | 10 scores exacts au total |
| 🎖️ Cinquantenaire | 50 points au total |
| 💯 Centurion | 100 points au total |
| 👑 Le Daronissime | 1ʳᵉ place de son groupe en fin de tournoi |

## 🛠️ Stack technique

- **[Next.js 15](https://nextjs.org/)** (App Router, React 19, Server Components)
- **[TypeScript](https://www.typescriptlang.org/)** strict
- **[Prisma 6](https://www.prisma.io/)** + **PostgreSQL**
- **[NextAuth v5](https://authjs.dev/)** — Google OAuth + email/mot de passe
- **[Tailwind CSS 4](https://tailwindcss.com/)** — design system maison, dark mode
- **[web-push](https://github.com/web-push-libs/web-push)** — notifications PWA (VAPID)
- **[football-data.org](https://www.football-data.org/)** — source des matchs & scores (palier gratuit)
- **[The Odds API](https://the-odds-api.com/)** — cotes 1X2 pour le barème « façon MPP » (palier gratuit)
- **[Vitest](https://vitest.dev/)** — tests unitaires du barème

## 🚀 Démarrage

```bash
# 1. Installer
npm install

# 2. Configurer l'environnement
cp .env.example .env.local   # puis remplis les variables (voir ci-dessous)

# 3. Préparer la base
npm run db:push              # applique le schéma Prisma
npm run db:seed              # (optionnel) catalogue de badges

# 4. Lancer en dev
npm run dev                  # http://localhost:3000
```

### Variables d'environnement clés

| Variable | Rôle |
|---|---|
| `AUTH_SECRET` | Secret NextAuth (`npx auth secret`) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Connexion Google |
| `DATABASE_URL` / `DIRECT_URL` | Postgres |
| `FOOTBALL_DATA_TOKEN` | Token [football-data.org](https://www.football-data.org/client/register) (gratuit) |
| `FOOTBALL_DATA_COMPETITION` | Repli seulement — la compétition vient de la saison active (`Season.competition`) |
| `ODDS_API_KEY` | Clé [The Odds API](https://the-odds-api.com) (gratuit) pour le barème aux cotes — sans elle, repli barème classique |
| `ODDS_API_SPORT` / `ODDS_API_REGION` | Sport (repli ; sinon `Season.oddsSport`) et région bookmakers (défaut `eu`) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Compte admin créé au démarrage |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Push (`npx web-push generate-vapid-keys`) |
| `SYNC_LIVE_SECONDS` / `SYNC_IDLE_MINUTES` | Rythme de sync (défaut 90 s / 30 min) |

## 📜 Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de dev |
| `npm run build` | Build de prod (Prisma generate + Next build) |
| `npm run db:push` | Applique le schéma Prisma |
| `npm run db:seed` | Seed du catalogue de badges |
| `npm run db:studio` | Prisma Studio |
| `npm run sync` | Sync manuelle des matchs |
| `npm run rescore` | Recalcule les points de la saison en cours (après changement de barème) |
| `npm run season:switch` | Archive la saison active et ouvre la suivante |
| `npm run flags` | Pré-télécharge les drapeaux dans `public/flags/` |
| `npm test` | Lance les tests unitaires (Vitest) |

## ⚙️ Sous le capot

- **Synchronisation adaptative** — un hook d'instrumentation Next.js synchronise les scores en boucle : **rapide** (90 s) quand un match est en cours ou imminent, **lent** (30 min) sinon. Sous la limite de 10 req/min de l'API, sans plafond journalier.
- **Calcul des points centralisé** — une seule fonction `computePoints`, pure et testable, alimente le scoring, le recalcul, le live et les comparaisons. Les badges sont **réconciliés** à chaque recalcul (attribués *et* retirés s'ils ne sont plus mérités).
- **Emblèmes fiables** — drapeaux de nations (flagcdn) ou écussons de clubs (crests.football-data.org), rendus en image avec auto-retry et cache service-worker, pour ne jamais afficher un emblème manquant sur iOS. `Match.homeFlag` porte l'un ou l'autre (code ou URL), `<Flag>` distingue les deux.
- **Édition épinglée** — la synchro passe `?season=YYYY` : sans ça, football-data renvoie sa « currentSeason », qui entre deux éditions est encore la précédente — on importerait l'ancien calendrier dans la nouvelle saison.

## 📦 Déploiement

CI/CD GitHub Actions → **GHCR** (deux images : `:latest` pour l'app, `:migrate` pour `prisma db push`) → **Portainer**.

- L'image `migrate` applique le schéma avant le déploiement de l'app.
- Au démarrage, l'app initialise le catalogue de badges, le compte admin et le bot système — puis lance la boucle de sync.

---

<div align="center">

*Fait avec ⚽, 🍺 et beaucoup de mauvaise foi entre potes.*

</div>
