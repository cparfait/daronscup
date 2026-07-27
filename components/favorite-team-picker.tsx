"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Loader2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Flag } from "@/components/flag";
import { cn } from "@/lib/utils";

type Team = { team: string; flag: string };

/**
 * Choix du « club de cœur », affiché à côté du nom au classement.
 *
 * Contrairement au pari vainqueur, ce choix est purement décoratif et
 * MODIFIABLE à tout moment : il ne rapporte aucun point, il sert à afficher ses
 * couleurs (et à se faire chambrer quand son club perd).
 */
export function FavoriteTeamPicker({
  current,
  teams,
}: {
  current: Team | null;
  teams: Team[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(team: string | null) {
    setSaving(team ?? "__none__");
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favoriteTeam: team }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Échec de l'enregistrement.");
      }
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(null);
    }
  }

  // Aucune équipe connue (calendrier pas encore tiré au sort) → on n'affiche rien.
  if (teams.length === 0 && !current) return null;

  return (
    <Card className="glass mb-6 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Heart className="size-4 text-[var(--color-danger)]" />
        <h3 className="font-[family-name:var(--font-display)] text-base font-bold tracking-wide">
          Mon club de cœur
        </h3>
      </div>

      {current ? (
        <div className="flex items-center gap-3">
          <Flag code={current.flag} className="h-7 w-10 shrink-0" />
          <span className="min-w-0 flex-1 truncate font-medium text-[var(--color-cream)]">
            {current.team}
          </span>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="shrink-0 rounded-lg border border-[var(--color-border-subtle)] px-2.5 py-1.5 text-xs text-[var(--color-muted)] transition-colors hover:text-[var(--color-cream)]"
          >
            Changer
          </button>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm leading-relaxed text-[var(--color-muted)]">
            Affiche tes couleurs à côté de ton nom au classement. Aucun point en
            jeu — juste l&apos;honneur (et le chambrage quand il perd).
          </p>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="rounded-xl bg-[var(--color-surface-2)] px-4 py-2 text-sm font-semibold text-[var(--color-cream)] transition-colors hover:bg-[var(--color-surface-3)]"
          >
            Choisir mon club
          </button>
        </>
      )}

      {open && (
        <div className="mt-3">
          <div className="mb-2 max-h-56 overflow-y-auto rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] p-1.5 scrollbar-thin">
            <div className="grid grid-cols-2 gap-1.5">
              {teams.map((t) => {
                const selected = current?.team === t.team;
                return (
                  <button
                    key={t.team}
                    type="button"
                    disabled={saving !== null}
                    onClick={() => pick(t.team)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors disabled:opacity-50",
                      selected
                        ? "bg-[var(--color-danger)]/15 text-[var(--color-cream)] ring-1 ring-[var(--color-danger)]/40"
                        : "hover:bg-[var(--color-surface-3)]"
                    )}
                  >
                    {saving === t.team ? (
                      <Loader2 className="size-4 shrink-0 animate-spin" />
                    ) : (
                      <Flag code={t.flag} className="h-4 w-6 shrink-0" />
                    )}
                    <span className="truncate">{t.team}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {current && (
              <button
                type="button"
                disabled={saving !== null}
                onClick={() => pick(null)}
                className="text-xs text-[var(--color-muted)] underline hover:text-[var(--color-cream)]"
              >
                Retirer mon club
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ml-auto flex items-center gap-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-cream)]"
            >
              <X className="size-3.5" />
              Fermer
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </Card>
  );
}
