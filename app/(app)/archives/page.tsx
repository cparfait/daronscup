import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ChevronRight, Trophy } from "lucide-react";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Flag } from "@/components/flag";
import { getClosedSeasons } from "@/lib/season";
import { SeasonLogo } from "@/components/season-logo";
import { getPalmares } from "@/lib/season-archive";

export const metadata = { title: "Archives · DaronsFC" };
export const dynamic = "force-dynamic";

/**
 * Liste des saisons terminées. Chaque saison garde son palmarès figé (classement
 * final par groupe, vainqueur, badges) et l'intégralité de ses matchs.
 */
export default async function ArchivesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const seasons = await getClosedSeasons();
  const palmares = await Promise.all(seasons.map((s) => getPalmares(s.id)));

  return (
    <>
      <Link
        href="/profile"
        className="mb-5 inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-cream)]"
      >
        <ArrowLeft className="size-4" />
        <span>Profil</span>
      </Link>

      <PageHeader title="Archives" subtitle="Les saisons passées, au musée" />

      {seasons.length === 0 ? (
        <Card className="glass p-8 text-center">
          <Trophy className="mx-auto mb-3 size-7 text-[var(--color-muted)]/50" />
          <p className="text-sm text-[var(--color-muted)]">
            Aucune saison archivée pour l&apos;instant. La première y entrera à
            la fin de la compétition en cours. 🏆
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2.5">
          {seasons.map((s, i) => {
            const p = palmares[i];
            const winners = (p?.groups ?? [])
              .map((g) => g.players[0])
              .filter((x): x is NonNullable<typeof x> => !!x);
            return (
              <Link key={s.id} href={`/archives/${s.code}`} className="block">
                <Card className="glass card-hover flex items-center gap-3 p-4">
                  <SeasonLogo season={s} size={28} />
                  <div className="min-w-0 flex-1">
                    <p className="font-[family-name:var(--font-display)] text-base font-bold text-[var(--color-cream)]">
                      {s.name}
                    </p>
                    {p?.winner ? (
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
                        <Flag
                          code={p.winner.flag}
                          className="h-3 w-4.5 shrink-0"
                        />
                        <span className="truncate">
                          Vainqueur : {p.winner.team}
                        </span>
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                        {p?.totals.matches ?? 0} matchs ·{" "}
                        {p?.totals.predictions ?? 0} pronos
                      </p>
                    )}
                    {winners.length > 0 && (
                      <p className="mt-1 truncate text-[11px] text-[var(--color-gold)]">
                        👑 {winners.map((w) => w.name).join(", ")}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-[var(--color-muted)]" />
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
