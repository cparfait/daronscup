import { Flag } from "@/components/flag";
import { formatKickoffTime } from "@/lib/utils";
import type { Match } from "@/lib/data/matches";

/**
 * Bandeau « jour de match des Bleus » + liseré tricolore, affiché en haut de
 * l'app quand l'équipe de France joue aujourd'hui (cf. `getFranceMatchToday`).
 */
export function FranceMatchBanner({ match }: { match: Match }) {
  const live = !!match.live;
  const finished = !!match.result;
  const opponentIsHome = match.awayFlag === "fr";
  const opponent = opponentIsHome ? match.homeTeam : match.awayTeam;
  const opponentFlag = opponentIsHome ? match.homeFlag : match.awayFlag;
  const score = match.result ?? match.live;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[var(--color-surface)]">
      {/* Liseré bleu-blanc-rouge */}
      <div className="fr-tricolore" />

      <div className="flex items-center gap-2 px-3 py-2">
        <span className="text-base">🇫🇷</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-cream)]">
            Jour de match des Bleus
          </p>
          <p className="flex items-center gap-1.5 text-[11px] text-[var(--color-muted)]">
            <span>France</span>
            <span className="text-[var(--color-muted)]/70">vs</span>
            <Flag code={opponentFlag} className="h-3 w-4" />
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
