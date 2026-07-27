// ─────────────────────────────────────────────
// Snapshot des cotes (server-only) — capture les cotes 1X2 sur les matchs à
// venir pour le scoring « façon MPP ».
//
// Séparé de lib/odds.ts (qui reste pur, importable côté client via scoring.ts)
// car ce module touche Prisma.
//
// Cadence : au plus 1 appel toutes les 6 h, et AUCUN appel s'il n'y a aucun
// match à venir. Un seul appel `fetchLiveOdds()` renvoie tous les matchs → coût
// piloté par la fréquence, pas par le nombre de matchs (cf. crédits The Odds API).
// ─────────────────────────────────────────────

import { prisma } from "./prisma";
import { countryCode } from "./flags";
import { clubKey } from "./teams";
import { getActiveSeason, type Season } from "./season";
import { fetchLiveOdds, ODDS_SPORT, type OddsMatch, type Odds1x2 } from "./odds";

const ODDS_INTERVAL_MS = 6 * 60 * 60_000; // 6 h entre deux captures réussies
const ODDS_ERROR_BACKOFF_MS = 15 * 60_000; // retry plus tôt après un échec dur
const SOON_MS = 72 * 60 * 60_000; // fenêtre « match imminent » pour l'alerte

type SnapshotResult = {
  updated: number;
  /** Matchs imminents non appariés (probable nom d'équipe non mappé). */
  unmatchedSoon: string[];
};

// `nextOddsFetchAt` = prochain instant autorisé. Armé seulement sur SUCCÈS (6 h)
// ou avec un backoff court sur échec → un souci API ne gèle plus 6 h.
let nextOddsFetchAt = 0;
let oddsInFlight: Promise<SnapshotResult> | null = null;

type MatchRow = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  kickoffAt: Date;
};

/**
 * Clé d'appariement d'une équipe entre football-data et The Odds API :
 *   • sélections nationales → code drapeau (le plus fiable : "Turkey",
 *     "Türkiye" et "Turkiye" tombent tous sur "tr") ;
 *   • clubs → clé canonique de nom (cf. lib/teams.ts), les écussons n'étant pas
 *     partagés entre les deux API.
 */
function teamKey(name: string, kind: Season["kind"]): string {
  return kind === "CLUBS" ? clubKey(name) : countryCode(name);
}

/**
 * Trouve l'évènement de cotes correspondant à un match (par clé d'équipe, peu
 * importe l'ordre domicile/extérieur), et renvoie les cotes 1X2 ré-orientées
 * vers le domicile/extérieur de NOTRE match. `null` si aucun évènement
 * n'apparie.
 */
function matchOdds(
  events: OddsMatch[],
  m: MatchRow,
  kind: Season["kind"]
): Odds1x2 | null {
  const mh = teamKey(m.homeTeam, kind);
  const ma = teamKey(m.awayTeam, kind);
  if (!mh || !ma) return null;

  const candidates = events.filter((e) => {
    const eh = teamKey(e.home, kind);
    const ea = teamKey(e.away, kind);
    if (!eh || !ea) return false;
    return (eh === mh && ea === ma) || (eh === ma && ea === mh);
  });
  if (candidates.length === 0) return null;

  // Le plus proche du coup d'envoi — indispensable en C1, où une même
  // confrontation se joue en aller-retour (deux évènements pour la même paire).
  const ev = candidates.reduce((best, e) =>
    Math.abs(+new Date(e.commenceTime) - +m.kickoffAt) <
    Math.abs(+new Date(best.commenceTime) - +m.kickoffAt)
      ? e
      : best
  );

  // L'évènement peut lister les équipes dans l'ordre inverse du nôtre.
  const swapped = teamKey(ev.home, kind) === ma;
  return swapped
    ? { home: ev.oddsAway, draw: ev.oddsDraw, away: ev.oddsHome }
    : { home: ev.oddsHome, draw: ev.oddsDraw, away: ev.oddsAway };
}

/**
 * Capture les cotes des matchs à venir (kickoff futur). Ne touche jamais un
 * match déjà commencé → la dernière valeur stockée reste la « closing odd ».
 * No-op silencieux si aucune clé `ODDS_API_KEY` (fetchLiveOdds → null).
 */
export async function snapshotOdds(): Promise<SnapshotResult> {
  const season = await getActiveSeason();
  if (!season) return { updated: 0, unmatchedSoon: [] };

  const events = await fetchLiveOdds(season.oddsSport ?? ODDS_SPORT);
  if (!events || events.length === 0) return { updated: 0, unmatchedSoon: [] };

  const now = new Date();
  const soon = now.getTime() + SOON_MS;
  const matches = await prisma.match.findMany({
    where: { seasonId: season.id, kickoffAt: { gt: now } },
    select: {
      id: true,
      homeTeam: true,
      awayTeam: true,
      homeFlag: true,
      awayFlag: true,
      kickoffAt: true,
    },
  });

  let updated = 0;
  const unmatchedSoon: string[] = [];
  for (const m of matches) {
    const odds = matchOdds(events, m, season.kind);
    if (!odds) {
      // Match imminent sans cote → souvent un nom d'équipe non mappé : on le
      // signale pour backfill manuel (panneau admin « 🎲 Cotes manuelles »).
      if (+m.kickoffAt < soon) unmatchedSoon.push(`${m.homeTeam}–${m.awayTeam}`);
      continue;
    }
    await prisma.match.update({
      where: { id: m.id },
      data: {
        oddsHome: odds.home,
        oddsDraw: odds.draw,
        oddsAway: odds.away,
        oddsCapturedAt: now,
      },
    });
    updated++;
  }
  return { updated, unmatchedSoon };
}

/**
 * Snapshot throttlé : au plus 1 appel toutes les 6 h, et seulement s'il existe
 * un match à venir (garde-fou « pas d'appel sans match »). À appeler depuis la
 * boucle de sync.
 */
export async function maybeSnapshotOdds(): Promise<void> {
  if (Date.now() < nextOddsFetchAt) return;
  if (oddsInFlight) {
    await oddsInFlight.catch(() => {});
    return;
  }
  // Garde-fou : aucun match à venir dans la saison active → aucun appel réseau.
  const season = await getActiveSeason();
  if (!season) return;
  const upcoming = await prisma.match.count({
    where: { seasonId: season.id, kickoffAt: { gt: new Date() } },
  });
  if (upcoming === 0) return;

  oddsInFlight = snapshotOdds();
  try {
    const { updated, unmatchedSoon } = await oddsInFlight;
    nextOddsFetchAt = Date.now() + ODDS_INTERVAL_MS; // succès → prochaine dans 6 h
    if (updated > 0) console.log(`[odds] ✓ ${updated} matchs cotés`);
    if (unmatchedSoon.length > 0) {
      console.warn(
        `[odds] ⚠ ${unmatchedSoon.length} match(s) imminent(s) sans cote (à backfiller) : ${unmatchedSoon.join(", ")}`
      );
    }
  } catch (e) {
    // Échec dur (clé invalide, réseau…) → on retente bientôt, pas dans 6 h.
    nextOddsFetchAt = Date.now() + ODDS_ERROR_BACKOFF_MS;
    console.error("[odds] ✗", e instanceof Error ? e.message : e);
  } finally {
    oddsInFlight = null;
  }
}
