import { PageHeader } from "@/components/page-header";
import { StandingsView } from "@/components/standings-view";
import { BracketView } from "@/components/bracket-view";
import { getStandings, getMatches } from "@/lib/data/queries";
import type { Match } from "@/lib/data/matches";

export const metadata = { title: "Classements · DaronsFC" };
export const dynamic = "force-dynamic";

const KNOCKOUT_STAGES = new Set([
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTER",
  "SEMI",
  "THIRD_PLACE",
  "FINAL",
]);

export default async function StandingsPage() {
  const [groups, allMatches] = await Promise.all([
    getStandings(),
    getMatches(),
  ]);

  // Matchs de poule groupés par lettre de groupe, triés par date.
  const matchesByGroup: Record<string, Match[]> = {};
  const knockoutMatches: Match[] = [];
  for (const m of allMatches) {
    if (m.stage === "GROUP") {
      if (!m.group) continue;
      (matchesByGroup[m.group] ??= []).push(m);
    } else if (KNOCKOUT_STAGES.has(m.stage)) {
      knockoutMatches.push(m);
    }
  }

  const hasKnockout = knockoutMatches.length > 0;

  return (
    <>
      <PageHeader
        title="Classements"
        subtitle="Coupe du Monde 2026 — officiels"
      />

      {/* ── Tableau de bord éliminatoires ── */}
      {hasKnockout && (
        <section className="mb-8">
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-xs font-bold uppercase tracking-widest text-[var(--color-muted)]">
            Phase éliminatoire
          </h2>
          <BracketView matches={knockoutMatches} />
        </section>
      )}

      {/* ── Classements de poule ── */}
      {Object.keys(groups).length > 0 && (
        <section>
          {hasKnockout && (
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-xs font-bold uppercase tracking-widest text-[var(--color-muted)]">
              Phase de poules
            </h2>
          )}
          <StandingsView groups={groups} matchesByGroup={matchesByGroup} />
        </section>
      )}

      {!hasKnockout && Object.keys(groups).length === 0 && (
        <StandingsView groups={groups} matchesByGroup={matchesByGroup} />
      )}
    </>
  );
}
