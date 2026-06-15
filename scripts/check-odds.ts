// Diagnostic cotes : etat base + reponse The Odds API. Usage :
//   npx tsx --env-file=.env scripts/check-odds.ts
import { prisma } from "../lib/prisma";
import { fetchLiveOdds, ODDS_SPORT, ODDS_REGION } from "../lib/odds";
import { snapshotOdds } from "../lib/odds-sync";

async function main() {
  const total = await prisma.match.count();
  const withOdds = await prisma.match.count({ where: { oddsHome: { not: null } } });
  const upcoming = await prisma.match.count({ where: { kickoffAt: { gt: new Date() } } });
  console.log(`Base : ${total} matchs (${upcoming} a venir), dont ${withOdds} avec cote.`);
  console.log(`Cle ODDS_API_KEY : ${process.env.ODDS_API_KEY ? "presente" : "ABSENTE"}`);
  console.log(`Sport=${ODDS_SPORT} Region=${ODDS_REGION}`);

  try {
    const events = await fetchLiveOdds();
    if (events === null) {
      console.log("fetchLiveOdds -> null (pas de cle).");
    } else {
      console.log(`The Odds API -> ${events.length} evenement(s).`);
      events.slice(0, 8).forEach((e) =>
        console.log(`  - ${e.home} vs ${e.away}  [${e.bookmaker}]`)
      );
    }
  } catch (e) {
    console.log("Erreur API :", e instanceof Error ? e.message : e);
  }

  // Capture manuelle (peuple les cotes des matchs a venir).
  const { updated, unmatchedSoon } = await snapshotOdds();
  console.log(`\nSnapshot manuel : ${updated} match(s) cote(s).`);
  if (unmatchedSoon.length > 0) {
    console.log(`Non apparies (imminents) : ${unmatchedSoon.join(", ")}`);
  }
  await prisma.$disconnect();
}

main();
