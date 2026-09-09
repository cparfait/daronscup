import Link from "next/link";
import Image from "next/image";
import { Swords, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CurrentDuel } from "@/lib/fun";

/**
 * Le duel de la journée en cours, mis en avant.
 *
 * Les duels vivent sinon dans Profil → Duels & rivalités, où personne ne pense
 * à aller AVANT de pronostiquer : personne ne les voyait. On les affiche donc
 * là où le joueur passe vraiment — le Hub (`hero`) et l'onglet Matchs
 * (`compact`, au-dessus des affiches, au seul moment où ça peut encore changer
 * quelque chose).
 */
export function DuelCard({
  duel,
  variant = "hero",
  href = "/profile/rivals",
}: {
  duel: CurrentDuel;
  variant?: "hero" | "compact";
  /** Destination au clic ; `null` sur la page Duels elle-même. */
  href?: string | null;
}) {
  const diff = duel.mine - duel.theirs;
  // Libellés volontairement courts : sur un écran de téléphone, la colonne de
  // droite doit rester étroite, sinon le pseudo de l'adversaire se fait
  // tronquer. Le sens complet est porté par `title` pour les lecteurs d'écran.
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

  const played = duel.record.wins + duel.record.draws + duel.record.losses;

  // Sur la page Duels elle-même, la carte n'a nulle part où mener : on retire
  // le lien plutôt que de renvoyer sur la page courante.
  const Frame = ({ className, children }: { className: string; children: React.ReactNode }) =>
    href ? (
      <Link href={href} className={className}>
        {children}
      </Link>
    ) : (
      <div className={className}>{children}</div>
    );

  if (variant === "compact") {
    return (
      <Frame className="mb-4 block">
        <Card className="glass card-hover flex items-center gap-3 border-[var(--color-gold)]/30 bg-[var(--color-gold)]/[0.05] p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-gold)]/15">
            <Swords className="size-4 text-[var(--color-gold)]" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-gold)]">
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

          {href && (
            <ChevronRight className="size-4 shrink-0 text-[var(--color-muted)]" />
          )}
        </Card>
      </Frame>
    );
  }

  return (
    <Frame className="block">
      <Card
        className={cn(
          "glass-strong relative overflow-hidden border-[var(--color-gold)]/30 p-0",
          href && "transition-all duration-300 hover:scale-[1.01]"
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--color-gold)]/10 via-transparent to-[var(--color-danger)]/10" />

        <div className="relative p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-xs text-[var(--color-muted)]">
              <Swords className="size-3.5 text-[var(--color-gold)]" />
              {duel.label}
            </span>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
                state.tone === "good" && "bg-[var(--color-pitch)]/15 text-[var(--color-pitch-bright)]",
                state.tone === "bad" && "bg-[var(--color-danger)]/15 text-[var(--color-danger)]",
                state.tone === "muted" && "bg-[var(--color-surface-2)] text-[var(--color-muted)]"
              )}
              title={state.long}
            >
              {duel.notStarted ? "À venir" : state.long}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Face name={duel.me.name} image={duel.me.image} label="Toi" />

            <div className="shrink-0 text-center">
              <p className="font-[family-name:var(--font-display)] text-3xl font-extrabold tabular-nums text-[var(--color-cream)]">
                {duel.mine}
                <span className="mx-1.5 text-[var(--color-muted)]">–</span>
                {duel.theirs}
              </p>
              <p className="mt-0.5 text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
                {duel.notStarted ? "Pas commencé" : "Points de la journée"}
              </p>
            </div>

            <Face name={duel.opponent.name} image={duel.opponent.image} label="Adversaire" />
          </div>

          <div className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--color-border-subtle)] pt-3">
            <p className="min-w-0 flex-1 truncate text-xs text-[var(--color-muted)]">
              {played > 0 ? (
                <>
                  Face à {duel.opponent.name.split(" ")[0]} :{" "}
                  <strong className="text-[#22c55e]">{duel.record.wins}V</strong>{" "}
                  <strong className="text-[var(--color-cream)]">
                    {duel.record.draws}N
                  </strong>{" "}
                  <strong className="text-[var(--color-danger)]">
                    {duel.record.losses}D
                  </strong>
                </>
              ) : (
                "Premier duel entre vous deux."
              )}
            </p>
            {href && (
              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--color-gold)]">
                Mes duels
                <ChevronRight className="size-3.5" />
              </span>
            )}
          </div>
        </div>
      </Card>
    </Frame>
  );
}

/** Un visage du face-à-face : avatar (ou initiale) + prénom. */
function Face({
  name,
  image,
  label,
}: {
  name: string;
  image?: string | null;
  label: string;
}) {
  const firstName = name.split(" ")[0] ?? name;

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
      {image ? (
        <Image
          src={image}
          alt=""
          width={48}
          height={48}
          className="size-12 rounded-full object-cover ring-2 ring-[var(--color-gold)]/30"
        />
      ) : (
        <span className="flex size-12 items-center justify-center rounded-full bg-[var(--color-surface-2)] font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-cream)] ring-2 ring-[var(--color-gold)]/30">
          {firstName.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="w-full truncate font-[family-name:var(--font-display)] text-sm font-bold text-[var(--color-cream)]">
        {firstName}
      </span>
      <span className="text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
        {label}
      </span>
    </div>
  );
}
