// ─────────────────────────────────────────────
// Présence « en ligne » — basée sur le dernier heartbeat (`User.lastSeenAt`).
// Le client ping `/api/presence` périodiquement ; on considère « en ligne »
// tout joueur actif dans la fenêtre ci-dessous.
// ─────────────────────────────────────────────

/** Fenêtre « en ligne » : actif dans les 5 dernières minutes. */
export const ONLINE_WINDOW_MS = 5 * 60_000;
