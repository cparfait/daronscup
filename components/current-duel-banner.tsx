import Link from "next/link";
import { Swords, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { CurrentDuel } from "@/lib/fun";

/**
 * Rappel du duel de la journée en cours, en tête de l'onglet « Matchs ».
 *
 * Les duels vivent sinon dans Profil → Duels & rivalités, où personne ne pense
 * à aller AVANT de pronostiquer. L'afficher ici met l'adversaire sous les yeux
 * au seul moment où ça peut encore changer quelque chose.
 */
export function CurrentDuelBanner({ duel }: { duel: CurrentDuel }) {
  const diff = duel.mine - duel.theirs;
  // Libellés volontairement courts : la colonne de droite doit rester étroite,
  // sinon le pseudo de l'adversaire se fait tronquer sur un écran de téléphone.
  // Le sens complet est porté par `title` pour les lecteurs d'écran.
  const state = duel.notStarted
    ? { short: "à venir", long: "Journée pas encore commencée", tone: "muted" as const }
    : diff > 0
      ? { short: `+${diff}`, long: `Tu mènes de ${diff}`, tone: "good" as const }
      : diff < 0
        ? { short: `${diff}`, long: `Tu es mené de ${-diff}`, tone: "bad" as const }
        : { short: "égalité", long: "À égalité", tone: "muted" as const };

  const toneClass =
    state.tone === "good"
      ? "text-[var(--color-pitch-bright)]"
      : state.tone === "bad"
        ? "text-[var(--color-danger)]"
        : "text-[var(--color-muted)]";

  return (
    <Link href="/profile/rivals" className="mb-4 block">
      <Card className="glass card-hover flex items-center gap-3 p-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-2)]">
          <Swords className="size-4 text-[var(--color-muted)]" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Duel · {duel.label}
          </p>
          <p className="truncate text-sm font-bold text-[var(--color-cream)]">
            Tu affrontes {duel.opponent.name}
          </p>
        </div>

        <div className="shrink-0 text-right" title={state.long}>
          <p className="font-[family-name:var(--font-display)] text-sm font-bold tabular-nums text-[var(--color-cream)]">
            {duel.mine}
            <span className="mx-0.5 text-[var(--color-muted)]">–</span>
            {duel.theirs}
          </p>
          <p className={`text-[10px] font-semibold ${toneClass}`}>{state.short}</p>
        </div>

        <ChevronRight className="size-4 shrink-0 text-[var(--color-muted)]" />
      </Card>
    </Link>
  );
}
