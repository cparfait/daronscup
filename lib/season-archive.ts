// ─────────────────────────────────────────────
// Cycle de vie d'une saison : clôture (archivage) et ouverture.
//
// Les matchs, résultats et pronostics restent en base, rattachés à leur saison :
// une compétition archivée reste donc entièrement consultable. En revanche les
// AGRÉGATS de jeu — `Score`, `UserBadge`, `ChampionPick` — sont un cache de la
// saison en cours : on les FIGE dans `SeasonArchive` (palmarès) avant de les
// remettre à zéro pour la saison suivante.
// ─────────────────────────────────────────────

import { prisma } from "./prisma";
import { compareRanked } from "./ranking";
import { getActiveSeason, type Season } from "./season";
import { cloneGroupsToSeason } from "./groups";

/** Palmarès figé d'un joueur dans un groupe. */
export type ArchivedPlayer = {
  rank: number;
  userId: string;
  name: string;
  points: number;
  exactScores: number;
  correctResults: number;
  badges: string[];
  champion: { team: string; flag: string } | null;
};

/** Palmarès figé d'un groupe d'amis. */
export type ArchivedGroup = {
  groupId: string;
  name: string;
  players: ArchivedPlayer[];
};

/** Contenu de `SeasonArchive.data`. */
export type SeasonPalmares = {
  /** Vainqueur de la compétition (l'équipe), si connu. */
  winner: { team: string; flag: string } | null;
  /** Classement final par groupe d'amis. */
  groups: ArchivedGroup[];
  /** Compteurs de la saison. */
  totals: { matches: number; predictions: number; players: number };
  closedAt: string;
};

/**
 * Vainqueur de la compétition : override admin (finale aux tirs au but) sinon
 * déduit du score de la finale. Null si la finale n'a pas été jouée.
 */
async function seasonWinner(
  seasonId: string
): Promise<{ team: string; flag: string } | null> {
  const override = await prisma.championOverride.findFirst({
    where: { seasonId },
    select: { team: true, flag: true },
  });
  if (override) return override;

  const final = await prisma.match.findFirst({
    where: { seasonId, stage: "FINAL" },
    include: { result: true },
  });
  if (!final?.result || final.result.status !== "FINISHED") return null;
  const r = final.result;
  if (r.homeScore === r.awayScore) {
    // Finale aux tirs au but : le vainqueur ne se déduit pas du score.
    if (r.penaltyWinner === "home") return { team: final.homeTeam, flag: final.homeFlag };
    if (r.penaltyWinner === "away") return { team: final.awayTeam, flag: final.awayFlag };
    return null;
  }
  return r.homeScore > r.awayScore
    ? { team: final.homeTeam, flag: final.homeFlag }
    : { team: final.awayTeam, flag: final.awayFlag };
}

/**
 * Construit le palmarès d'une saison à partir de l'état COURANT des agrégats.
 * À appeler avant toute remise à zéro.
 */
export async function buildPalmares(seasonId: string): Promise<SeasonPalmares> {
  const [groups, winner, matches, predictions] = await Promise.all([
    prisma.group.findMany({
      where: { seasonId },
      orderBy: { createdAt: "asc" },
      include: {
        members: {
          where: { user: { banned: false } },
          include: {
            user: {
              include: {
                score: true,
                badges: { include: { badge: { select: { key: true } } } },
                championPick: { select: { team: true, flag: true } },
              },
            },
          },
        },
      },
    }),
    seasonWinner(seasonId),
    prisma.match.count({ where: { seasonId } }),
    prisma.prediction.count({ where: { match: { seasonId } } }),
  ]);

  const players = new Set<string>();
  const archivedGroups: ArchivedGroup[] = groups.map((g) => {
    const ranked = g.members
      .map((m) => ({
        userId: m.userId,
        name: m.user.name ?? "Anonyme",
        points: m.user.score?.points ?? 0,
        exactScores: m.user.score?.exactScores ?? 0,
        correctResults: m.user.score?.correctResults ?? 0,
        badges: m.user.badges.map((b) => b.badge.key),
        champion: m.user.championPick ?? null,
      }))
      .sort(compareRanked)
      .map((p, i) => ({ rank: i + 1, ...p }));

    for (const p of ranked) players.add(p.userId);
    return { groupId: g.id, name: g.name, players: ranked };
  });

  return {
    winner,
    groups: archivedGroups,
    totals: { matches, predictions, players: players.size },
    closedAt: new Date().toISOString(),
  };
}

/**
 * Clôture une saison : fige son palmarès, décerne le badge « Daronissime » 👑
 * au premier de chaque groupe, puis marque la saison comme terminée.
 *
 * NE remet RIEN à zéro : la remise à zéro a lieu à l'ouverture de la saison
 * suivante (cf. `openSeason`), pour que la clôture reste consultable telle
 * quelle si l'admin veut la vérifier avant de basculer.
 * Idempotent : re-clôturer met simplement le palmarès à jour.
 */
export async function closeSeason(
  seasonId: string
): Promise<{ palmares: SeasonPalmares; champions: number }> {
  // Badge « Daronissime » au vainqueur de chaque groupe (avant de figer, pour
  // que le palmarès le contienne).
  const champions = await awardGroupWinners(seasonId);

  const palmares = await buildPalmares(seasonId);

  await prisma.seasonArchive.upsert({
    where: { seasonId },
    update: { data: palmares },
    create: { seasonId, data: palmares },
  });
  await prisma.season.update({
    where: { id: seasonId },
    data: { closedAt: new Date() },
  });

  return { palmares, champions };
}

