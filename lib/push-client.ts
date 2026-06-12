// ─────────────────────────────────────────────
// Abonnement push côté CLIENT (navigateur).
// Partagé par le toggle du profil et l'enrôlement automatique.
// ─────────────────────────────────────────────

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Le navigateur supporte-t-il le push (et la clé VAPID est-elle fournie) ? */
export function pushSupported(vapidKey: string): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    !!vapidKey
  );
}

/**
 * Garantit un abonnement push actif et enregistré côté serveur.
 * Pré-requis : permission notifications déjà accordée.
 * Idempotent — réutilise l'abonnement existant s'il y en a un.
 */
export async function ensurePushSubscription(vapidKey: string): Promise<void> {
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    }));
  // Ré-enregistre systématiquement : rattache l'endpoint au compte connecté
  // (utile après une reconnexion ou un changement de compte sur l'appareil).
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub),
  });
  if (!res.ok) throw new Error("Échec de l'enregistrement.");
}

/** Demande la permission (geste utilisateur requis) puis s'abonne. */
export async function requestAndSubscribe(vapidKey: string): Promise<void> {
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Notifications refusées.");
  await ensurePushSubscription(vapidKey);
}

/** Désabonne l'appareil et supprime l'endpoint côté serveur. */
export async function unsubscribePush(): Promise<void> {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  await fetch("/api/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  });
  await sub.unsubscribe();
}
