// ─────────────────────────────────────────────
// Jeu de test injectable / purgeable (console admin).
//
// Principe de sûreté : TOUT est rangé dans une SAISON DÉDIÉE (`TEST-DATA`) et
// les joueurs fictifs portent un domaine d'e-mail réservé. La purge ne cible
// que ces deux choses — les données réelles (Coupe du Monde archivée, saison en
// cours) ne sont jamais référencées, donc jamais menacées.
//
// Contenu du jeu : 12 clubs avec de vrais écussons, 3 journées de phase de
// ligue (2 jouées, 1 à venir), des barrages en aller-retour, une finale, des
// cotes, 4 joueurs fictifs aux profils contrastés, un groupe, des pronostics,
// des réactions et un enjeu de saison. De quoi éprouver classement, duels,
// récaps, périmètre de pari, tableau final et musée des horreurs.
// ─────────────────────────────────────────────

import { prisma } from "./prisma";
import { newGroupToken } from "./groups";
import type { Stage } from "./data/matches";

/** Code de la saison de test — la clé de voûte de l'isolation. */
export const TEST_SEASON_CODE = "TEST-DATA";
/** Domaine réservé aux joueurs fictifs. */
export const TEST_EMAIL_DOMAIN = "@test.daronsfc.local";
const TEST_GROUP_NAME = "Les Darons (test)";

/** Écusson football-data d'un club, par son id. */
const crest = (id: number) => `https://crests.football-data.org/${id}.png`;

/** Les clubs du jeu de test — vrais noms, vrais écussons, vrais pays. */
const CLUBS = [
  { name: "PSG", id: 524, country: "FRA" },
  { name: "Marseille", id: 516, country: "FRA" },
  { name: "Monaco", id: 548, country: "MCO" },
  { name: "Real Madrid", id: 86, country: "ESP" },
  { name: "Barça", id: 81, country: "ESP" },
  { name: "Bayern", id: 5, country: "DEU" },
  { name: "Dortmund", id: 4, country: "DEU" },
  { name: "Man City", id: 65, country: "ENG" },
  { name: "Arsenal", id: 57, country: "ENG" },
  { name: "Liverpool", id: 64, country: "ENG" },
  { name: "Inter", id: 108, country: "ITA" },
  { name: "Ajax", id: 678, country: "NLD" },
] as const;

type ClubName = (typeof CLUBS)[number]["name"];

const club = (name: ClubName) => CLUBS.find((c) => c.name === name)!;

/** Un match du jeu de test. `score` absent = match à venir. */
type Fixture = {
  home: ClubName;
  away: ClubName;
  stage: Stage;
  matchday: number | null;
  /** Décalage en jours par rapport à maintenant (négatif = passé). */
  days: number;
  score?: [number, number];
  penaltyWinner?: "home" | "away";
  odds: [number, number, number];
};

/**
 * Calendrier du jeu de test. Les journées 1 et 2 sont jouées, la 3 est à venir
 * (pour que « Matchs » ET « Résultats » aient du contenu). Les barrages sont en
 * aller-retour, avec une confrontation tranchée aux tirs au but — de quoi
 * vérifier le score cumulé.
 */
