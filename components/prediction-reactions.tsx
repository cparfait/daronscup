"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SmilePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactionTally } from "@/lib/data/matches";

/**
 * Barre de réactions emoji sur le pronostic d'un joueur. N'apparaît qu'après le
 * coup d'envoi (les pronos sont cachés avant — cf. l'anti-influence côté API).
 *
 * Optimiste : la réaction s'affiche immédiatement puis on rafraîchit. En cas
 * d'échec serveur on revient à l'état d'origine.
 */
const PALETTE = ["😂", "🤡", "🔥", "💀", "🤝", "😱"] as const;

export function PredictionReactions({
  predictionId,
  reactions,
  readOnly = false,
}: {
  predictionId: string;
  reactions: ReactionTally[];
  /** Lecture seule : admin consultant un groupe dont il n'est pas membre. */
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [local, setLocal] = useState<ReactionTally[]>(reactions);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);

  const toggle = (emoji: string) => {
    if (readOnly) return;
    const before = local;

    // Bascule optimiste.
    setLocal((prev) => {
      const found = prev.find((r) => r.emoji === emoji);
      if (!found) return [...prev, { emoji, count: 1, reacted: true }];
      const count = found.count + (found.reacted ? -1 : 1);
      if (count <= 0) return prev.filter((r) => r.emoji !== emoji);
      return prev.map((r) =>
        r.emoji === emoji ? { ...r, count, reacted: !r.reacted } : r
      );
    });
    setOpen(false);
    setError(false);

    start(async () => {
      try {
        const res = await fetch("/api/predictions/react", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ predictionId, emoji }),
        });
        if (!res.ok) throw new Error("échec");
        router.refresh();
      } catch {
        setLocal(before);
        setError(true);
      }
    });
  };

  // Rien à montrer et rien à faire : on n'encombre pas la carte.
  if (readOnly && local.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {local.map((r) => (
        <button
          key={r.emoji}
          type="button"
          disabled={readOnly || pending}
          onClick={() => toggle(r.emoji)}
          aria-label={`${r.emoji} (${r.count})`}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
            r.reacted
              ? "border-[var(--color-pitch-bright)]/50 bg-[var(--color-pitch)]/15"
              : "border-[var(--color-border-subtle)] bg-[var(--color-surface-2)]",
            readOnly ? "cursor-default" : "hover:bg-[var(--color-surface-3)]"
          )}
        >
          <span className="leading-none">{r.emoji}</span>
          <span className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--color-muted)]">
            {r.count}
          </span>
        </button>
      ))}

      {!readOnly && (
        <div className="relative">
          <button
            type="button"
            disabled={pending}
            onClick={() => setOpen((o) => !o)}
            aria-label="Ajouter une réaction"
            className="inline-flex size-6 items-center justify-center rounded-full border border-[var(--color-border-subtle)] text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-3)] hover:text-[var(--color-cream)]"
          >
            <SmilePlus className="size-3.5" />
          </button>

          {open && (
            <div className="absolute bottom-full left-0 z-20 mb-1.5 flex gap-1 rounded-full border border-[var(--color-border-medium)] bg-[var(--color-surface)] px-2 py-1.5 shadow-xl">
              {PALETTE.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => toggle(e)}
                  aria-label={e}
                  className="text-base leading-none transition-transform hover:scale-125"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <span className="text-[10px] text-red-400">réaction non enregistrée</span>
      )}
    </div>
  );
}
