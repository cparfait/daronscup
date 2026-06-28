import { PageHeader } from "@/components/page-header";
import { StandingsView } from "@/components/standings-view";
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

  return (
    <>
      <PageHeader
        title="Classements"
        subtitle="Coupe du Monde 2026 — officiels"
      />
      <StandingsView
        groups={groups}
        matchesByGroup={matchesByGroup}
        knockoutMatches={knockoutMatches}
      />
    </>
  );
}
