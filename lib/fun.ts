// ─────────────────────────────────────────────
// « Fun stats » — les chiffres qui font parler dans le groupe.
//
// Tout est DÉRIVÉ des pronostics et des résultats existants : aucune table
// supplémentaire. Chaque getter renvoie null / [] plutôt que de planter, comme
// le reste de lib/data.
//
// Contenu :
//   • série en cours (🔥×N) et retard de soumission, par joueur ;
//   • duels de journée entre membres d'un groupe ;
//   • « ce que tu aurais gagné » en recopiant un autre joueur ;
//   • « ton miroir » (le joueur qui prono comme toi) et « ta bête noire » ;
//   • le musée des horreurs (pires pronos, toutes saisons confondues).
// ─────────────────────────────────────────────

import { prisma } from "./prisma";
import { computePoints } from "./scoring";
import { matchdayKey, matchdayLabel } from "./matchday";
import { getViewingSeason } from "./season";
import type { Stage } from "./data/matches";

/** Prono + match, forme minimale utilisée par tous les calculs ci-dessous. */
type ScoredPrediction = {
  userId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  joker: boolean;
  submittedAt: Date;
  match: {
    kickoffAt: Date;
    stage: Stage;
    matchday: number | null;
    homeTeam: string;
    awayTeam: string;
    homeFlag: string;
    awayFlag: string;
    oddsHome: number | null;
    oddsDraw: number | null;
    oddsAway: number | null;
    result: { homeScore: number; awayScore: number; status: string } | null;
  };
};

const PRED_INCLUDE = {
  match: {
    include: { result: true },
  },
} as const;

/** Points d'un prono sur un match terminé (0 si le match n'est pas joué). */
function pointsOf(p: ScoredPrediction): number {
  const r = p.match.result;
  if (!r || r.status !== "FINISHED") return 0;
  return computePoints(
    { homeScore: p.homeScore, awayScore: p.awayScore },
    { homeScore: r.homeScore, awayScore: r.awayScore },
    p.joker,
    { home: p.match.oddsHome, draw: p.match.oddsDraw, away: p.match.oddsAway }
  ).points;
}

function isFinished(p: ScoredPrediction): boolean {
  return p.match.result?.status === "FINISHED";
}

/** Charge tous les pronos d'une saison (avec match + résultat). */
async function loadSeasonPredictions(
  seasonId: string,
  userIds?: string[]
): Promise<ScoredPrediction[]> {
  return (await prisma.prediction.findMany({
    where: {
      match: { seasonId },
      ...(userIds ? { userId: { in: userIds } } : {}),
    },
    include: PRED_INCLUDE,
    orderBy: { match: { kickoffAt: "asc" } },
  })) as unknown as ScoredPrediction[];
}

// ─────────────────────────────────────────────
// Série en cours + retard de soumission
// ─────────────────────────────────────────────

export type PlayerFlair = {
  /** Nombre de bons résultats consécutifs en cours (0 si la série est cassée). */
  streak: number;
  /** Délai médian entre la soumission et le coup d'envoi, en minutes. */
  medianLeadMinutes: number | null;
};

/**
 * Série en cours et ponctualité de chaque joueur, sur la saison active.
 * La série se lit sur les pronos terminés, du plus ancien au plus récent : elle
 * repart à zéro dès qu'un prono ne rapporte rien.
 */
export async function getPlayersFlair(
  memberIds: string[]
): Promise<Map<string, PlayerFlair>> {
  const out = new Map<string, PlayerFlair>();
  try {
    const season = await getViewingSeason();
    if (!season || memberIds.length === 0) return out;
    const preds = await loadSeasonPredictions(season.id, memberIds);

    const byUser = new Map<string, ScoredPrediction[]>();
    for (const p of preds) {
      const list = byUser.get(p.userId);
      if (list) list.push(p);
      else byUser.set(p.userId, [p]);
    }

    for (const [userId, list] of byUser) {
      let streak = 0;
      for (const p of list) {
        if (!isFinished(p)) continue;
        streak = pointsOf(p) > 0 ? streak + 1 : 0;
      }

      // Ponctualité : on prend la MÉDIANE, robuste face au prono posé un mois
      // à l'avance qui écraserait une moyenne.
      const leads = list
        .map((p) => (+p.match.kickoffAt - +p.submittedAt) / 60_000)
        .filter((m) => m >= 0)
        .sort((a, b) => a - b);
      const medianLeadMinutes =
        leads.length > 0 ? Math.round(leads[Math.floor(leads.length / 2)]!) : null;

      out.set(userId, { streak, medianLeadMinutes });
    }
    return out;
  } catch {
    return out;
  }
}

// ─────────────────────────────────────────────
// Duels de journée
// ─────────────────────────────────────────────

export type MatchdayScore = {
  key: string;
  label: string;
  /** Points par joueur sur cette journée. */
  points: Map<string, number>;
};

/**
 * Points de chaque membre, journée par journée (étape + numéro, cf.
 * lib/matchday.ts). Ne retient que les journées dont au moins un match est
 * terminé. Ordonné chronologiquement.
 */
