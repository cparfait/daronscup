import { PageHeader } from "@/components/page-header";
import { StandingsView } from "@/components/standings-view";
import { getStandings } from "@/lib/data/queries";

export const metadata = { title: "Classements · DaronsFC" };
export const dynamic = "force-dynamic";

export default async function StandingsPage() {
  const groups = await getStandings();

  return (
    <>
      <PageHeader
        title="Classements"
        subtitle="Coupe du Monde 2026 — officiels"
      />
      <StandingsView groups={groups} />
    </>
  );
}
