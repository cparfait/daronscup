import { PageHeader } from "@/components/page-header";
import { StandingsView } from "@/components/standings-view";
import { getStandings, getMatches } from "@/lib/data/queries";
import { getViewingSeason, isKnockoutStage, hasTwoLeggedTies } from "@/lib/season";
import type { Match } from "@/lib/data/matches";

export const metadata = { title: "Classements · DaronsFC" };
export const dynamic = "force-dynamic";

export default async function StandingsPage() {
  const season = await getViewingSeason();
  const [groups, allMatches] = await Promise.all([getStandings(), getMatches()]);

  // Poules de Coupe du Monde → la liste des 6 matchs sous chaque table.
  // Phase de ligue de C1 : 144 matchs pour une seule table — on ne les liste
  // pas ici, les onglets « Matchs » et « Résultats » sont faits pour ça.
  const matchesByGroup: Record<string, Match[]> = {};
  const knockoutMatches: Match[] = [];
  for (const m of allMatches) {
    if (m.stage === "GROUP") {
      if (!m.group) continue;
      (matchesByGroup[m.group] ??= []).push(m);
    } else if (isKnockoutStage(m.stage)) {
      knockoutMatches.push(m);
    }
  }

  return (
    <>
      <PageHeader
        title="Classements"
        subtitle={season ? `${season.name} — officiels` : "Officiels"}
      />
      <StandingsView
        groups={groups}
        matchesByGroup={matchesByGroup}
        knockoutMatches={knockoutMatches}
        twoLegged={hasTwoLeggedTies(season)}
      />
    </>
  );
}
