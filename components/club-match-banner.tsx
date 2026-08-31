import { Flag } from "@/components/flag";
import { formatKickoffTime } from "@/lib/utils";
import { clubKey } from "@/lib/teams";
import type { Match } from "@/lib/data/matches";

/**
 * Bandeau « jour de match de ton club » + liseré aux couleurs du club, affiché
 * en haut de l'app quand le club de cœur du joueur joue aujourd'hui
 * (cf. `getFavoriteClubMatchToday`).
 *
 * Pendant de `FranceMatchBanner` pour les compétitions de clubs. Personnel :
 * chaque joueur voit le sien, ou rien s'il n'a pas choisi de club de cœur.
 */
export function ClubMatchBanner({
  match,
  team,
}: {
  match: Match;
  team: string;
}) {
  const live = !!match.live;
  const finished = !!match.result;
  const score = match.result ?? match.live;

  // Le club de cœur peut être l'équipe à domicile comme à l'extérieur.
  const key = clubKey(team);
  const isHome = clubKey(match.homeTeam) === key;
  const mine = isHome ? match.homeTeam : match.awayTeam;
  const mineFlag = isHome ? match.homeFlag : match.awayFlag;
  const opponent = isHome ? match.awayTeam : match.homeTeam;
  const opponentFlag = isHome ? match.awayFlag : match.homeFlag;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[var(--color-surface)]">
      <div className="club-stripe" />

      <div className="flex items-center gap-2 px-3 py-2">
        <Flag code={mineFlag} team={mine} className="h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-cream)]">
            Jour de match {isHome ? "à domicile" : "à l'extérieur"}
          </p>
          <p className="flex items-center gap-1.5 text-[11px] text-[var(--color-muted)]">
            <span className="truncate">{mine}</span>
            <span className="text-[var(--color-muted)]/70">vs</span>
            <Flag code={opponentFlag} team={opponent} className="h-3 w-4" />
            <span className="truncate">{opponent}</span>
          </p>
        </div>

        {live ? (
          <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
            🔴 {score?.homeScore}-{score?.awayScore}
          </span>
        ) : finished ? (
          <span className="shrink-0 rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
            Terminé {score?.homeScore}-{score?.awayScore}
          </span>
        ) : (
          <span className="shrink-0 font-[family-name:var(--font-mono)] text-xs font-bold text-[var(--color-cream)]">
            {formatKickoffTime(match.kickoffAt)}
          </span>
        )}
      </div>
    </div>
  );
}
