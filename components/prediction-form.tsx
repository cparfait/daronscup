"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Lock } from "lucide-react";
import { Button } from "./ui/button";
import { Flag } from "./flag";
import { cn } from "@/lib/utils";

type Props = {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  kickoffAt: string;
  locked: boolean; // calculé côté serveur (kickoff passé)
  initial?: { homeScore: number; awayScore: number; joker: boolean; comment?: string };
  jokersLeft: number; // jokers restants dans la phase (hors ce match)
  jokerBudget: number; // budget total de la phase (4 poules / 2 finale)
};

function Stepper({
  label,
  flag,
  value,
  onChange,
  disabled,
}: {
  label: string;
  flag: string;
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      <Flag code={flag} className="h-7 w-10" />
      <span className="max-w-24 truncate text-xs text-[var(--color-muted)]">
        {label}
      </span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`Moins ${label}`}
          disabled={disabled || value <= 0}
          onClick={() => onChange(Math.max(0, value - 1))}
          className="flex size-9 items-center justify-center rounded-full bg-[var(--color-surface-2)] disabled:opacity-30"
        >
          <Minus className="size-4" />
        </button>
        <span className="w-8 text-center font-[family-name:var(--font-display)] text-4xl font-bold tabular-nums">
          {value}
        </span>
        <button
          type="button"
          aria-label={`Plus ${label}`}
          disabled={disabled || value >= 20}
          onClick={() => onChange(Math.min(20, value + 1))}
          className="flex size-9 items-center justify-center rounded-full bg-[var(--color-surface-2)] disabled:opacity-30"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function PredictionForm(props: Props) {
  const router = useRouter();
  const { locked, initial, jokersLeft, jokerBudget } = props;
  const [home, setHome] = useState(initial?.homeScore ?? 0);
  const [away, setAway] = useState(initial?.awayScore ?? 0);
  const [joker, setJoker] = useState(initial?.joker ?? false);
  // On peut activer le joker s'il en reste, ou s'il est déjà posé sur ce match.
  const canUseJoker = jokersLeft > 0 || joker;
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    setStatus("saving");
    setMessage(null);
    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: props.matchId,
          homeScore: home,
          awayScore: away,
          joker,
          comment: comment.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Échec de l'enregistrement.");
      }
      setStatus("saved");
      setMessage("Pronostic verrouillé ✅");
      router.refresh();
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Erreur inconnue.");
    }
  }

  if (locked) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-muted)]">
        <Lock className="size-4" />
        Pronostics fermés — le coup d&apos;envoi est passé.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4">
      <div className="flex items-start gap-2">
        <Stepper
          label={props.homeTeam}
          flag={props.homeFlag}
          value={home}
          onChange={setHome}
          disabled={status === "saving"}
        />
        <span className="self-center pt-8 font-[family-name:var(--font-display)] text-2xl text-[var(--color-muted)]">
          –
        </span>
        <Stepper
          label={props.awayTeam}
          flag={props.awayFlag}
          value={away}
          onChange={setAway}
          disabled={status === "saving"}
        />
      </div>

      {/* Joker */}
      <button
        type="button"
        disabled={!canUseJoker || status === "saving"}
        onClick={() => setJoker((j) => !j)}
        className={cn(
          "mt-5 flex w-full items-center justify-between rounded-xl border px-4 py-3 transition-colors",
          joker
            ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10"
            : "border-[var(--color-border-subtle)] bg-[var(--color-surface-2)]",
          !canUseJoker && "cursor-not-allowed opacity-50"
        )}
      >
        <span className="flex flex-col items-start gap-0.5 text-left">
          <span className="flex items-center gap-2 text-sm font-medium">
            🃏 Activer le Joker
            <span className="text-xs text-[var(--color-muted)]">(points ×2)</span>
          </span>
          <span className="text-xs text-[var(--color-muted)]">
            {canUseJoker
              ? `${jokersLeft} joker${jokersLeft > 1 ? "s" : ""} restant${jokersLeft > 1 ? "s" : ""} sur ${jokerBudget} pour cette phase`
              : "Budget de jokers épuisé pour cette phase"}
          </span>
        </span>
        <span
          className={cn(
            "flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors",
            joker ? "bg-[var(--color-gold)]" : "bg-[var(--color-border-subtle)]"
          )}
        >
          <span
            className={cn(
              "size-5 rounded-full bg-white transition-transform",
              joker && "translate-x-5"
            )}
          />
        </span>
      </button>

      {/* Commentaire (visible après coup d'envoi) */}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={280}
        placeholder="Un petit tacle pour tes potes ? (visible après le coup d'envoi)"
        className="mt-4 h-20 w-full resize-none rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] p-3 text-sm outline-none focus:border-[var(--color-pitch)]"
      />

      <Button
        onClick={submit}
        disabled={status === "saving"}
        size="lg"
        className="mt-4 w-full"
      >
        {status === "saving"
          ? "Enregistrement…"
          : initial
            ? "Modifier mon prono"
            : "Valider mon prono"}
      </Button>

      {message && (
        <p
          className={cn(
            "mt-3 text-center text-sm",
            status === "error" ? "text-red-400" : "text-[var(--color-pitch-bright)]"
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}
