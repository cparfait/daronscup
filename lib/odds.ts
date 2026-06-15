// ─────────────────────────────────────────────
// Client « cotes » (The Odds API) — expérimental.
//
// Récupère les cotes 1X2 (marché « h2h ») d'une compétition et en déduit des
// probabilités implicites + un palier de difficulté façon MPP. Sert pour
// l'instant la page de test /odds-test.
//
// Clé gratuite : https://the-odds-api.com (500 req/mois). Sans clé, l'appelant
// retombe sur SAMPLE_ODDS pour visualiser le rendu.
// ─────────────────────────────────────────────

const BASE_URL = "https://api.the-odds-api.com/v4";

/** Clé de sport The Odds API (défaut : Coupe du Monde). Surchageable par env. */
export const ODDS_SPORT = process.env.ODDS_API_SPORT ?? "soccer_fifa_world_cup";
/** Région bookmakers (eu couvre bien les compétitions internationales). */
export const ODDS_REGION = process.env.ODDS_API_REGION ?? "eu";

/** Cotes 1X2 (décimales) d'un match, normalisées pour notre usage. */
export type OddsMatch = {
  home: string;
  away: string;
  commenceTime: string; // ISO
  oddsHome: number;
  oddsDraw: number;
  oddsAway: number;
  bookmaker?: string;
};

// ── Types partiels du payload The Odds API ──
type ApiOutcome = { name: string; price: number };
type ApiMarket = { key: string; outcomes: ApiOutcome[] };
type ApiBookmaker = { key: string; title: string; markets: ApiMarket[] };
type ApiEvent = {
  id: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: ApiBookmaker[];
};

/** Extrait les cotes 1X2 d'un évènement (1er bookmaker proposant le h2h). */
function toOddsMatch(ev: ApiEvent): OddsMatch | null {
  for (const bk of ev.bookmakers) {
    const h2h = bk.markets.find((m) => m.key === "h2h");
    if (!h2h) continue;
    const home = h2h.outcomes.find((o) => o.name === ev.home_team)?.price;
    const away = h2h.outcomes.find((o) => o.name === ev.away_team)?.price;
    const draw = h2h.outcomes.find((o) => o.name === "Draw")?.price;
    if (home && away && draw) {
      return {
        home: ev.home_team,
        away: ev.away_team,
        commenceTime: ev.commence_time,
        oddsHome: home,
        oddsDraw: draw,
        oddsAway: away,
        bookmaker: bk.title,
      };
    }
  }
  return null;
}

/**
 * Récupère les cotes 1X2 en direct. Renvoie null si aucune clé n'est
 * configurée (l'appelant bascule alors sur les données d'exemple).
 */
export async function fetchLiveOdds(): Promise<OddsMatch[] | null> {
  const key = process.env.ODDS_API_KEY;
  if (!key) return null;

  const url =
    `${BASE_URL}/sports/${ODDS_SPORT}/odds/?apiKey=${key}` +
    `&regions=${ODDS_REGION}&markets=h2h&oddsFormat=decimal`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`the-odds-api ${res.status}: ${res.statusText} ${body}`.trim());
  }
  const events = (await res.json()) as ApiEvent[];
  return events
    .map(toOddsMatch)
    .filter((m): m is OddsMatch => m !== null)
    .sort((a, b) => +new Date(a.commenceTime) - +new Date(b.commenceTime));
}

/**
 * Probabilités implicites (en %) déduites des cotes, normalisées pour retirer
 * la marge du bookmaker (« vig ») : p_i = (1/cote_i) / Σ(1/cote).
 */
export function impliedProbabilities(m: OddsMatch): {
  home: number;
  draw: number;
  away: number;
} {
  const rHome = 1 / m.oddsHome;
  const rDraw = 1 / m.oddsDraw;
  const rAway = 1 / m.oddsAway;
  const total = rHome + rDraw + rAway;
  return {
    home: (rHome / total) * 100,
    draw: (rDraw / total) * 100,
    away: (rAway / total) * 100,
  };
}

/** Palier de difficulté d'une issue, selon sa probabilité implicite. */
export type Tier = {
  label: string;
  /** Bonus de points ajouté au « bon résultat » si cette issue se réalise. */
  bonus: number;
  /** Couleur d'accent (variable CSS) pour l'UI. */
  accent: string;
};

export function outcomeTier(probPct: number): Tier {
  if (probPct >= 50)
    return { label: "Favori", bonus: 0, accent: "var(--color-muted)" };
  if (probPct >= 33)
    return { label: "Équilibré", bonus: 1, accent: "var(--color-pitch-bright)" };
  if (probPct >= 18)
    return { label: "Outsider", bonus: 2, accent: "var(--color-gold)" };
  return { label: "Gros outsider", bonus: 3, accent: "var(--color-gold-bright)" };
}

/** Points de base pour un « bon résultat » (aligné sur le barème actuel). */
export const BASE_CORRECT_RESULT = 1;

/** Jeu d'exemple (sans clé API) — quelques affiches Coupe du Monde. */
export const SAMPLE_ODDS: OddsMatch[] = [
  {
    home: "France",
    away: "Norway",
    commenceTime: "2026-06-16T19:00:00Z",
    oddsHome: 1.4,
    oddsDraw: 4.8,
    oddsAway: 7.5,
    bookmaker: "Exemple",
  },
  {
    home: "Brazil",
    away: "Croatia",
    commenceTime: "2026-06-17T16:00:00Z",
    oddsHome: 1.85,
    oddsDraw: 3.6,
    oddsAway: 4.2,
    bookmaker: "Exemple",
  },
  {
    home: "Japan",
    away: "Spain",
    commenceTime: "2026-06-18T18:00:00Z",
    oddsHome: 6.0,
    oddsDraw: 4.0,
    oddsAway: 1.55,
    bookmaker: "Exemple",
  },
  {
    home: "England",
    away: "Argentina",
    commenceTime: "2026-06-19T20:00:00Z",
    oddsHome: 2.7,
    oddsDraw: 3.2,
    oddsAway: 2.6,
    bookmaker: "Exemple",
  },
];
