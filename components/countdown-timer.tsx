"use client";

import { useEffect, useMemo, useState } from "react";
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
  const targetDate = useMemo(
    () => (typeof target === "string" ? new Date(target) : target),
    [target]
  );
  const [time, setTime] = useState(() => diff(targetDate));

  useEffect(() => {
    const t = setInterval(() => setTime(diff(targetDate)), 1000);
    return () => clearInterval(t);
  }, [targetDate]);

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
