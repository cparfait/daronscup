"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, Loader2, X } from "lucide-react";

/**
 * Bandeau permanent affiché à un admin en mode APERÇU : il consulte alors une
 * saison de test que personne d'autre ne voit. Sans ce rappel, on oublie qu'on
 * regarde des données fictives et on s'inquiète pour rien.
 *
 * Le bouton quitte l'aperçu sans rien supprimer (le jeu reste en base).
 */
export function PreviewBanner({ seasonName }: { seasonName: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const leave = () =>
    start(async () => {
      try {
        await fetch("/api/admin/test-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "preview", on: false }),
        });
        router.refresh();
      } catch {
        /* best-effort : le bandeau reste, on peut réessayer */
      }
    });

  return (
    <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-[var(--color-gold)]/50 bg-[var(--color-gold)]/[0.1] px-3 py-2.5">
      <FlaskConical className="size-4 shrink-0 text-[var(--color-gold)]" />
      <p className="min-w-0 flex-1 text-xs leading-snug text-[var(--color-cream)]">
        <strong>Mode aperçu</strong> — tu consultes «&nbsp;{seasonName}&nbsp;».
        Ces données sont fictives et invisibles des autres joueurs.
      </p>
      <button
        type="button"
        onClick={leave}
        disabled={pending}
        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--color-gold)]/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-gold)] transition-colors hover:bg-[var(--color-gold)]/30 disabled:opacity-50"
      >
        {pending ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3" />}
        Quitter
      </button>
    </div>
  );
}
