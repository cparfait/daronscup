"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

// v2 : le contenu change avec le format de la compétition (aller-retour en C1),
// on redemande donc l'affichage une fois.
const SEEN_KEY = "knockout-info-v2-seen";

export function KnockoutInfoModal({
  hasKnockout,
  twoLegged = false,
}: {
  hasKnockout: boolean;
  /** Tours en aller-retour (Ligue des Champions) → règles différentes. */
  twoLegged?: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!hasKnockout) return;
    if (!localStorage.getItem(SEEN_KEY)) setOpen(true);
  }, [hasKnockout]);

  function close() {
    localStorage.setItem(SEEN_KEY, "1");
    setOpen(false);
  }

  if (!hasKnockout) return null;

  return (
    <>
      {/* Bouton "?" dans le header */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Règles des éliminatoires"
        className="flex size-8 items-center justify-center rounded-full border border-[var(--color-pitch)]/40 bg-[var(--color-pitch)]/10 font-[family-name:var(--font-display)] text-sm font-bold text-[var(--color-pitch-bright)] transition-colors hover:bg-[var(--color-pitch)]/20"
      >
        ?
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={close}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-[var(--color-pitch)]/30 bg-[var(--color-surface)] p-5 shadow-2xl">
            <button
              onClick={close}
              className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-[var(--color-muted)] transition-colors hover:text-[var(--color-cream)]"
            >
              <X className="size-3.5" />
            </button>

            <p className="pr-8 font-[family-name:var(--font-display)] text-base font-bold text-[var(--color-cream)]">
              🏆 Phase à élimination directe
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">
              comment ça marche ?
            </p>

            <ul className="mt-4 space-y-3 text-sm text-[var(--color-muted)]">
              <li className="flex items-start gap-2">
                <span className="shrink-0">⚽</span>
                {twoLegged ? (
                  <span>
                    <span className="font-semibold text-[var(--color-cream)]">
                      Aller-retour.
                    </span>{" "}
                    Chaque tour se joue en deux manches (sauf la finale) : tu
                    pronostiques <strong>chaque match</strong>, et c&apos;est le
                    score cumulé qui qualifie.
                  </span>
                ) : (
                  <span>
                    <span className="font-semibold text-[var(--color-cream)]">
                      Un match, une vie.
                    </span>{" "}
                    Pas de deuxième chance : le perdant est éliminé.
                  </span>
                )}
              </li>
              <li className="flex items-start gap-2">
                <span className="shrink-0">📊</span>
                <span>
                  <span className="font-semibold text-[var(--color-cream)]">
                    Le barème ne change pas
                  </span>{" "}
                  : score exact × 2, bonne différence +1, bon résultat = R pts
                  (selon les cotes).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="shrink-0">🎯</span>
                {twoLegged ? (
                  <span>
                    <span className="font-semibold text-[var(--color-cream)]">
                      Un nul, c&apos;est normal.
                    </span>{" "}
                    Sur une manche, le nul est un résultat comme un autre : pas
                    de tirs au but à deviner. Sauf en <strong>finale</strong>,
                    match sec — là, désigne le vainqueur aux tirs (bonus R + 2).
                  </span>
                ) : (
                  <span>
                    <span className="font-semibold text-[var(--color-cream)]">
                      Nul après 90 min ?
                    </span>{" "}
                    Désigne le vainqueur aux tirs au but — bonne pioche = bonus
                    R + 2 pts !
                  </span>
                )}
              </li>
              <li className="flex items-start gap-2">
                <span className="shrink-0">⚠️</span>
                <span>
                  <span className="font-semibold text-[var(--color-cream)]">
                    Pas encore choisi ton champion ?
                  </span>{" "}
                  C&apos;est jusqu&apos;au coup d&apos;envoi du premier match à
                  élimination directe — après il sera trop tard !
                </span>
              </li>
            </ul>

            <button
              onClick={close}
              className="mt-5 w-full rounded-xl bg-[var(--color-pitch)] py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              J&apos;ai compris !
            </button>
          </div>
        </div>
      )}
    </>
  );
}
