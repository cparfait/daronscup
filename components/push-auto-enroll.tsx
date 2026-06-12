"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import {
  pushSupported,
  ensurePushSubscription,
  requestAndSubscribe,
} from "@/lib/push-client";

const DISMISS_KEY = "daronsfc-push-prompt-dismissed";

/**
 * Notifications « activées par défaut » :
 *  • permission déjà accordée → ré-abonnement SILENCIEUX (couvre nouvel
 *    appareil, abonnement expiré, changement de compte) ;
 *  • permission jamais demandée → bandeau d'invitation en un tap (le
 *    navigateur exige un geste utilisateur pour demander la permission) ;
 *  • permission refusée ou bandeau fermé → on ne montre plus rien.
 */
export function PushAutoEnroll({ vapidKey }: { vapidKey: string }) {
  const [prompt, setPrompt] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pushSupported(vapidKey)) return;

    if (Notification.permission === "granted") {
      // Activation par défaut : on garantit l'abonnement sans rien demander.
      ensurePushSubscription(vapidKey).catch(() => {});
      return;
    }
    if (
      Notification.permission === "default" &&
      !localStorage.getItem(DISMISS_KEY)
    ) {
      setPrompt(true);
    }
  }, [vapidKey]);

  if (!prompt) return null;

  const enable = async () => {
    setBusy(true);
    try {
      await requestAndSubscribe(vapidKey);
      setPrompt(false);
    } catch {
      // Refusé : on n'insistera pas.
      localStorage.setItem(DISMISS_KEY, "1");
      setPrompt(false);
    } finally {
      setBusy(false);
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setPrompt(false);
  };

  return (
    <div className="mb-4 flex items-center gap-3 rounded-2xl border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/[0.06] p-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-gold)]/15">
        <Bell className="size-4 text-[var(--color-gold)]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--color-cream)]">
          Active les notifications
        </p>
        <p className="text-xs text-[var(--color-muted)]">
          Résultats, points gagnés et messages du groupe.
        </p>
      </div>
      <button
        type="button"
        onClick={enable}
        disabled={busy}
        className="shrink-0 rounded-xl bg-[var(--color-pitch)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-pitch-bright)] disabled:opacity-60"
      >
        {busy ? "…" : "Activer"}
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Plus tard"
        className="shrink-0 text-[var(--color-muted)] hover:text-[var(--color-cream)]"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
