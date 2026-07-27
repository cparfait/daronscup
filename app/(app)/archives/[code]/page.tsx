import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Trophy } from "lucide-react";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Flag } from "@/components/flag";
import { MatchCard } from "@/components/match-card";
import { getSeasonByCode } from "@/lib/season";
import { SeasonLogo } from "@/components/season-logo";
import { getPalmares } from "@/lib/season-archive";
import { getMatches } from "@/lib/data/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const MEDALS = ["🥇", "🥈", "🥉"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const season = await getSeasonByCode(decodeURIComponent(code));
  return { title: `${season?.shortName ?? "Archive"} · DaronsFC` };
}

/**
 * Palmarès d'une saison archivée : vainqueur de la compétition, classement final
 * de chaque groupe d'amis, et les résultats de tous les matchs.
 *
 * Lecture seule : les pronostics sont clos, les points figés.
 */
export default async function ArchiveSeasonPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { code } = await params;
  const season = await getSeasonByCode(decodeURIComponent(code));
  if (!season) notFound();

  const [palmares, matches] = await Promise.all([
    getPalmares(season.id),
    getMatches(season.id),
  ]);

  // Les plus récents d'abord, et seulement ceux qui ont un résultat.
  const played = matches
    .filter((m) => m.result)
    .sort((a, b) => +new Date(b.kickoffAt) - +new Date(a.kickoffAt));

  return (
    <>
      <Link
        href="/archives"
        className="mb-5 inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-cream)]"
      >
        <ArrowLeft className="size-4" />
        <span>Archives</span>
      </Link>

      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <SeasonLogo season={season} size={28} /> {season.shortName}
          </span>
        }
        subtitle={season.name}
      />

      {!palmares ? (
        <Card className="glass p-8 text-center">
          <p className="text-sm text-[var(--color-muted)]">
            Le palmarès de cette saison n&apos;a pas été figé.
          </p>
        </Card>
      ) : (
        <>
          {palmares.winner && (
            <Card className="glass mb-5 flex items-center gap-3 border-[var(--color-gold)]/30 bg-[var(--color-gold)]/[0.06] p-4">
              <Trophy className="size-6 shrink-0 text-[var(--color-gold)]" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                  Vainqueur de la compétition
                </p>
                <p className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-cream)]">
                  <Flag
                    code={palmares.winner.flag}
                    className="h-5 w-7 shrink-0"
                  />
                  {palmares.winner.team}
                </p>
              </div>
            </Card>
          )}

          <div className="mb-5 grid grid-cols-3 gap-3">
            {[
              { label: "Matchs", value: palmares.totals.matches },
              { label: "Pronos", value: palmares.totals.predictions },
              { label: "Joueurs", value: palmares.totals.players },
            ].map((s) => (
              <Card
                key={s.label}
                className="glass flex flex-col items-center justify-center px-3 py-4 text-center"
              >
                <span className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-cream)]">
                  {s.value}
                </span>
                <span className="mt-1 text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
                  {s.label}
                </span>
              </Card>
            ))}
          </div>

          {/* ── Classement final de chaque groupe ── */}
          {palmares.groups.map((g) => (
            <div key={g.groupId} className="mb-5">
              <h2 className="mb-2 flex items-center gap-2 font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-widest text-[var(--color-muted)]">
                {g.name}
              </h2>
              <Card className="glass overflow-hidden">
                <ul>
                  {g.players.map((p, i) => (
                    <li
                      key={p.userId}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 text-sm",
                        i > 0 && "border-t border-[var(--color-border-subtle)]",
                        p.rank === 1 && "bg-[var(--color-gold)]/[0.05]"
                      )}
                    >
                      <span className="w-6 text-center text-base leading-none">
                        {MEDALS[i] ?? (
                          <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-muted)]">
                            {p.rank}
                          </span>
                        )}
                      </span>
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate font-medium",
                          p.rank === 1 &&
                            "text-gradient-gold font-[family-name:var(--font-display)] font-bold"
                        )}
                      >
                        {p.name}
                      </span>
                      {p.champion && (
                        <Flag
                          code={p.champion.flag}
                          className="h-3 w-4.5 shrink-0 opacity-70"
                        />
                      )}
                      <span className="shrink-0 font-[family-name:var(--font-mono)] text-xs text-[var(--color-muted)]">
                        {p.exactScores} 🎯
                      </span>
                      <span
                        className={cn(
                          "w-14 shrink-0 text-right font-[family-name:var(--font-mono)] text-sm font-semibold",
                          p.rank === 1
                            ? "text-[var(--color-gold)]"
                            : "text-[var(--color-muted)]"
                        )}
                      >
                        {p.points} pts
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          ))}
        </>
      )}

      {/* ── Tous les résultats de la saison ── */}
      {played.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-widest text-[var(--color-muted)]">
            Tous les résultats
          </h2>
          <div className="flex flex-col gap-2.5">
            {played.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
