// ─────────────────────────────────────────────
// Périmètre de pari — sur quels matchs peut-on pronostiquer ?
//
// Une phase de ligue de C1, c'est 144 matchs : trop pour une bande de potes.
// La règle : tant qu'un club « à suivre » (les clubs français, cf.
// `Season.focusCountries`) est en lice, on ne parie que sur SES matchs. Quand
// ils sont tous éliminés, tout s'ouvre — il reste alors peu de matchs.
//
// Formulation retenue : un match est pronosticable s'il implique un club suivi,
// OU si son coup d'envoi est POSTÉRIEUR au dernier match connu d'un club suivi.
// C'est stable dans le temps — contrairement à un simple « reste-t-il un club
// français ? », qui basculerait d'un coup et rendrait rétroactivement
// pronosticables des matchs déjà joués (et fausserait les badges de journée).
// ─────────────────────────────────────────────

import { prisma } from "./prisma";
import type { Season } from "./season";

/** Ce qu'il faut savoir d'un match pour trancher. */
export type BettableMatch = {
  kickoffAt: string | Date;
  homeCountry?: string | null;
  awayCountry?: string | null;
};

export type BettingScope = {
  /** Codes pays suivis (vide = aucune restriction, tout est pronosticable). */
  countries: string[];
  /**
   * Coup d'envoi du dernier match connu impliquant un club suivi (ms epoch).
   * `null` s'il n'y en a aucun — auquel cas plus rien n'est restreint.
   */
  lastFocusKickoff: number | null;
};

/** Périmètre sans restriction (Coupe du Monde, ou saison non configurée). */
export const UNRESTRICTED: BettingScope = {
  countries: [],
  lastFocusKickoff: null,
};

function isFocusTeam(m: BettableMatch, countries: string[]): boolean {
  if (countries.length === 0) return false;
  return (
    (!!m.homeCountry && countries.includes(m.homeCountry)) ||
    (!!m.awayCountry && countries.includes(m.awayCountry))
  );
}

/** Un match implique-t-il un club suivi ? */
export function isFocusMatch(m: BettableMatch, scope: BettingScope): boolean {
  return isFocusTeam(m, scope.countries);
}

/** Peut-on pronostiquer ce match ? */
export function isBettableMatch(m: BettableMatch, scope: BettingScope): boolean {
  if (scope.countries.length === 0) return true;
  if (isFocusTeam(m, scope.countries)) return true;
  // Plus aucun club suivi après ce coup d'envoi → le match s'ouvre.
  if (scope.lastFocusKickoff === null) return true;
  return +new Date(m.kickoffAt) > scope.lastFocusKickoff;
}

/**
 * Construit le périmètre à partir des matchs déjà chargés (évite une requête
 * quand la page a déjà la liste complète de la saison).
 */
export function buildBettingScope(
  season: Season | null,
  matches: BettableMatch[]
): BettingScope {
  const countries = season?.focusCountries ?? [];
  if (countries.length === 0) return UNRESTRICTED;

  let lastFocusKickoff: number | null = null;
  for (const m of matches) {
    if (!isFocusTeam(m, countries)) continue;
    const t = +new Date(m.kickoffAt);
    if (lastFocusKickoff === null || t > lastFocusKickoff) lastFocusKickoff = t;
  }

  return { countries, lastFocusKickoff };
}

/**
 * Idem, mais en interrogeant la base — pour les appelants qui n'ont qu'un
 * `seasonId` (routes API, calcul des badges).
 */
export async function getBettingScope(
  seasonId: string | null
): Promise<BettingScope> {
  if (!seasonId) return UNRESTRICTED;

  try {
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      select: { focusCountries: true },
    });
    const countries = season?.focusCountries ?? [];
    if (countries.length === 0) return UNRESTRICTED;

    const last = await prisma.match.findFirst({
      where: {
        seasonId,
        OR: [
          { homeCountry: { in: countries } },
          { awayCountry: { in: countries } },
        ],
      },
      orderBy: { kickoffAt: "desc" },
      select: { kickoffAt: true },
    });
    return { countries, lastFocusKickoff: last ? +last.kickoffAt : null };
  } catch {
    // Base injoignable : on n'invente pas de restriction.
    return UNRESTRICTED;
  }
}

/**
 * Filtre Prisma équivalent à `isBettableMatch`, pour compter les matchs
 * pronosticables d'une journée (badges « L'Assidu » / « Même pas mal »).
 */
export function bettableWhere(scope: BettingScope) {
  if (scope.countries.length === 0) return {};
  const focus = [
    { homeCountry: { in: scope.countries } },
    { awayCountry: { in: scope.countries } },
  ];
  if (scope.lastFocusKickoff === null) return {};
  return {
    OR: [...focus, { kickoffAt: { gt: new Date(scope.lastFocusKickoff) } }],
  };
}