const FIXTURES: Fixture[] = [
  // ── Journée 1 (jouée) ──
  { home: "PSG", away: "Bayern", stage: "LEAGUE", matchday: 1, days: -21, score: [2, 1], odds: [2.4, 3.5, 2.7] },
  { home: "Marseille", away: "Ajax", stage: "LEAGUE", matchday: 1, days: -21, score: [3, 0], odds: [1.7, 3.8, 4.5] },
  { home: "Real Madrid", away: "Monaco", stage: "LEAGUE", matchday: 1, days: -21, score: [1, 1], odds: [1.4, 4.8, 7.0] },
  { home: "Arsenal", away: "Inter", stage: "LEAGUE", matchday: 1, days: -20, score: [0, 2], odds: [2.1, 3.4, 3.3] },
  { home: "Dortmund", away: "Barça", stage: "LEAGUE", matchday: 1, days: -20, score: [1, 4], odds: [3.1, 3.7, 2.1] },
  { home: "Liverpool", away: "Man City", stage: "LEAGUE", matchday: 1, days: -20, score: [2, 2], odds: [2.6, 3.4, 2.6] },

  // ── Journée 2 (jouée) ──
  { home: "Bayern", away: "Marseille", stage: "LEAGUE", matchday: 2, days: -14, score: [4, 1], odds: [1.3, 5.5, 8.0] },
  { home: "Monaco", away: "Arsenal", stage: "LEAGUE", matchday: 2, days: -14, score: [0, 0], odds: [3.6, 3.5, 1.9] },
  { home: "Ajax", away: "PSG", stage: "LEAGUE", matchday: 2, days: -14, score: [1, 3], odds: [4.2, 3.9, 1.8] },
  { home: "Barça", away: "Liverpool", stage: "LEAGUE", matchday: 2, days: -13, score: [2, 2], odds: [2.2, 3.6, 3.0] },
  { home: "Man City", away: "Real Madrid", stage: "LEAGUE", matchday: 2, days: -13, score: [3, 1], odds: [2.3, 3.5, 2.9] },
  { home: "Inter", away: "Dortmund", stage: "LEAGUE", matchday: 2, days: -13, score: [1, 0], odds: [2.0, 3.3, 3.7] },

  // ── Barrages, aller-retour (joués) ──
  { home: "Monaco", away: "Inter", stage: "PLAYOFF", matchday: 1, days: -7, score: [1, 2], odds: [3.0, 3.4, 2.2] },
  { home: "Inter", away: "Monaco", stage: "PLAYOFF", matchday: 2, days: -4, score: [1, 2], odds: [1.9, 3.5, 3.9] },
  { home: "Marseille", away: "Ajax", stage: "PLAYOFF", matchday: 1, days: -7, score: [2, 0], odds: [1.8, 3.6, 4.2] },
  // Cumul 2-2 → départagé aux tirs au but sur la manche retour.
  { home: "Ajax", away: "Marseille", stage: "PLAYOFF", matchday: 2, days: -4, score: [2, 0], penaltyWinner: "away", odds: [3.9, 3.6, 1.9] },

  // ── Journée 3 (à venir) ──
  { home: "PSG", away: "Real Madrid", stage: "LEAGUE", matchday: 3, days: 3, odds: [2.5, 3.6, 2.6] },
  { home: "Monaco", away: "Barça", stage: "LEAGUE", matchday: 3, days: 3, odds: [4.0, 3.8, 1.8] },
  { home: "Marseille", away: "Man City", stage: "LEAGUE", matchday: 3, days: 4, odds: [3.4, 3.6, 2.0] },
  { home: "Bayern", away: "Arsenal", stage: "LEAGUE", matchday: 3, days: 4, odds: [2.0, 3.6, 3.5] },

  // ── Finale (à venir, match sec) ──
  { home: "PSG", away: "Bayern", stage: "FINAL", matchday: null, days: 20, odds: [2.5, 3.4, 2.7] },
];

/** Profils des joueurs fictifs — leur façon de se tromper est paramétrée. */
const PLAYERS = [
  { name: "Didier (test)", style: "crack" },
  { name: "Momo (test)", style: "bon" },
  { name: "Jean-Mi (test)", style: "moyen" },
  { name: "Gégé (test)", style: "catastrophe" },
] as const;

type Style = (typeof PLAYERS)[number]["style"];

/**
 * Prono d'un joueur sur un match, selon son style. Déterministe (dépend de
 * l'index du match) pour que deux injections donnent le même classement.
 */
