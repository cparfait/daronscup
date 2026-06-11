import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Fusionne des classes Tailwind sans conflit (helper shadcn/ui). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formate une date de coup d'envoi en français (ex. "lun. 12 juin, 18:00"). */
export function formatKickoff(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** Clé de jour (YYYY-MM-DD) pour grouper les matchs par date. */
export function dayKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

/** Libellé lisible d'un jour (ex. "Aujourd'hui", "Demain", "ven. 14 juin"). */
export function dayLabel(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const today = dayKey(new Date());
  const tomorrow = dayKey(new Date(Date.now() + 86_400_000));
  const key = dayKey(d);
  if (key === today) return "Aujourd'hui";
  if (key === tomorrow) return "Demain";
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}
