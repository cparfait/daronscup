/**
 * Logique de calcul des points DaronsFC.
 *
 * | Résultat                                   | Points |
 * |--------------------------------------------|--------|
 * | Score exact                                | 3      |
 * | Bon vainqueur + bonne différence de buts   | 2      |
 * | Bon vainqueur uniquement                   | 1      |
 * | Mauvais pronostic                          | 0      |
 * | Joker activé                               | × 2    |
 *
 * Fonction pure — entièrement testable sans base de données.
 */

export type ScoreInput = {
  homeScore: number;
  awayScore: number;
};

export type ScoreBreakdown = {
  /** Points avant application du joker. */
  base: number;
  /** Points effectivement crédités (× 2 si joker). */
  points: number;
  exactScore: boolean;
  correctResult: boolean;
};

/** -1 = victoire extérieure, 0 = nul, 1 = victoire domicile. */
function outcome({ homeScore, awayScore }: ScoreInput): -1 | 0 | 1 {
  if (homeScore > awayScore) return 1;
  if (homeScore < awayScore) return -1;
  return 0;
}

export function computePoints(
  prediction: ScoreInput,
  result: ScoreInput,
  joker = false
): ScoreBreakdown {
  const exactScore =
    prediction.homeScore === result.homeScore &&
    prediction.awayScore === result.awayScore;

  const sameOutcome = outcome(prediction) === outcome(result);
  const sameDiff =
    prediction.homeScore - prediction.awayScore ===
    result.homeScore - result.awayScore;

  let base: number;
  if (exactScore) {
    base = 3;
  } else if (sameOutcome && sameDiff) {
    base = 2;
  } else if (sameOutcome) {
    base = 1;
  } else {
    base = 0;
  }

  return {
    base,
    points: joker ? base * 2 : base,
    exactScore,
    correctResult: sameOutcome,
  };
}
