"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Flag } from "@/components/flag";
import { cn } from "@/lib/utils";
import type { StandingTeam } from "@/lib/data/matches";

export function StandingsView({
  groups,
}: {
  groups: Record<string, StandingTeam[]>;
}) {
  const groupKeys = Object.keys(groups).sort();
  const [active, setActive] = useState<string>(groupKeys[0] ?? "A");

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

  if (groupKeys.length === 0) {
    return (
      <Card className="glass p-8 text-center">
        <p className="text-sm text-[var(--color-muted)]">
          Aucun classement disponible. Il se construit automatiquement à partir
          des résultats de la phase de poules. 📊
        </p>
      </Card>
    );
  }

  return (
    <>
      {/* ── Tab bar ── */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
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
            Groupe {key}
          </button>
        ))}
      </div>

      {/* ── Group table ── */}
      <GroupTable
        group={active}
        teams={groups[active] ?? []}
        highlight={targetTeam}
      />
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

  // Fait défiler jusqu'à l'équipe mise en évidence (drapeau cliqué).
  useEffect(() => {
    if (highlight && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlight, group]);

  return (
    <Card className="overflow-hidden">
      {/* Group header */}
      <div className="border-b border-[var(--color-border-subtle)] px-4 py-2.5 font-[family-name:var(--font-display)] font-semibold uppercase tracking-wide text-[var(--color-pitch-bright)]">
        Groupe {group}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-[var(--color-muted)]">
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
          {teams.map((t) => {
            const diff = t.bp - t.bc;
            const isTarget = highlight === t.team;
            return (
              <tr
                key={t.team}
                ref={isTarget ? rowRef : undefined}
                className={cn(
                  "border-t border-[var(--color-border-subtle)] transition-colors duration-150 hover:bg-[var(--color-surface-2)]",
                  isTarget &&
                    "bg-[var(--color-pitch)]/15 ring-1 ring-inset ring-[var(--color-pitch-bright)]/40"
                )}
              >
                {/* Team name with flag */}
                <td className="px-3 py-2.5 font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <Flag code={t.flag} className="h-3.5 w-5" />
                    {t.team}
                  </span>
                </td>

                {/* Stats: J, G, N, P */}
                {[t.j, t.g, t.n, t.p].map((v, i) => (
                  <td
                    key={i}
                    className="px-1.5 py-2.5 text-center font-[family-name:var(--font-mono)] text-[var(--color-muted)]"
                  >
                    {v}
                  </td>
                ))}

                {/* Diff */}
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

                {/* Points */}
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