function predict(
  style: Style,
  score: [number, number],
  idx: number
): [number, number] {
  const [h, a] = score;
  switch (style) {
    case "crack":
      // Score exact 2 fois sur 3, sinon bon vainqueur.
      return idx % 3 === 0 ? [h, Math.max(0, a + 1)] : [h, a];
    case "bon":
      // Bon sens du résultat, mauvais score.
      return h > a ? [h + 1, a] : h < a ? [h, a + 1] : [h + 1, a + 1];
    case "moyen":
      // Une fois sur deux à côté de la plaque, jamais au score exact.
      return idx % 2 === 0 ? [a, h] : [h + 1, a];
    case "catastrophe":
      // Toujours très loin — matière première du musée des horreurs.
      return [Math.min(20, a + 4), 0];
  }
}

export type TestDataSummary = {
  seasonCode: string;
  matches: number;
  players: number;
  predictions: number;
  reactions: number;
};

/**
 * Injecte le jeu de test et rend la saison de test ACTIVE, pour que l'app
 * l'affiche immédiatement. Idempotent : une injection sur un jeu déjà présent
 * le purge d'abord, afin de repartir d'un état connu.
 *
 * `adminId` est ajouté au groupe de test (sinon la console admin le verrait en
 * lecture seule et on ne pourrait pas éprouver pronos et réactions).
 */
