"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Drapeau d'une nation, rendu en image servie en local (public/flags) avec
 * repli flagcdn.com — compatible PC, iOS et Android (contrairement aux emojis
 * drapeaux, non rendus sous Windows). Pré-télécharger via `npm run flags`.
 *
 * `code` est un code flagcdn (ex. "fr", "gb-eng"). Vide → drapeau neutre.
 * La taille se contrôle via `className` (ex. "h-6 w-8").
 *
 * `team` (optionnel) : nom de l'équipe. Si fourni, le drapeau devient cliquable
 * et mène à son classement de poule (`/standings?team=…`).
 *
 * Robustesse iOS/PWA : si le CDN échoue (réseau mobile capricieux), on
 * re-tente automatiquement la requête au lieu de laisser un drapeau vide qui
 * ne revenait qu'en changeant de menu. On évite aussi `loading="lazy"`, peu
 * fiable sous Safari iOS dans les conteneurs qui défilent.
 */
export function Flag({
  code,
  className,
  team,
}: {
  code: string;
  className?: string;
  team?: string;
}) {
  const base = "inline-block shrink-0 rounded-[3px] object-cover";
  const [attempt, setAttempt] = useState(0);
  const router = useRouter();

  const img = !code ? (
    <span
      className={cn(base, "bg-[var(--color-surface-2)]", className)}
      aria-hidden
    />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={attempt}
      // Local d'abord (public/flags) pour éviter toute requête réseau ; repli
      // sur flagcdn.com si le fichier local manque (pré-téléchargement non
      // lancé ou code non couvert), avec cache-bust au 2e échec.
      src={
        attempt === 0
          ? `/flags/${code}.svg`
          : `https://flagcdn.com/${code}.svg${attempt > 1 ? `?retry=${attempt}` : ""}`
      }
      alt=""
      decoding="async"
      onError={() => {
        if (attempt < 2) setAttempt((a) => a + 1);
      }}
      className={cn(base, className)}
    />
  );

  // Drapeau cliquable → classement de poule de l'équipe. On utilise un span
  // navigable (et non un <Link>/<a>) car le drapeau est souvent rendu À
  // L'INTÉRIEUR d'un autre lien (carte de match) : imbriquer deux <a> est du
  // HTML invalide. preventDefault + stopPropagation neutralisent le lien parent.
  if (team) {
    const go = () =>
      router.push(`/standings?team=${encodeURIComponent(team)}`);
    return (
      <span
        role="link"
        tabIndex={0}
        aria-label={`Classement de ${team}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          go();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            go();
          }
        }}
        className="inline-flex shrink-0 cursor-pointer transition-transform hover:scale-110 active:scale-95"
      >
        {img}
      </span>
    );
  }

  return img;
}
