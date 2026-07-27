"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Flag } from "@/components/flag";
import { GroupMatchesList } from "@/components/group-matches-list";
import { BracketView } from "@/components/bracket-view";
import { cn } from "@/lib/utils";
import { LEAGUE_TABLE_KEY, type Match, type StandingTeam } from "@/lib/data/matches";

const TOURNOI_KEY = "__tournoi__";

/**
 * Barres de qualification de la phase de ligue (Ligue des Champions) :
 * 1-8 → 8èmes directs, 9-24 → barrages, 25-36 → éliminés.
 */
const LEAGUE_CUTS = [8, 24];

/** Libellé de l'onglet d'une table de classement. */
function tableLabel(key: string): string {
  return key === LEAGUE_TABLE_KEY ? "Classement" : `Groupe ${key}`;
}

export function StandingsView({
  groups,
  matchesByGroup,
  knockoutMatches,
  twoLegged = false,
}: {
  groups: Record<string, StandingTeam[]>;
  matchesByGroup?: Record<string, Match[]>;
  knockoutMatches?: Match[];
  /** Tours à élimination directe en aller-retour (C1) → tableau adapté. */
  twoLegged?: boolean;
}) {
  const groupKeys = Object.keys(groups).sort();
  const hasKnockout = !!knockoutMatches?.length;

  const defaultTab = hasKnockout ? TOURNOI_KEY : (groupKeys[0] ?? "A");
  const [active, setActive] = useState<string>(defaultTab);

  // Arrivée depuis un drapeau cliqué (`/standings?team=…`) : ouvre le groupe de
  // l'équipe ciblée et la met en évidence.
  const params = useSearchParams();
  const targetTeam = params.get("team");
  useEffect(() => {
    if (!targetTeam) return;
    const grp = groupKeys.find((k) =>
      groups[k]?.some((t) => t.team === targetTeam)
    );
    if (grp) setActive(grp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetTeam]);

  if (!hasKnockout && groupKeys.length === 0) {
    return (
      <Card className="glass p-8 text-center">
        <p className="text-sm text-[var(--color-muted)]">
          Aucun classement disponible. Il se construit automatiquement à partir
          des résultats du premier tour. 📊
        </p>
      </Card>
    );
  }

  return (
    <>
      {/* ── Tab bar ── */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {/* Onglet Tournoi */}
        {hasKnockout && (
          <button
            onClick={() => setActive(TOURNOI_KEY)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 font-[family-name:var(--font-display)] text-sm font-semibold tracking-wide transition-colors duration-200",
              active === TOURNOI_KEY
                ? "bg-[var(--color-pitch)] text-white shadow-[0_0_12px_var(--color-pitch)]/25"
                : "bg-[var(--color-surface-2)] text-[var(--color-muted)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-cream)]"
            )}
          >
            🏆 Tournoi
          </button>
        )}

        {/* Séparateur visuel */}
        {hasKnockout && groupKeys.length > 0 && (
          <div className="my-auto h-4 w-px shrink-0 bg-[var(--color-border-subtle)]" />
        )}

        {/* Onglets de groupes (ou onglet unique « Classement » en phase de ligue) */}
        {groupKeys.map((key) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 font-[family-name:var(--font-display)] text-sm font-semibold tracking-wide transition-colors duration-200",
              active === key
                ? "bg-[var(--color-pitch)] text-white shadow-[0_0_12px_var(--color-pitch)]/25"
                : "bg-[var(--color-surface-2)] text-[var(--color-muted)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-cream)]"
            )}
          >
            {tableLabel(key)}
          </button>
        ))}
      </div>

      {/* ── Contenu de l'onglet actif ── */}
      {active === TOURNOI_KEY && hasKnockout ? (
        <BracketView matches={knockoutMatches!} twoLegged={twoLegged} />
      ) : (
        <>
          <GroupTable
            group={active}
            teams={groups[active] ?? []}
            highlight={targetTeam}
          />
          {matchesByGroup && matchesByGroup[active] && (
            <GroupMatchesList matches={matchesByGroup[active]} />
          )}
        </>
      )}
    </>
  );
}

