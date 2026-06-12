/**
 * Recalcule tous les points à partir des résultats enregistrés, avec le
 * barème ACTUEL (lib/scoring.ts). À lancer après un changement de règles :
 *
 *   npm run rescore
 *
 * Équivalent CLI du bouton « ♻️ Recalculer les points » de la console admin.
 * Idempotent.
 */
import { prisma } from "../lib/prisma";
import { applyMatchResult } from "../lib/football-data";

async function main() {
  const results = await prisma.result.findMany({
    where: { status: "FINISHED" },
    include: { match: { select: { homeTeam: true, awayTeam: true } } },
  });

  if (results.length === 0) {
    console.log("Aucun match terminé — rien à recalculer.");
    return;
  }

  let predictions = 0;
  for (const r of results) {
    const { scored } = await applyMatchResult(r.matchId, r.homeScore, r.awayScore, {
      force: true,
    });
    predictions += scored;
    console.log(
      `✓ ${r.match.homeTeam} ${r.homeScore}-${r.awayScore} ${r.match.awayTeam} — ${scored} pronos`
    );
  }
  console.log(`\nTerminé : ${results.length} matchs, ${predictions} pronos recalculés.`);
}

main()
  .catch((e) => {
    console.error("✗ Échec du recalcul:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
