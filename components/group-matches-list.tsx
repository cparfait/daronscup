import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Flag } from "@/components/flag";
import { cn } from "@/lib/utils";
import { formatKickoffTime } from "@/lib/utils";
import type { Match } from "@/lib/data/matches";

/**
 * Liste des matchs d'un groupe de poule : passés (avec score) et à venir.
 * Affichée sous le tableau de classement pour que les joueurs évaluent le
 * niveau des équipes (forme, résultats, derbies à venir).
 */
export function GroupMatchesList({ matches }: { matches: Match[] }) {
  if (matches.length === 0) {
    return (
      <Card className="glass mt-4 p-5 text-center">
        <p className="text-sm text-[var(--color-muted)]">
          Aucun match programmé pour ce groupe pour l&apos;instant. ⚽
        </p>
      </Card>
    );
  }

  // Tri chronologique (les terminés/direct d'abord, puis à venir).
  const sorted = [...matches].sort(
    (a, b) => +new Date(a.kickoffAt) - +new Date(b.kickoffAt)
  );

  return (
    <Card className="glass mt-4 overflow-hidden">
      <div className="border-b border-[var(--color-border-subtle)] px-4 py-2.5">
        <h3 className="font-[family-name:var(--font-display)] text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
          Matchs du groupe
        </h3>
      </div>

      <ul>
        {sorted.map((m, i) => {
          const score = m.result ?? m.live;
          const finished = m.result?.status === "FINISHED";
          const live = !!m.live;
          const upcoming = !score;

          return (
            <li key={m.id}>
              <Link
                href={`/matches/${m.id}`}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-[var(--color-surface-2)]",
                  finished && "bg-[var(--color-surface-2)]/50",
                  i < sorted.length - 1 &&
                    "border-b border-[var(--color-border-subtle)]"
                )}
              >
                {/* Date / statut */}
                <span className="w-16 shrink-0 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                  {upcoming ? (
                    formatKickoffTime(m.kickoffAt)
                  ) : (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1",
                        live && "text-red-400",
                        finished && "text-[var(--color-pitch-bright)]"
                      )}
                    >
                      {live && <span className="size-1.5 animate-pulse rounded-full bg-red-400" />}
                      {finished ? "Terminé" : "Live"}
                    </span>
                  )}
                </span>

                {/* Équipe domicile (flag + nom), alignée à gauche */}
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Flag
                    code={m.homeFlag}
                    team={m.homeTeam}
                    className="h-3.5 w-5 shrink-0"
                  />
                  <span className="truncate text-left font-medium">
                    {m.homeTeam}
                  </span>
                </div>

                {/* Score */}
                <span
                  className={cn(
                    "w-12 shrink-0 text-center font-[family-name:var(--font-display)] font-bold tabular-nums",
                    live
                      ? "text-red-400"
                      : finished
                        ? "text-[var(--color-gold)]"
                        : "text-[var(--color-muted)]/60"
                  )}
                >
                  {score ? `${score.homeScore} - ${score.awayScore}` : "vs"}
                </span>

                {/* Équipe extérieure (flag + nom), alignée à gauche */}
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Flag
                    code={m.awayFlag}
                    team={m.awayTeam}
                    className="h-3.5 w-5 shrink-0"
                  />
                  <span className="truncate text-left font-medium">{m.awayTeam}</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
