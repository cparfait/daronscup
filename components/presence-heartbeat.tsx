"use client";

import { useEffect } from "react";

const PING_INTERVAL_MS = 60_000;

/**
 * Signale la présence de l'utilisateur : ping `/api/presence` au montage, puis
 * toutes les 60 s tant que l'onglet est visible, et à chaque retour au premier
 * plan. Sans rendu. Monté dans le layout de l'app.
 */
export function PresenceHeartbeat() {
  useEffect(() => {
    const ping = () => {
      if (document.visibilityState !== "visible") return;
      fetch("/api/presence", { method: "POST" }).catch(() => {});
    };

    ping();
    const id = setInterval(ping, PING_INTERVAL_MS);
    document.addEventListener("visibilitychange", ping);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", ping);
    };
  }, []);

  return null;
}