/**
 * Décerne le badge « daronissime » au joueur en tête du classement de chaque
 * groupe de la saison (un vainqueur par groupe, pas de vainqueur global).
 * Renvoie le nombre de joueurs primés. Idempotent (upsert).
 */
export async function awardGroupWinners(seasonId: string): Promise<number> {
  const badge = await prisma.badge.findUnique({ where: { key: "daronissime" } });
  if (!badge) return 0;

  const groups = await prisma.group.findMany({
    where: { seasonId },
    include: {
      members: {
        where: { user: { banned: false } },
        include: { user: { include: { score: true } } },
      },
    },
  });

  const winners = new Set<string>();
  for (const g of groups) {
    const ranked = g.members
      .map((m) => ({
        userId: m.userId,
        name: m.user.name ?? "Anonyme",
        points: m.user.score?.points ?? 0,
        exactScores: m.user.score?.exactScores ?? 0,
        correctResults: m.user.score?.correctResults ?? 0,
      }))
      .sort(compareRanked);
    const top = ranked[0];
    if (!top || top.points === 0) continue;
    winners.add(top.userId);
  }

  await Promise.all(
    [...winners].map((userId) =>
      prisma.userBadge.upsert({
        where: { userId_badgeId: { userId, badgeId: badge.id } },
        update: {},
        create: { userId, badgeId: badge.id },
      })
    )
  );

  return winners.size;
}

/**
 * Ouvre une saison : la rend active (et désactive les autres), puis remet à
 * zéro les agrégats de jeu — points, badges, pari champion — pour que tout le
 * monde reparte de zéro. Les matchs et pronos des saisons précédentes ne sont
 * PAS touchés.
 *
 * `cloneGroupsFrom` recopie les groupes (et leurs membres) d'une saison
 * précédente, pour éviter à la bande de se reformer à la main.
 */
export async function openSeason(
  seasonId: string,
  opts: { cloneGroupsFrom?: string | null; resetAggregates?: boolean } = {}
): Promise<{ groups: number; members: number }> {
  const { cloneGroupsFrom = null, resetAggregates = true } = opts;

  // Garde-fou : ne jamais ouvrir une saison sans avoir figé la précédente,
  // sinon la remise à zéro effacerait un palmarès non archivé.
  const previous = await getActiveSeason();
  if (previous && previous.id !== seasonId && !previous.closedAt) {
    const archived = await prisma.seasonArchive.findUnique({
      where: { seasonId: previous.id },
    });
    if (!archived) {
      throw new Error(
        `La saison « ${previous.name} » n'est pas clôturée : archive-la d'abord.`
      );
    }
  }

  await prisma.$transaction([
    prisma.season.updateMany({
      where: { active: true, NOT: { id: seasonId } },
      data: { active: false },
    }),
    prisma.season.update({
      where: { id: seasonId },
      data: { active: true, closedAt: null },
    }),
  ]);

  if (resetAggregates) {
    await prisma.$transaction([
      // Points, badges et pari champion : figés dans l'archive, on repart à zéro.
      prisma.score.updateMany({
        data: { points: 0, exactScores: 0, correctResults: 0, previousRank: null },
      }),
      prisma.userBadge.deleteMany(),
      prisma.championPick.deleteMany(),
    ]);
  }

  if (cloneGroupsFrom && cloneGroupsFrom !== seasonId) {
    return cloneGroupsToSeason(cloneGroupsFrom, seasonId);
  }
  return { groups: 0, members: 0 };
}

/**
 * Ids des joueurs ayant gagné (au moins) un groupe lors de la DERNIÈRE saison
 * archivée. Sert à afficher la couronne du tenant du titre 👑 pendant toute la
 * saison suivante. Ensemble vide s'il n'y a pas encore d'archive.
 */
export async function getDefendingChampions(): Promise<Set<string>> {
  try {
    const last = await prisma.season.findFirst({
      where: { closedAt: { not: null }, archive: { isNot: null } },
      orderBy: { closedAt: "desc" },
      select: { archive: { select: { data: true } } },
    });
    const palmares = last?.archive?.data as SeasonPalmares | undefined;
    if (!palmares) return new Set();
    const ids = new Set<string>();
    for (const g of palmares.groups) {
      const top = g.players[0];
      // Un « vainqueur » à 0 point n'en est pas un (groupe inactif).
      if (top && top.points > 0) ids.add(top.userId);
    }
    return ids;
  } catch {
    return new Set();
  }
}

/** Palmarès archivé d'une saison, ou null s'il n'a pas encore été figé. */
export async function getPalmares(
  seasonId: string
): Promise<SeasonPalmares | null> {
  try {
    const row = await prisma.seasonArchive.findUnique({ where: { seasonId } });
    return (row?.data as SeasonPalmares | undefined) ?? null;
  } catch {
    return null;
  }
}

/** Saison + palmarès, pour les pages d'archive. */
export type ArchivedSeason = { season: Season; palmares: SeasonPalmares | null };
