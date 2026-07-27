"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Sparkles, ChevronRight } from "lucide-react";

// Clé VERSIONNÉE : pour une future annonce, bumper en -v3 et réutiliser tel quel.
// v2 = lancement de la saison Ligue des Champions 2026/2027.
const DISMISS_KEY = "daronsfc-announce-season-v2";

/**
 * Annonce au lancement (modale sur le Hub) de la nouvelle saison.
 * - « Ne plus afficher » coché + bouton → masquée définitivement.
 * - Fermeture sans cocher (✕ / clic dehors / bouton) → revient au prochain
 *   lancement, ce qui « force » l'accusé de lecture.
 */
export function SeasonAnnouncement() {
  const [show, setShow] = useState(false);
  const [dontShow, setDontShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(DISMISS_KEY)) setShow(true);
  }, []);

  if (!show) return null;

  const close = (persist: boolean) => {
    if (persist) localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Nouvelle saison : la Ligue des Champions"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Fond assombri (clic = fermer pour cette fois) */}
      <button
        type="button"
        aria-label="Fermer"
        onClick={() => close(false)}
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
      />

      {/* Modale */}
      <div className="animate-scale-in relative w-full max-w-sm rounded-3xl border border-[var(--color-gold)]/40 bg-[var(--color-surface)] p-6 shadow-[0_0_30px_rgba(245,158,11,0.5),0_0_75px_rgba(245,158,11,0.25),0_20px_50px_rgba(0,0,0,0.75)]">
        <div className="mb-4 flex items-start justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-gold)]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-gold)]">
            <Sparkles className="size-3" /> Nouveau
          </span>
          <button
            type="button"
            onClick={() => close(false)}
            aria-label="Fermer"
            className="text-[var(--color-muted)] transition-colors hover:text-[var(--color-cream)]"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mb-1.5 text-center text-4xl">⭐</div>
        <h2 className="text-gradient-gold mb-3 text-center font-[family-name:var(--font-display)] text-2xl font-extrabold">
          La Coupe du Monde est finie,<br />place à la C1 ! 🎉
        </h2>

        <p className="mb-3 text-center text-sm leading-relaxed text-[var(--color-muted)]">
          Nouvelle saison :{" "}
          <strong className="text-[var(--color-cream)]">
            la Ligue des Champions 2026/2027
          </strong>
          . Dès que le{" "}
          <strong className="text-[var(--color-gold)]">tirage au sort</strong> de la
          phase de ligue sera fait, les 36 clubs et leur calendrier arriveront ici
          et tu pourras pronostiquer. Un peu de patience — ça arrive ! ⏳
        </p>

        <p className="mb-4 rounded-xl border border-[var(--color-gold)]/25 bg-[var(--color-gold)]/[0.06] px-3 py-2 text-center text-xs leading-relaxed text-[var(--color-muted)]">
          🗄️ Tout le monde repart à{" "}
          <strong className="text-[var(--color-cream)]">zéro point</strong> — la
          Coupe du Monde est rangée au musée, palmarès inclus (Profil → Les
          archives).
        </p>

        <Link
          href="/profile/scoring"
          onClick={() => close(false)}
          className="mb-4 flex items-center justify-center gap-1 text-sm font-semibold text-[var(--color-gold-bright)] hover:underline"
        >
          Comment ça marche ? <ChevronRight className="size-4" />
        </Link>

        <label className="mb-4 flex cursor-pointer items-center justify-center gap-2 text-xs text-[var(--color-muted)]">
          <input
            type="checkbox"
            checked={dontShow}
            onChange={(e) => setDontShow(e.target.checked)}
            className="size-4 rounded accent-[var(--color-gold)]"
          />
          Ne plus afficher ce message
        </label>

        <button
          type="button"
          onClick={() => close(dontShow)}
          className="w-full rounded-xl bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-bright)] px-4 py-3 font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-wide text-[#1a1206] transition-transform hover:scale-[1.02]"
        >
          C&apos;est parti ! 🚀
        </button>
      </div>
    </div>
  );
}
