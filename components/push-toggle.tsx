"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import {
  pushSupported,
  requestAndSubscribe,
  unsubscribePush,
} from "@/lib/push-client";

/** Toggle d'activation des notifications push. `vapidKey` vient du serveur. */
export function PushToggle({ vapidKey }: { vapidKey: string }) {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ok = pushSupported(vapidKey);
    setSupported(ok);
    if (!ok) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setEnabled(!!sub))
      .catch(() => {});
  }, [vapidKey]);

  if (!supported) return null;

  const enable = async () => {
    setBusy(true);
    setError(null);
    try {
      await requestAndSubscribe(vapidKey);
      setEnabled(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setError(null);
    try {
      await unsubscribePush();
      setEnabled(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={enabled ? disable : enable}
      disabled={busy}
      className="glass flex w-full items-center gap-3 rounded-2xl border border-[var(--color-border-subtle)] px-4 py-3 text-sm font-medium transition-all duration-200 hover:border-[var(--color-pitch)]/40 disabled:opacity-60"
    >
      {busy ? (
        <Loader2 className="size-4 shrink-0 animate-spin text-[var(--color-muted)]" />
      ) : enabled ? (
        <Bell className="size-4 shrink-0 text-[var(--color-pitch-bright)]" />
      ) : (
        <BellOff className="size-4 shrink-0 text-[var(--color-muted)]" />
      )}
      <span className="flex-1 text-left">
        {enabled ? "Notifications activées" : "Activer les notifications"}
        {error && <span className="block text-xs text-red-400">{error}</span>}
      </span>
      <span
        className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${
          enabled ? "bg-[var(--color-pitch)]" : "bg-[var(--color-border-subtle)]"
        }`}
      >
        <span
          className={`size-5 rounded-full bg-white transition-transform ${
            enabled ? "translate-x-5" : ""
          }`}
        />
      </span>
    </button>
  );
}
