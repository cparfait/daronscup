// ─────────────────────────────────────────────
// Saisons — helpers serveur.
//
// L'app suit UNE compétition à la fois : la saison `active`. Tous les getters
// de `lib/data/queries.ts` sont scopés dessus. Les saisons clôturées restent
// consultables en archive (cf. lib/season-archive.ts).
//
// Les deux formats couverts :
//   • NATIONS (Coupe du Monde) — poules A…L puis 16èmes → finale, matchs secs.
//   • CLUBS (Ligue des Champions) — phase de ligue (36 clubs, 1 classement,
//     8 journées) puis barrages → finale, tours en ALLER-RETOUR (sauf finale).
// ─────────────────────────────────────────────

import { prisma } from "./prisma";
import type { Stage } from "./data/matches";

export type SeasonKind = "NATIONS" | "CLUBS";

/** Saison telle que consommée par l'app (sérialisable, passable en prop). */
export type Season = {
  id: string;
  code: string;
  name: string;
  shortName: string;
  kind: SeasonKind;
  emoji: string;
  /** Logo de la compétition servi depuis `public/` (null → on affiche l'emoji). */
  logo: string | null;
  competition: string;
  apiSeason: string | null;
  oddsSport: string | null;
  /**
   * Codes pays (football-data `area.code`) des clubs « à suivre ». Tant qu'un
   * de ces clubs est en lice, seuls SES matchs sont pronosticables — voir
   * lib/betting.ts. Vide = aucune restriction.
   */
  focusCountries: string[];
  /** Enjeu de la saison, affiché sur le Hub (« le dernier paie la tournée »). */
  stake: string | null;
  jokerLeagueBudget: number;
  jokerKnockoutBudget: number;
  championBonus: number;
  active: boolean;
  /** Saison de prévisualisation, visible des seuls admins en mode aperçu. */
  adminOnly: boolean;
  closedAt: string | null;
};

type DbSeason = {
  id: string;
  code: string;
  name: string;
  shortName: string;
  kind: string;
  emoji: string;
  logo: string | null;
  competition: string;
  apiSeason: string | null;
  oddsSport: string | null;
  focusCountries: string[];
  stake: string | null;
  jokerLeagueBudget: number;
  jokerKnockoutBudget: number;
  championBonus: number;
  active: boolean;
  adminOnly: boolean;
  closedAt: Date | null;
};

function toSeason(s: DbSeason): Season {
  return {
    id: s.id,
    code: s.code,
    name: s.name,
    shortName: s.shortName,
    kind: s.kind === "CLUBS" ? "CLUBS" : "NATIONS",
    emoji: s.emoji,
    logo: s.logo,
    competition: s.competition,
    apiSeason: s.apiSeason,
    oddsSport: s.oddsSport,
    focusCountries: s.focusCountries,
    stake: s.stake,
    jokerLeagueBudget: s.jokerLeagueBudget,
    jokerKnockoutBudget: s.jokerKnockoutBudget,
    championBonus: s.championBonus,
    active: s.active,
    adminOnly: s.adminOnly,
    closedAt: s.closedAt?.toISOString() ?? null,
  };
}

// ─────────────────────────────────────────────
// Définitions des saisons connues
//
// Sert au bootstrap (lib/init.ts) et au panneau admin. Une saison absente en
// base est créée à partir de ces gabarits ; une saison existante n'est jamais
// écrasée (l'admin peut avoir ajusté les budgets de jokers).
// ─────────────────────────────────────────────

export type SeasonSeed = Omit<Season, "id" | "active" | "adminOnly" | "closedAt">;

/** Coupe du Monde 2026 — la saison historique, archivée. */
export const WC_2026: SeasonSeed = {
  code: "WC-2026",
  name: "Coupe du Monde 2026",
  shortName: "CdM 2026",
  kind: "NATIONS",
  emoji: "🌍",
  logo: "/world-cup.png",
  competition: "WC",
  apiSeason: "2026",
  oddsSport: "soccer_fifa_world_cup",
  // 104 matchs mais 48 sélections : pas besoin de restreindre le périmètre.
  focusCountries: [],
  stake: null,
  jokerLeagueBudget: 4,
  jokerKnockoutBudget: 2,
  championBonus: 50,
};

/** Ligue des Champions 2026/2027 — la saison en cours. */
export const CL_2026_2027: SeasonSeed = {
  code: "CL-2026-2027",
  name: "Ligue des Champions 2026/2027",
  shortName: "C1 2026/27",
  kind: "CLUBS",
  emoji: "⭐",
  logo: "/seasons/c1.svg",
  competition: "CL",
  // La saison C1 2026/27 démarre en septembre 2026 → `?season=2026` côté API.
  apiSeason: "2026",
  oddsSport: "soccer_uefa_champs_league",
  // 144 matchs rien qu'en phase de ligue : on limite les pronos aux clubs
  // français tant qu'il en reste (cf. lib/betting.ts). "MCO" car football-data
  // classe l'AS Monaco sous la principauté, alors que c'est un club de Ligue 1.
  focusCountries: ["FRA", "MCO"],
  stake: null,
  // Format plus long que la CdM : 8 journées de phase de ligue, et jusqu'à
  // 9 matchs en phase finale (barrages → finale, en aller-retour).
  jokerLeagueBudget: 8,
  jokerKnockoutBudget: 4,
  championBonus: 50,
};

export const SEASON_SEEDS: SeasonSeed[] = [WC_2026, CL_2026_2027];

// ─────────────────────────────────────────────
// Getters
// ─────────────────────────────────────────────

