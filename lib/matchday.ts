// ─────────────────────────────────────────────
// « Journées » de compétition.
//
// Le numéro de journée fourni par l'API n'est PAS unique à lui seul : en Ligue
// des Champions, les tours à élimination directe se jouent en aller-retour et
// portent `matchday` = 1 ou 2 — qui collisionnent avec les journées 1 et 2 de la
// phase de ligue. On combine donc toujours l'étape et le numéro.
//
// Sert aux badges « L'Assidu » (tous les matchs d'une journée pronostiqués) et
// « Même pas mal » (0 pt sur une journée complète).
// ─────────────────────────────────────────────

import { STAGE_LABELS, type Stage } from "./data/matches";
import { isKnockoutStage } from "./season";

/** Clé unique d'une journée (étape + numéro). */
export function matchdayKey(stage: Stage, matchday: number | null): string {
  return `${stage}:${matchday ?? "-"}`;
}

/** Libellé d'une journée ("Journée 3", "Barrage · aller", "Quart de finale"). */
export function matchdayLabel(
  stage: Stage,
  matchday: number | null,
  twoLegged = false
): string {
  if (!isKnockoutStage(stage)) {
    return matchday != null ? `Journée ${matchday}` : STAGE_LABELS[stage];
  }
  // Tour à élimination directe en aller-retour → la journée est la manche.
  if (twoLegged && stage !== "FINAL" && matchday != null) {
    return `${STAGE_LABELS[stage]} · ${matchday === 1 ? "aller" : "retour"}`;
  }
  return STAGE_LABELS[stage];
}

/**
 * Libellé d'un match tel qu'affiché sur les cartes et l'en-tête de la fiche :
 *   • poule de Coupe du Monde → "Groupe C"
 *   • phase de ligue de C1    → "Phase de ligue · J3"
 *   • tour aller-retour       → "Barrage · aller"
 *   • match sec               → "Quart de finale"
 */
export function matchLabel(
  stage: Stage,
  group: string | null,
  matchday: number | null,
  twoLegged = false
): string {
  if (group) return `Groupe ${group}`;
  if (stage === "LEAGUE" && matchday != null) {
    return `${STAGE_LABELS.LEAGUE} · J${matchday}`;
  }
  const leg = legLabel(stage, matchday, twoLegged);
  return leg ? `${STAGE_LABELS[stage]} · ${leg.toLowerCase()}` : STAGE_LABELS[stage];
}

/** Libellé court de la manche d'un match aller-retour, ou null. */
export function legLabel(
  stage: Stage,
  matchday: number | null,
  twoLegged: boolean
): string | null {
  if (!twoLegged || !isKnockoutStage(stage) || stage === "FINAL") return null;
  if (matchday !== 1 && matchday !== 2) return null;
  return matchday === 1 ? "Aller" : "Retour";
}
