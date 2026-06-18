"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trophy, ChevronRight, Lock, X, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Flag } from "@/components/flag";

type Team = { team: string; flag: string };

/**
 * Carte « pari vainqueur du tournoi » sur le dashboard.
 * - Pas de pari + paris ouverts → invite + sélecteur (choix définitif).
 * - Pari fait → affichage verrouillé (n'invite plus).
 * - Paris fermés sans pari → rien.
 */
export function ChampionPickCard({
  pick,
  teams,
  open,
}: {
  pick: Team | null;
  teams: Team[];
  open: boolean;
}) {
  const router = useRouter();
  const [picking, setPicking] = useState(false);
  const [pending, setPending] = useState<Team | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Déjà choisi → état verrouillé, plus d'invitation. Cliquable : mène à la
  // page listant les champions pariés par tout le groupe.
  if (pick) {
    return (
      <Link href="/champions" className="block">
        <Card className="glass card-hover mb-6 flex items-center gap-3 border-[var(--color-gold)]/25 bg-[var(--color-gold)]/[0.04] p-4">
          <Trophy className="size-5 shrink-0 text-[var(--color-gold)]" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              Ton champion du tournoi
            </p>
            <p className="flex items-center gap-2 font-[family-name:var(--font-display)] text-base font-bold text-[var(--color-cream)]">
              <Flag code={pick.flag} team={pick.team} className="h-4 w-6" />
              {pick.team}
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--color-gold)]/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-gold)]">
            <Lock className="size-3" />
            +50 si vainqueur
          </span>
          <ChevronRight className="size-4 shrink-0 text-[var(--color-muted)]" />
        </Card>
      </Link>
    );
  }

  // Paris fermés et aucun choix : on n'affiche rien.
  if (!open) return null;

  async function confirm() {
    if (!pending) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/champion-pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team: pending.team, flag: pending.flag }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Échec de l'enregistrement.");
        setSaving(false);
        return;
      }
      // Verrouillé : on rafraîchit pour afficher l'état définitif.
      router.refresh();
    } catch {
      setError("Réseau indisponible, réessaie.");
      setSaving(false);
    }
  }

  return (
    <Card className="glass mb-6 overflow-hidden border-[var(--color-gold)]/25 bg-[var(--color-gold)]/[0.04] p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-pitch)]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-pitch-bright)]">
          <Sparkles className="size-3" />
          Nouveau
        </span>
      </div>
      <div className="flex items-start gap-3">
        <span className="text-2xl">🏆</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-[var(--color-cream)]">
            Qui sera champion du monde ?
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">
            Désigne ton vainqueur du tournoi et empoche{" "}
            <strong className="text-[var(--color-gold)]">+50 points bonus</strong>{" "}
            s&apos;il soulève la coupe. Attention :{" "}
            <strong className="text-[var(--color-cream)]">
              un seul choix, définitif
            </strong>{" "}
            — pas de retour en arrière !
          </p>
        </div>
      </div>

      {!picking ? (
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-bright)] px-4 py-2.5 font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-wide text-[#1a1206] transition-transform hover:scale-[1.02]"
        >
          Choisir mon champion
          <ChevronRight className="size-4" />
        </button>
      ) : (
        <div className="mt-3">
          {/* Sélecteur d'équipes */}
          <div className="mb-3 max-h-56 overflow-y-auto rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] p-1.5 scrollbar-thin">
            <div className="grid grid-cols-2 gap-1.5">
              {teams.map((t) => {
                const selected = pending?.team === t.team;
                return (
                  <button
                    key={t.team}
                    type="button"
                    onClick={() => setPending(t)}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                      selected
                        ? "bg-[var(--color-gold)]/20 text-[var(--color-cream)] ring-1 ring-[var(--color-gold)]/40"
                        : "hover:bg-[var(--color-surface-3)]"
                    }`}
                  >
                    <Flag code={t.flag} className="h-4 w-6 shrink-0" />
                    <span className="truncate">{t.team}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

          {/* Barre de confirmation */}
          {pending ? (
            <div className="flex items-center gap-2">
              <span className="flex flex-1 items-center gap-2 text-sm text-[var(--color-muted)]">
                Champion :
                <Flag code={pending.flag} team={pending.team} className="h-4 w-6" />
                <strong className="text-[var(--color-cream)]">{pending.team}</strong>
              </span>
              <button
                type="button"
                disabled={saving}
                onClick={confirm}
                className="shrink-0 rounded-lg bg-[var(--color-gold)] px-3 py-2 text-xs font-bold uppercase tracking-wide text-[#1a1206] disabled:opacity-50"
              >
                {saving ? "..." : "Valider (définitif)"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPicking(false)}
              className="flex items-center gap-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-cream)]"
            >
              <X className="size-3.5" />
              Annuler
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