/* ─── Group table ─── */

function GroupTable({
  group,
  teams,
  highlight,
}: {
  group: string;
  teams: StandingTeam[];
  highlight?: string | null;
}) {
  const rowRef = useRef<HTMLTableRowElement>(null);
  const isLeague = group === LEAGUE_TABLE_KEY;

  useEffect(() => {
    if (highlight && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlight, group]);

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[var(--color-border-subtle)] px-4 py-2.5 font-[family-name:var(--font-display)] font-semibold uppercase tracking-wide text-[var(--color-pitch-bright)]">
        {tableLabel(group)}
      </div>

      {isLeague && (
        <p className="border-b border-[var(--color-border-subtle)] px-4 py-2 text-[11px] leading-relaxed text-[var(--color-muted)]">
          <span className="font-semibold text-[var(--color-pitch-bright)]">1-8</span>{" "}
          qualifiés pour les 8èmes ·{" "}
          <span className="font-semibold text-[var(--color-gold)]">9-24</span>{" "}
          barrages ·{" "}
          <span className="font-semibold text-[var(--color-muted)]">25-36</span>{" "}
          éliminés
        </p>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-[var(--color-muted)]">
            {isLeague && <th className="px-2 py-2 text-right font-medium">#</th>}
            <th className="px-3 py-2 text-left font-medium">{"É"}quipe</th>
            {["J", "G", "N", "P", "Diff", "Pts"].map((h) => (
              <th
                key={h}
                className="px-1.5 py-2 text-center font-[family-name:var(--font-mono)] font-medium"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teams.map((t, i) => {
            const diff = t.bp - t.bc;
            const isTarget = highlight === t.team;
            const rank = i + 1;
            // Trait de séparation sous les barres de qualification (phase de ligue).
            const cut = isLeague && LEAGUE_CUTS.includes(rank);
            return (
              <tr
                key={t.team}
                ref={isTarget ? rowRef : undefined}
                className={cn(
                  "border-t border-[var(--color-border-subtle)] transition-colors duration-150 hover:bg-[var(--color-surface-2)]",
                  isTarget &&
                    "bg-[var(--color-pitch)]/15 ring-1 ring-inset ring-[var(--color-pitch-bright)]/40",
                  cut && "border-b-2 border-b-[var(--color-gold)]/40"
                )}
              >
                {isLeague && (
                  <td
                    className={cn(
                      "px-2 py-2.5 text-right font-[family-name:var(--font-mono)] text-xs",
                      rank <= 8
                        ? "text-[var(--color-pitch-bright)]"
                        : rank <= 24
                          ? "text-[var(--color-gold)]"
                          : "text-[var(--color-muted)]/60"
                    )}
                  >
                    {rank}
                  </td>
                )}
                <td className="px-3 py-2.5 font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <Flag code={t.flag} className="h-3.5 w-5" />
                    {t.team}
                  </span>
                </td>
                {[t.j, t.g, t.n, t.p].map((v, i) => (
                  <td
                    key={i}
                    className="px-1.5 py-2.5 text-center font-[family-name:var(--font-mono)] text-[var(--color-muted)]"
                  >
                    {v}
                  </td>
                ))}
                <td
                  className={cn(
                    "px-1.5 py-2.5 text-center font-[family-name:var(--font-mono)]",
                    diff > 0 && "text-[var(--color-pitch-bright)]",
                    diff < 0 && "text-red-400",
                    diff === 0 && "text-[var(--color-muted)]"
                  )}
                >
                  {diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : "0"}
                </td>
                <td className="px-1.5 py-2.5 text-center font-[family-name:var(--font-display)] font-bold text-[var(--color-gold)]">
                  {t.pts}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
