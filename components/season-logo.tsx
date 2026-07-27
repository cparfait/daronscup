import Image from "next/image";
import type { Season } from "@/lib/season";

/**
 * Emblème d'une saison : le logo de la compétition (`Season.logo`, servi depuis
 * `public/`) avec repli sur son emoji.
 *
 * Pour changer le visuel d'une saison, il suffit de déposer un fichier dans
 * `public/seasons/` et de renseigner `Season.logo` — aucun code à toucher. Le
 * fichier doit être **transparent** et lisible sur fond sombre (le thème de
 * l'app), donc un PNG/SVG à fond détouré, en clair ou en doré.
 */
export function SeasonLogo({
  season,
  size = 30,
  className,
}: {
  season: Pick<Season, "logo" | "emoji" | "shortName"> | null;
  size?: number;
  className?: string;
}) {
  if (!season) return null;

  if (season.logo) {
    return (
      <Image
        src={season.logo}
        alt={season.shortName}
        width={size}
        height={size}
        className={className ?? "inline-block object-contain"}
        style={{ height: size, width: "auto" }}
        // Emblème décoratif, présent au-dessus de la ligne de flottaison.
        priority
      />
    );
  }

  return (
    <span
      aria-hidden
      className={className ?? "inline-block"}
      style={{ fontSize: size * 0.8, lineHeight: 1 }}
    >
      {season.emoji}
    </span>
  );
}