export async function seedTestData(adminId: string): Promise<TestDataSummary> {
  await purgeTestData();

  const season = await prisma.season.create({
    data: {
      code: TEST_SEASON_CODE,
      name: "Jeu de test (données fictives)",
      shortName: "TEST",
      kind: "CLUBS",
      emoji: "🧪",
      logo: "/seasons/c1.svg",
      // Compétition inexistante côté API : la synchro renverra 404 et
      // n'écrasera donc JAMAIS ces matchs fabriqués (cf. lib/football-data.ts,
      // qui traite le 404 comme « calendrier pas encore publié »).
      competition: "TEST",
      apiSeason: null,
      oddsSport: null,
      focusCountries: ["FRA", "MCO"],
      jokerLeagueBudget: 8,
      jokerKnockoutBudget: 4,
      championBonus: 50,
      stake: "Le dernier paie la tournée 🍻 (données de test)",
      active: false,
    },
  });

  // ── Matchs + résultats ──
  const now = Date.now();
  const matchIds: string[] = [];
  const finished: {
    id: string;
    score: [number, number];
    idx: number;
    penaltyWinner: "home" | "away" | null;
  }[] = [];

  for (let i = 0; i < FIXTURES.length; i++) {
    const f = FIXTURES[i]!;
    const home = club(f.home);
    const away = club(f.away);
    const m = await prisma.match.create({
      data: {
        homeTeam: home.name,
        awayTeam: away.name,
        homeFlag: crest(home.id),
        awayFlag: crest(away.id),
        homeCountry: home.country,
        awayCountry: away.country,
        kickoffAt: new Date(now + f.days * 86_400_000),
        stage: f.stage,
        group: null,
        matchday: f.matchday,
        seasonId: season.id,
        // Pas d'externalId : aucun risque de collision avec un match réel.
        oddsHome: f.odds[0],
        oddsDraw: f.odds[1],
        oddsAway: f.odds[2],
        oddsCapturedAt: new Date(now - 86_400_000),
      },
    });
    matchIds.push(m.id);
    // Le résultat n'est PAS créé ici : on le pose plus bas via
    // `applyMatchResult`, une fois les pronos en place. C'est la transition vers
    // FINISHED qui déclenche les récaps automatiques dans le tchat — les créer à
    // la main priverait le jeu de test de cette partie de l'app.
    if (f.score) {
      finished.push({
        id: m.id,
        score: f.score,
        idx: i,
        penaltyWinner: f.penaltyWinner ?? null,
      });
    }
  }

  // ── Joueurs fictifs ──
  const players: { id: string; style: Style }[] = [];
  for (const p of PLAYERS) {
    const slug = p.name.split(" ")[0]!.toLowerCase().replace(/[^a-z]/g, "");
    const u = await prisma.user.create({
      data: {
        email: `${slug}${TEST_EMAIL_DOMAIN}`,
        name: p.name,
        role: "USER",
        score: { create: {} },
      },
    });
    players.push({ id: u.id, style: p.style });
  }

  // Un club de cœur pour deux d'entre eux.
  await prisma.user.update({
    where: { id: players[0]!.id },
    data: { favoriteTeam: "PSG", favoriteTeamFlag: crest(524) },
  });
  await prisma.user.update({
    where: { id: players[1]!.id },
    data: { favoriteTeam: "Marseille", favoriteTeamFlag: crest(516) },
  });

  // ── Groupe : les 4 fictifs + l'admin qui a cliqué ──
  await prisma.group.create({
    data: {
      name: TEST_GROUP_NAME,
      token: newGroupToken(),
      createdBy: adminId,
      seasonId: season.id,
      members: {
        create: [
          { userId: adminId, role: "OWNER" },
          ...players.map((p) => ({ userId: p.id, role: "MEMBER" as const })),
        ],
      },
    },
  });

  // ── Pronostics ──
  let predictions = 0;
  const jokerAt = new Set([1, 4, 9]); // quelques jokers, dont un grillé
  for (const { id, score, idx } of finished) {
    for (const p of players) {
      const [h, a] = predict(p.style, score, idx);
      await prisma.prediction.create({
        data: {
          userId: p.id,
          matchId: id,
          homeScore: Math.min(20, h),
          awayScore: Math.min(20, a),
          joker: p.style === "catastrophe" ? jokerAt.has(idx) : idx === 2,
          submittedAt: new Date(now - (idx + 2) * 86_400_000),
        },
      });
      predictions++;
    }
  }

  // Paris « vainqueur du tournoi ».
  await prisma.championPick.createMany({
    data: [
      { userId: players[0]!.id, team: "PSG", flag: crest(524) },
      { userId: players[1]!.id, team: "Bayern", flag: crest(5) },
      { userId: players[2]!.id, team: "Real Madrid", flag: crest(86) },
    ],
  });

  // ── Réactions sur quelques pronos (le chambrage) ──
  const worst = await prisma.prediction.findMany({
    where: { match: { seasonId: season.id }, user: { email: { endsWith: TEST_EMAIL_DOMAIN } } },
    orderBy: { submittedAt: "asc" },
    take: 3,
    select: { id: true, userId: true },
  });
  let reactions = 0;
  for (const w of worst) {
    for (const emoji of ["🤡", "💀"]) {
      // Un joueur ne réagit pas à son propre prono.
      const author = players.find((p) => p.id !== w.userId)!;
      await prisma.reaction.create({
        data: { predictionId: w.id, userId: author.id, emoji },
      });
      reactions++;
    }
  }

  // ── Résultats + points : on réutilise le moteur réel, ce qui crédite les
  // points, attribue les badges ET poste les récaps dans le tchat du groupe ──
  const { applyMatchResult } = await import("./football-data");
  for (const { id, score, penaltyWinner } of finished) {
    await applyMatchResult(id, score[0], score[1], { force: true, penaltyWinner });
  }

  // On marque les résultats comme déjà notifiés : inutile d'envoyer des push
  // pour des matchs fictifs.
  await prisma.result.updateMany({
    where: { match: { seasonId: season.id } },
    data: { notified: true },
  });

  // ── Bascule : la saison de test devient active ──
  await prisma.$transaction([
    prisma.season.updateMany({
      where: { active: true },
      data: { active: false },
    }),
    prisma.season.update({ where: { id: season.id }, data: { active: true } }),
  ]);

  return {
    seasonCode: season.code,
    matches: matchIds.length,
    players: players.length,
    predictions,
    reactions,
  };
}

export type PurgeSummary = {
  found: boolean;
  matches: number;
  predictions: number;
  players: number;
  restoredSeason: string | null;
};

/**
 * Purge le jeu de test et réactive la saison réelle.
 *
 * Ne touche QUE la saison `TEST-DATA` et les comptes en `@test.daronsfc.local` :
 * la Coupe du Monde archivée et la saison en cours sont hors de portée, y
 * compris leurs matchs, pronostics, groupes et palmarès.
 *
 * La saison réactivée est la plus récente saison NON clôturée hors jeu de test
 * (donc la compétition en cours) ; à défaut, la plus récente tout court.
 */
