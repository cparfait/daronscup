"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type Props = {
  /** Date de coup d'envoi (ISO ou Date). */
  target: string | Date;
  className?: string;
};

function diff(target: Date) {
  const ms = Math.max(0, target.getTime() - Date.now());
  return {
    total: ms,
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor((ms / 3_600_000) % 24),
    minutes: Math.floor((ms / 60_000) % 60),
    seconds: Math.floor((ms / 1000) % 60),
  };
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span
        key={value}
        className="animate-[pop_0.3s_ease-out] font-[family-name:var(--font-display)] text-base font-bold tabular-nums text-[var(--color-cream)]"
      >
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[9px] uppercase tracking-widest text-[var(--color-muted)]">
        {label}
      </span>
    </div>
  );
}

export function CountdownTimer({ target, className }: Props) {
  const router = useRouter();
  const targetDate = useMemo(
    () => (typeof target === "string" ? new Date(target) : target),
    [target]
  );
  const [time, setTime] = useState(() => diff(targetDate));
  // true seulement si le compte à rebours était encore actif au montage :
  // on ne rafraîchit qu'au PASSAGE à zéro, pas pour un match déjà commencé.
  const wasRunning = useRef(time.total > 0);

  useEffect(() => {
    const t = setInterval(() => setTime(diff(targetDate)), 1000);
    return () => clearInterval(t);
  }, [targetDate]);

  useEffect(() => {
    if (time.total <= 0 && wasRunning.current) {
      wasRunning.current = false;
      // Re-rend la page côté serveur : verrouille le formulaire et révèle les
      // pronos des autres joueurs au coup d'envoi, sans rechargement manuel.
      router.refresh();
    }
  }, [time.total, router]);

  if (time.total <= 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-[var(--color-pitch)]/15 px-3 py-1 text-xs font-semibold text-[var(--color-pitch-bright)]",
          className
        )}
      >
        <span className="size-2 animate-pulse rounded-full bg-[var(--color-pitch-bright)]" />
        Coup d&apos;envoi donné
      </span>
    );
  }

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {time.days > 0 && <Unit value={time.days} label="j" />}
      <Unit value={time.hours} label="h" />
      <span className="mb-3 text-sm font-bold text-[var(--color-muted)]">:</span>
      <Unit value={time.minutes} label="min" />
      <span className="mb-3 text-sm font-bold text-[var(--color-muted)]">:</span>
      <Unit value={time.seconds} label="sec" />
    </div>
  );
}
