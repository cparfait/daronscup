/**
 * Hook de démarrage Next.js (exécuté une fois au lancement du serveur).
 *
 * Met en place la synchronisation AUTOMATIQUE des matchs/scores depuis
 * football-data.org à intervalle régulier — indépendamment de la navigation
 * des utilisateurs. Tourne dans le processus du serveur (runtime Node), donc
 * aucun conteneur cron ni endpoint exposé n'est nécessaire.
 *
 * Intervalle configurable via SYNC_INTERVAL_MINUTES (défaut : 3 min).
 * football-data.org (palier gratuit) = 10 req/min ; un sync = 1 requête, donc
 * 3 min laisse une large marge.
 */
export async function register() {
  // Ne s'exécute que côté serveur Node (pas en edge runtime).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const minutes = Math.max(1, Number(process.env.SYNC_INTERVAL_MINUTES ?? 3));
  const intervalMs = minutes * 60_000;

  const [{ maybeSyncMatches }, { maybeInit }] = await Promise.all([
    import("./lib/football-data"),
    import("./lib/init"),
  ]);

  // Démarrage : seed des badges + premier sync, après un court délai pour
  // laisser la base et la migration se stabiliser.
  setTimeout(() => {
    maybeInit().catch(() => {});
    maybeSyncMatches().catch(() => {});
  }, 8_000);

  // Sync périodique. maybeSyncMatches porte son propre debounce (2 min) :
  // comme l'intervalle est >= 3 min, le sync planifié passe toujours, et les
  // déclenchements liés à la navigation ne provoquent pas de double-appel.
  setInterval(() => {
    maybeSyncMatches().catch(() => {});
  }, intervalMs);

  console.log(`[instrumentation] auto-sync activé — toutes les ${minutes} min`);
}
