import { PageHeader } from "@/components/page-header";
import { StandingsView } from "@/components/standings-view";
import { getStandings, getMatches } from "@/lib/data/queries";
import type { Match } from "@/lib/data/matches";

export const metadata = { title: "Classements · DaronsFC" };
export const dynamic = "force-dynamic";

export default async function StandingsPage() {
  const [groups, allMatches] = await Promise.all([
    getStandings(),
    getMatches(),
  ]);

  // Matchs de poule groupés par lettre de groupe, triés par date.
  const matchesByGroup: Record<string, Match[]> = {};
  for (const m of allMatches) {
    if (m.stage !== "GROUP" || !m.group) continue;
    (matchesByGroup[m.group] ??= []).push(m);
  }

  return (
    <>
      <PageHeader
        title="Classements"
        subtitle="Coupe du Monde 2026 — officiels"
      />
      <StandingsView groups={groups} matchesByGroup={matchesByGroup} />
    </>
  );
}
