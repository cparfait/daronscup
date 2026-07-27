// ─────────────────────────────────────────────
// Règles des jokers DaronsFC.
//
// Un joker double les points du pronostic concerné (×2). Le budget est défini
// PAR SAISON (cf. `Season.jokerLeagueBudget` / `jokerKnockoutBudget`), en deux
// phases :
//   • premier tour (poules CdM / phase de ligue C1)
//   • phase à élimination directe (barrages → finale)
//
// Défauts (repli quand la saison n'est pas connue) : ceux de la Coupe du Monde
// 2026, soit 4 / 2. La Ligue des Champions 2026/27 est à 8 / 4 (8 journées de
// phase de ligue, et jusqu'à 9 matchs de phase finale).
// ─────────────────────────────────────────────

import type { Stage } from "./data/matches";
import { FIRST_ROUND_STAGES, KNOCKOUT_STAGES, type Season } from "./season";

export type JokerPhase = "group" | "knockout";

/** Budgets de repli (Coupe du Monde) quand aucune saison n'est résolue. */
export const JOKER_BUDGET: Record<JokerPhase, number> = {
  group: 4,
  knockout: 2,
};

/** Phase de joker associée à une étape de la compétition. */
export function jokerPhase(stage: Stage): JokerPhase {
  return FIRST_ROUND_STAGES.includes(stage) ? "group" : "knockout";
}

/** Étapes appartenant à une phase de joker (pour filtrer les pronostics). */
export function stagesOfPhase(phase: JokerPhase): Stage[] {
  return phase === "group" ? FIRST_ROUND_STAGES : KNOCKOUT_STAGES;
}

/** Budgets de jokers d'une saison (repli sur les valeurs CdM). */
export function seasonBudgets(
  season: Season | null
): Record<JokerPhase, number> {
  if (!season) return JOKER_BUDGET;
  return {
    group: season.jokerLeagueBudget,
    knockout: season.jokerKnockoutBudget,
  };
}

/** Budget total de jokers pour la phase d'une étape donnée. */
export function jokerBudget(stage: Stage, season?: Season | null): number {
  return seasonBudgets(season ?? null)[jokerPhase(stage)];
}

/** Libellé du budget par phase, adapté au format de la saison. */
export function jokerLabels(
  season: Season | null
): Record<JokerPhase, string> {
  const b = seasonBudgets(season);
  const first =
    season?.kind === "CLUBS" ? "en phase de ligue" : "en phase de poules";
  return {
    group: `${b.group} joker${b.group > 1 ? "s" : ""} ${first}`,
    knockout: `${b.knockout} joker${b.knockout > 1 ? "s" : ""} en phase finale`,
  };
}

/** Nom de la première phase, selon le format de la saison. */
export function firstPhaseLabel(season: Season | null): string {
  return season?.kind === "CLUBS" ? "Phase de ligue" : "Phase de poules";
}