const SELECT = {
  id: true,
  code: true,
  name: true,
  shortName: true,
  kind: true,
  emoji: true,
  logo: true,
  competition: true,
  apiSeason: true,
  oddsSport: true,
  focusCountries: true,
  stake: true,
  jokerLeagueBudget: true,
  jokerKnockoutBudget: true,
  championBonus: true,
  active: true,
  adminOnly: true,
  closedAt: true,
} as const;

/**
 * Saison active, ou null si la base n'est pas joignable / pas encore amorcée.
 * Repli défensif (comme les autres getters) : l'app affiche des états vides
 * plutôt que de planter.
 */
export async function getActiveSeason(): Promise<Season | null> {
  try {
    const s = await prisma.season.findFirst({
      // `adminOnly: false` est une ceinture de sécurité : une saison d'aperçu ne
      // doit JAMAIS être la saison active, donc jamais synchronisée ni scorée.
      where: { active: true, adminOnly: false },
      select: SELECT,
      orderBy: { createdAt: "desc" },
    });
    return s ? toSeason(s as DbSeason) : null;
  } catch {
    return null;
  }
}

/** Saison par son code (ex. "WC-2026"), ou null. */
export async function getSeasonByCode(code: string): Promise<Season | null> {
  try {
    const s = await prisma.season.findUnique({ where: { code }, select: SELECT });
    return s ? toSeason(s as DbSeason) : null;
  } catch {
    return null;
  }
}

/** Toutes les saisons, la plus récente d'abord. */
export async function getSeasons(): Promise<Season[]> {
  try {
    const rows = await prisma.season.findMany({
      select: SELECT,
      orderBy: { createdAt: "desc" },
    });
    return rows.map((s) => toSeason(s as DbSeason));
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────
// Saison CONSULTÉE (aperçu admin)
//
// Deux notions distinctes, à ne pas confondre :
//   • `getActiveSeason()` — la compétition RÉELLE. C'est elle que synchronisent
//     l'API et le scoring, et elle seule. Jamais une saison d'aperçu.
//   • `getViewingSeason()` — ce que l'utilisateur courant VOIT. Identique à la
//     saison active, sauf pour un admin ayant activé le mode aperçu : il voit
//     alors la saison `adminOnly` (le jeu de test), sans que personne d'autre
//     ne s'en aperçoive.
// ─────────────────────────────────────────────

/** Cookie qui active le mode aperçu pour un admin. */
export const PREVIEW_COOKIE = "daronsfc_preview";

/** La saison de prévisualisation (jeu de test), ou null s'il n'y en a pas. */
export async function getPreviewSeason(): Promise<Season | null> {
  try {
    const s = await prisma.season.findFirst({
      where: { adminOnly: true },
      select: SELECT,
      orderBy: { createdAt: "desc" },
    });
    return s ? toSeason(s as DbSeason) : null;
  } catch {
    return null;
  }
}

/**
 * Saison que l'utilisateur courant doit voir.
 *
 * Renvoie la saison d'aperçu UNIQUEMENT si l'appelant est un admin et que le
 * cookie d'aperçu est posé — le cookie seul ne suffit pas, sinon n'importe qui
 * pourrait le forger. En dehors d'un contexte de requête (boucle de synchro,
 * scripts), `cookies()` lève : on retombe alors sur la saison active, ce qui est
 * exactement le comportement voulu.
 */
export async function getViewingSeason(): Promise<Season | null> {
  try {
    const { cookies } = await import("next/headers");
    const jar = await cookies();
    if (jar.get(PREVIEW_COOKIE)?.value !== "1") return getActiveSeason();

    const { auth } = await import("./auth");
    const session = await auth();
    if (session?.user?.role !== "ADMIN") return getActiveSeason();

    return (await getPreviewSeason()) ?? (await getActiveSeason());
  } catch {
    return getActiveSeason();
  }
}

/** Saisons clôturées (archives), la plus récente d'abord. */
export async function getClosedSeasons(): Promise<Season[]> {
  return (await getSeasons()).filter((s) => s.closedAt !== null);
}

// ─────────────────────────────────────────────
// Format de compétition
// ─────────────────────────────────────────────

/** Étapes « premier tour » (poules CdM / phase de ligue C1). */
export const FIRST_ROUND_STAGES: Stage[] = ["GROUP", "LEAGUE"];

/** Étapes à élimination directe, dans l'ordre du tournoi. */
export const KNOCKOUT_STAGES: Stage[] = [
  "PLAYOFF",
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTER",
  "SEMI",
  "THIRD_PLACE",
  "FINAL",
];

export function isKnockoutStage(stage: Stage): boolean {
  return !FIRST_ROUND_STAGES.includes(stage);
}

export function isClubsSeason(season: Season | null): boolean {
  return season?.kind === "CLUBS";
}

/**
 * Les tours à élimination directe se jouent-ils en ALLER-RETOUR ?
 * Vrai en C1 (hors finale), faux en Coupe du Monde. Conditionne la demande du
 * vainqueur aux tirs au but (cf. `needsPenaltyPick`) et le regroupement des
 * deux manches d'une confrontation.
 */
export function hasTwoLeggedTies(season: Season | null): boolean {
  return isClubsSeason(season);
}

/**
 * Faut-il demander « qui gagne aux tirs au but ? » sur un prono de nul ?
 *
 * Match sec (CdM, ou finale de C1) → oui : un nul ne peut pas rester.
 * Manche d'une confrontation aller-retour → NON : un nul y est un résultat
 * parfaitement normal (c'est le cumul des deux manches qui départage), donc
 * demander un vainqueur aux tirs n'aurait aucun sens.
 */
export function needsPenaltyPick(season: Season | null, stage: Stage): boolean {
  if (!isKnockoutStage(stage)) return false;
  if (!hasTwoLeggedTies(season)) return true;
  return stage === "FINAL";
}
