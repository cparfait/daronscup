import { cn } from "@/lib/utils";

/**
 * Drapeau d'une nation, rendu en image (flagcdn.com) — compatible PC, iOS et
 * Android (contrairement aux emojis drapeaux, non rendus sous Windows).
 *
 * `code` est un code flagcdn (ex. "fr", "gb-eng"). Vide → drapeau neutre.
 * La taille se contrôle via `className` (ex. "h-6 w-8").
 */
export function Flag({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  const base = "inline-block shrink-0 rounded-[3px] object-cover";

  if (!code) {
    return (
      <span
        className={cn(base, "bg-[var(--color-surface-2)]", className)}
        aria-hidden
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/${code}.svg`}
      alt=""
      loading="lazy"
      className={cn(base, className)}
    />
  );
}
