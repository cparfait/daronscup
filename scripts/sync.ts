/**
 * Synchronisation des matchs (et scores) depuis football-data.org vers la base.
 * Usage : `npm run sync`
 *
 * Pratique pour peupler / rafraîchir sans passer par l'auth HTTP (POST /api/sync).
 * À rejouer pendant le tournoi pour récupérer les résultats au fil des matchs.
 */
import { syncMatches } from "../lib/football-data";

syncMatches()
  .then((r) => {
    console.log(`✅ Synchro terminée : ${r.matches} matchs, ${r.results} résultats.`);
    process.exit(0);
  })
  .catch((e) => {
    console.error("❌ Échec synchro :", e instanceof Error ? e.message : e);
    process.exit(1);
  });