export async function purgeTestData(): Promise<PurgeSummary> {
  const season = await prisma.season.findUnique({
    where: { code: TEST_SEASON_CODE },
    select: { id: true, code: true },
  });

  // Garde-fou : on ne purge que la saison de test, jamais autre chose.
  if (season && season.code !== TEST_SEASON_CODE) {
    throw new Error("Refus : la saison ciblée n'est pas le jeu de test.");
  }

  let matches = 0;
  let predictions = 0;

  if (season) {
    // Ordre imposé par les clés étrangères : pronos (→ réactions en cascade),
    // résultats, matchs, groupes (→ membres et messages en cascade), saison.
    const p = await prisma.prediction.deleteMany({
      where: { match: { seasonId: season.id } },
    });
    predictions = p.count;
    await prisma.result.deleteMany({ where: { match: { seasonId: season.id } } });
    const m = await prisma.match.deleteMany({ where: { seasonId: season.id } });
    matches = m.count;
    await prisma.group.deleteMany({ where: { seasonId: season.id } });
    await prisma.championOverride.deleteMany({ where: { seasonId: season.id } });
    await prisma.seasonArchive.deleteMany({ where: { seasonId: season.id } });
    await prisma.season.delete({ where: { id: season.id } });
  }

  // Comptes fictifs : la cascade emporte leurs scores, badges et paris.
  const u = await prisma.user.deleteMany({
    where: { email: { endsWith: TEST_EMAIL_DOMAIN } },
  });

  // ── Retour à la saison réelle ──
  let restoredSeason: string | null = null;
  const real =
    (await prisma.season.findFirst({
      where: { closedAt: null, code: { not: TEST_SEASON_CODE } },
      orderBy: { createdAt: "desc" },
      select: { id: true, code: true },
    })) ??
    (await prisma.season.findFirst({
      where: { code: { not: TEST_SEASON_CODE } },
      orderBy: { createdAt: "desc" },
      select: { id: true, code: true },
    }));

  if (real) {
    await prisma.$transaction([
      prisma.season.updateMany({ where: { active: true }, data: { active: false } }),
      prisma.season.update({ where: { id: real.id }, data: { active: true } }),
    ]);
    restoredSeason = real.code;

    // Les points de l'admin ont été crédités par le jeu de test : on remet les
    // agrégats à zéro puis on recalcule depuis les résultats RÉELS de la saison
    // restaurée (aucun résultat → tout le monde à zéro, ce qui est correct).
    await prisma.$transaction([
      prisma.score.updateMany({
        data: { points: 0, exactScores: 0, correctResults: 0, previousRank: null },
      }),
      prisma.userBadge.deleteMany(),
    ]);
    const { applyMatchResult } = await import("./football-data");
    const results = await prisma.result.findMany({
      where: { status: "FINISHED", match: { seasonId: real.id } },
      select: { matchId: true, homeScore: true, awayScore: true },
    });
    for (const r of results) {
      await applyMatchResult(r.matchId, r.homeScore, r.awayScore, { force: true });
    }
  }

  return {
    found: !!season,
    matches,
    predictions,
    players: u.count,
    restoredSeason,
  };
}

/** État du jeu de test, pour l'affichage dans la console admin. */
export async function getTestDataStatus(): Promise<{
  present: boolean;
  active: boolean;
  matches: number;
  players: number;
}> {
  try {
    const season = await prisma.season.findUnique({
      where: { code: TEST_SEASON_CODE },
      select: { id: true, active: true, _count: { select: { matches: true } } },
    });
    const players = await prisma.user.count({
      where: { email: { endsWith: TEST_EMAIL_DOMAIN } },
    });
    return {
      present: !!season,
      active: season?.active ?? false,
      matches: season?._count.matches ?? 0,
      players,
    };
  } catch {
    return { present: false, active: false, matches: 0, players: 0 };
  }
}
