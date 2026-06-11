// ─────────────────────────────────────────────
// Règles des jokers DaronsFC.
//
// Budget par phase :
//   • Phase de poules (GROUP)        → 4 jokers
//   • Phase finale (16e → finale)    → 2 jokers
//
// Un joker double les points du pronostic concerné (×2).
// ─────────────────────────────────────────────

import type { Stage } from "./data/matches";

export type JokerPhase = "group" | "knockout";

export const JOKER_BUDGET: Record<JokerPhase, number> = {
  group: 4,
  knockout: 2,
};

const KNOCKOUT_STAGES: Stage[] = [
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTER",
  "SEMI",
  "THIRD_PLACE",
  "FINAL",
];

/** Phase de joker associée à une étape de la compétition. */
export function jokerPhase(stage: Stage): JokerPhase {
  return stage === "GROUP" ? "group" : "knockout";
}

/** Étapes appartenant à une phase de joker (pour filtrer les pronostics). */
export function stagesOfPhase(phase: JokerPhase): Stage[] {
  return phase === "group" ? ["GROUP"] : KNOCKOUT_STAGES;
}

/** Budget total de jokers pour la phase d'une étape donnée. */
export function jokerBudget(stage: Stage): number {
  return JOKER_BUDGET[jokerPhase(stage)];
}

export const JOKER_LABEL: Record<JokerPhase, string> = {
  group: "4 jokers en phase de poules",
  knockout: "2 jokers en phase finale",
};