export async function getMatchdayScores(
  memberIds: string[],
  twoLegged = false
): Promise<MatchdayScore[]> {
  try {
    const season = await getViewingSeason();
    if (!season || memberIds.length === 0) return [];
    const preds = await loadSeasonPredictions(season.id, memberIds);

    const days = new Map<
      string,
      { label: string; first: number; points: Map<string, number> }
    >();
    for (const p of preds) {
      if (!isFinished(p)) continue;
      const key = matchdayKey(p.match.stage, p.match.matchday);
      const day =
        days.get(key) ??
        days
          .set(key, {
            label: matchdayLabel(p.match.stage, p.match.matchday, twoLegged),
            first: +p.match.kickoffAt,
            points: new Map<string, number>(),
          })
          .get(key)!;
      day.first = Math.min(day.first, +p.match.kickoffAt);
      day.points.set(p.userId, (day.points.get(p.userId) ?? 0) + pointsOf(p));
    }

    return [...days.entries()]
      .sort((a, b) => a[1].first - b[1].first)
      .map(([key, d]) => ({ key, label: d.label, points: d.points }));
  } catch {
    return [];
  }
}

export type Duel = {
  /** Journée concernée. */
  label: string;
  opponent: { userId: string; name: string };
  mine: number;
  theirs: number;
  outcome: "win" | "loss" | "draw";
};

export type DuelRecord = {
  /** Bilan cumulé face à chaque adversaire, du plus fréquent au moins. */
  opponents: {
    userId: string;
    name: string;
    wins: number;
    losses: number;
    draws: number;
  }[];
  /** Les duels les plus récents (5 max), pour l'affichage. */
  recent: Duel[];
};

/**
 * Duels de journée d'un joueur : à chaque journée, il est opposé à UN autre
 * membre, choisi de façon déterministe (rotation sur la liste des membres
 * triée). Pas de tirage aléatoire : le résultat doit être stable d'un
 * rafraîchissement à l'autre, et identique pour les deux adversaires.
 */
export async function getDuels(
  userId: string,
  members: { userId: string; name: string }[],
  twoLegged = false
): Promise<DuelRecord> {
  const empty: DuelRecord = { opponents: [], recent: [] };
  try {
    if (members.length < 2) return empty;
    const ordered = [...members].sort((a, b) => a.userId.localeCompare(b.userId));
    const myIndex = ordered.findIndex((m) => m.userId === userId);
    if (myIndex < 0) return empty;

    const days = await getMatchdayScores(
      ordered.map((m) => m.userId),
      twoLegged
    );
    const n = ordered.length;

    const tally = new Map<
      string,
      { name: string; wins: number; losses: number; draws: number }
    >();
    const duels: Duel[] = [];

    days.forEach((day, dayIdx) => {
      // Rotation : à la journée k, on affronte le membre situé k+1 crans plus
      // loin dans la liste. Symétrique et sans auto-affrontement.
      const offset = (dayIdx % (n - 1)) + 1;
      const opponent = ordered[(myIndex + offset) % n]!;
      if (opponent.userId === userId) return;

      const mine = day.points.get(userId) ?? 0;
      const theirs = day.points.get(opponent.userId) ?? 0;
      const outcome = mine > theirs ? "win" : mine < theirs ? "loss" : "draw";

      const t =
        tally.get(opponent.userId) ??
        tally
          .set(opponent.userId, {
            name: opponent.name,
            wins: 0,
            losses: 0,
            draws: 0,
          })
          .get(opponent.userId)!;
      if (outcome === "win") t.wins++;
      else if (outcome === "loss") t.losses++;
      else t.draws++;

      duels.push({
        label: day.label,
        opponent: { userId: opponent.userId, name: opponent.name },
        mine,
        theirs,
        outcome,
      });
    });

    return {
      opponents: [...tally.entries()]
        .map(([id, t]) => ({ userId: id, ...t }))
        .sort(
          (a, b) =>
            b.wins + b.losses + b.draws - (a.wins + a.losses + a.draws) ||
            b.wins - a.wins
        ),
      recent: duels.slice(-5).reverse(),
    };
  } catch {
    return empty;
  }
}

// ─────────────────────────────────────────────
// Miroir, bête noire, « ce que tu aurais gagné »
// ─────────────────────────────────────────────

export type Rivalry = {
  /** Le joueur dont les pronos ressemblent le plus aux miens. */
  mirror: { userId: string; name: string; sameRate: number; common: number } | null;
  /**
   * Le joueur qu'il aurait fallu recopier : celui dont les pronos, appliqués à
   * MES matchs pronostiqués, rapportent le plus de points de plus que moi.
   */
  shouldHaveCopied: {
    userId: string;
    name: string;
    theirPoints: number;
    myPoints: number;
    delta: number;
  } | null;
  /** Le joueur qui m'a le plus souvent battu sur une journée. */
  nemesis: { userId: string; name: string; lostTo: number; beat: number } | null;
};

/**
 * Rivalités d'un joueur au sein de son groupe. Tout se calcule sur les matchs
 * que LES DEUX ont pronostiqués (sinon la comparaison n'a pas de sens).
 */
