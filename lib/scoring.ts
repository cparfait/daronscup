/**
 * Logique de calcul des points DaronsFC.
 *
 * | Résultat                                              | Points |
 * |-------------------------------------------------------|--------|
 * | Score exact                                           | 3      |
 * | Bon vainqueur + bonne différence de buts (hors nul)   | 2      |
 * | Bon sens du résultat (bon vainqueur OU bon nul)        | 1      |
 * | Mauvais pronostic                                     | 0      |
 * | Joker activé                                          | × 2    |
 *
 * Note sur les nuls : un nul a toujours une différence de buts nulle, donc le
 * bonus « bonne différence » (2 pts) ne s'applique pas aux nuls — sinon tout
 * nul correct vaudrait 2 d'office, alors qu'un bon vainqueur au mauvais écart
 * ne vaut que 1. Un nul bien vu mais au mauvais score vaut donc 1 pt (et 3 si
 * exact), ce qui rétablit la symétrie avec les matchs décisifs.
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

  const predOutcome = outcome(prediction);
  const sameOutcome = predOutcome === outcome(result);
  const isDraw = predOutcome === 0;
  const sameDiff =
    prediction.homeScore - prediction.awayScore ===
    result.homeScore - result.awayScore;

  let base: number;
  if (exactScore) {
    base = 3;
  } else if (sameOutcome && sameDiff && !isDraw) {
    // Bonne différence de buts, mais uniquement pour un match décisif :
    // pour un nul la différence est triviale (toujours 0).
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