export async function getRivalry(
  userId: string,
  members: { userId: string; name: string }[],
  twoLegged = false
): Promise<Rivalry> {
  const empty: Rivalry = { mirror: null, shouldHaveCopied: null, nemesis: null };
  try {
    const season = await getViewingSeason();
    if (!season || members.length < 2) return empty;

    const nameOf = new Map(members.map((m) => [m.userId, m.name]));
    const preds = await loadSeasonPredictions(
      season.id,
      members.map((m) => m.userId)
    );

    // Index : match → (joueur → prono)
    const byMatch = new Map<string, Map<string, ScoredPrediction>>();
    for (const p of preds) {
      const m = byMatch.get(p.matchId) ?? new Map<string, ScoredPrediction>();
      m.set(p.userId, p);
      byMatch.set(p.matchId, m);
    }

    let mirror: Rivalry["mirror"] = null;
    let copied: Rivalry["shouldHaveCopied"] = null;

    for (const other of members) {
      if (other.userId === userId) continue;
      let common = 0;
      let identical = 0;
      let myPts = 0;
      let theirPts = 0;

      for (const perMatch of byMatch.values()) {
        const mine = perMatch.get(userId);
        const theirs = perMatch.get(other.userId);
        if (!mine || !theirs) continue;
        common++;
        if (
          mine.homeScore === theirs.homeScore &&
          mine.awayScore === theirs.awayScore
        ) {
          identical++;
        }
        if (isFinished(mine)) {
          myPts += pointsOf(mine);
          theirPts += pointsOf(theirs);
        }
      }

      if (common >= 3) {
        const sameRate = identical / common;
        if (!mirror || sameRate > mirror.sameRate) {
          mirror = { userId: other.userId, name: other.name, sameRate, common };
        }
        const delta = theirPts - myPts;
        if (delta > 0 && (!copied || delta > copied.delta)) {
          copied = {
            userId: other.userId,
            name: other.name,
            theirPoints: theirPts,
            myPoints: myPts,
            delta,
          };
        }
      }
    }

    // Bête noire : celui qui m'a battu le plus souvent sur une journée.
    const days = await getMatchdayScores(
      members.map((m) => m.userId),
      twoLegged
    );
    let nemesis: Rivalry["nemesis"] = null;
    const duelTally = new Map<string, { lostTo: number; beat: number }>();
    for (const day of days) {
      const mine = day.points.get(userId);
      if (mine === undefined) continue;
      for (const [otherId, theirs] of day.points) {
        if (otherId === userId) continue;
        const t = duelTally.get(otherId) ?? { lostTo: 0, beat: 0 };
        if (theirs > mine) t.lostTo++;
        else if (theirs < mine) t.beat++;
        duelTally.set(otherId, t);
      }
    }
    for (const [otherId, t] of duelTally) {
      if (t.lostTo === 0) continue;
      if (!nemesis || t.lostTo > nemesis.lostTo) {
        nemesis = {
          userId: otherId,
          name: nameOf.get(otherId) ?? "Anonyme",
          lostTo: t.lostTo,
          beat: t.beat,
        };
      }
    }

    return { mirror, shouldHaveCopied: copied, nemesis };
  } catch {
    return empty;
  }
}

// ─────────────────────────────────────────────
// Le musée des horreurs
// ─────────────────────────────────────────────

export type HorrorEntry = {
  matchId: string;
  seasonName: string;
  player: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  predHome: number;
  predAway: number;
  resHome: number;
  resAway: number;
  /** Écart total entre le prono et le résultat (buts). */
  gap: number;
  joker: boolean;
};

/**
 * Les pires pronostics de l'histoire du groupe, TOUTES SAISONS confondues :
 * bon zéro pointé, et l'écart de buts le plus large. Un patrimoine que la
 * remise à zéro de chaque saison n'effacera pas.
 */
export async function getHorrorMuseum(
  memberIds: string[],
  limit = 10
): Promise<HorrorEntry[]> {
  try {
    if (memberIds.length === 0) return [];
    const preds = await prisma.prediction.findMany({
      where: {
        userId: { in: memberIds },
        match: { result: { status: "FINISHED" } },
      },
      include: {
        user: { select: { name: true } },
        match: { include: { result: true, season: { select: { name: true } } } },
      },
    });

    return preds
      .map((p) => {
        const r = p.match.result!;
        const gap =
          Math.abs(p.homeScore - r.homeScore) + Math.abs(p.awayScore - r.awayScore);
        return {
          matchId: p.matchId,
          seasonName: p.match.season?.name ?? "—",
          player: p.user.name ?? "Anonyme",
          homeTeam: p.match.homeTeam,
          awayTeam: p.match.awayTeam,
          homeFlag: p.match.homeFlag,
          awayFlag: p.match.awayFlag,
          predHome: p.homeScore,
          predAway: p.awayScore,
          resHome: r.homeScore,
          resAway: r.awayScore,
          gap,
          joker: p.joker,
        };
      })
      // Les jokers grillés d'abord à écart égal : c'est plus douloureux.
      .sort((a, b) => b.gap - a.gap || Number(b.joker) - Number(a.joker))
      .slice(0, limit);
  } catch {
    return [];
  }
}
