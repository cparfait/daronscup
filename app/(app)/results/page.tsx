import { PageHeader } from "@/components/page-header";
import { MatchCardInteractive } from "@/components/match-card-interactive";
import { LiveRefresher } from "@/components/live-refresher";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMatches } from "@/lib/data/queries";
import type { Match } from "@/lib/data/matches";
import { jokerBudget } from "@/lib/jokers";
import { getViewingSeason, hasTwoLeggedTies } from "@/lib/season";
import { buildBettingScope, isBettableMatch } from "@/lib/betting";
import { dayKey, dayLabel } from "@/lib/utils";

export const metadata = { title: "Résultats · DaronsFC" };
export const dynamic = "force-dynamic";

/** Groupe les matchs par jour, du plus récent au plus ancien. */
function groupByDayDesc(matches: Match[]) {
  const sorted = [...matches].sort(
    (a, b) => +new Date(b.kickoffAt) - +new Date(a.kickoffAt)
  );
  const groups = new Map<string, Match[]>();
  for (const m of sorted) {
    const key = dayKey(m.kickoffAt);
    const list = groups.get(key) ?? [];
    list.push(m);
    groups.set(key, list);
  }
  return [...groups.entries()];
}

export default async function ResultsPage() {
  const [allMatches, session, season] = await Promise.all([
    getMatches(),
    auth(),
    getViewingSeason(),
  ]);
  const now = Date.now();
  // Matchs commencés : en cours (live) ou terminés.
  const started = allMatches.filter(
    (m) => m.live || m.result || new Date(m.kickoffAt).getTime() <= now
  );

  const predByMatch = new Map<
    string,
    { homeScore: number; awayScore: number; joker: boolean }
  >();
  if (session?.user?.id && season) {
    try {
      const preds = await prisma.prediction.findMany({
        where: { userId: session.user.id, match: { seasonId: season.id } },
        select: { matchId: true, homeScore: true, awayScore: true, joker: true },
      });
      for (const p of preds) {
        predByMatch.set(p.matchId, {
          homeScore: p.homeScore,
          awayScore: p.awayScore,
          joker: p.joker,
        });
      }
    } catch {}
  }

  // Hors périmètre = hors écran : une phase de ligue de C1, c'est 144 matchs
  // dont on ne parie qu'une poignée (cf. lib/betting.ts). Lister les autres
  // noyait les affiches qui nous concernent sous des scores anonymes.
  //
  // Un prono déjà posé rouvre toujours la porte : le périmètre se recalcule à
  // chaque synchro (`lastFocusKickoff` recule quand un club suivi se qualifie),
  // donc un match pronostiqué hier peut en sortir aujourd'hui. Le masquer
  // ferait disparaître des points qu'on a bel et bien marqués.
  const scope = buildBettingScope(season, allMatches);
  const matches = started.filter(
    (m) => isBettableMatch(m, scope) || predByMatch.has(m.id)
  );
  const hidden = started.length - matches.length;
  const days = groupByDayDesc(matches);
  const hasLive = matches.some((m) => m.live);

  return (
    <>
      {hasLive && <LiveRefresher seconds={30} />}

      <PageHeader title="Résultats" subtitle="Matchs en cours & terminés" />

      {matches.length === 0 && (
        <Card className="glass p-8 text-center">
          <p className="text-sm text-[var(--color-muted)]">
            {hidden > 0
              ? "Aucun match de notre périmètre n'a encore été joué. Les résultats arrivent dès le coup d'envoi. ⚽"
              : "Aucun match joué pour l'instant. Les résultats arrivent dès le coup d'envoi. ⚽"}
          </p>
        </Card>
      )}

      <div className="flex flex-col gap-8">
        {days.map(([key, dayMatches]) => (
          <section key={key}>
            <div className="sticky top-0 z-20 -mx-4 mb-4 px-4 py-2.5 backdrop-blur-xl bg-[var(--color-bg)]/80">
              <div className="flex items-center gap-3">
                <div className="h-5 w-1 rounded-full bg-[var(--color-pitch)]" />
                <h2 className="font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-widest text-[var(--color-cream)]">
                  {dayLabel(dayMatches[0]!.kickoffAt)}
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-[var(--color-border-subtle)] to-transparent" />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {dayMatches.map((m) => (
                <MatchCardInteractive
                  key={m.id}
                  match={m}
                  prediction={predByMatch.get(m.id)}
                  jokersLeft={0}
                  jokerBudget={jokerBudget(m.stage, season)}
                  twoLegged={hasTwoLeggedTies(season)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Pourquoi la liste est si courte — sinon on croit à des scores manquants. */}
      {hidden > 0 && matches.length > 0 && (
        <p className="mt-8 px-1 text-center text-[11px] leading-relaxed text-[var(--color-muted)]">
          {hidden} autre{hidden > 1 ? "s" : ""} match{hidden > 1 ? "s" : ""} joué
          {hidden > 1 ? "s" : ""} {hidden > 1 ? "ne sont" : "n'est"} pas listé
          {hidden > 1 ? "s" : ""} : on ne pariait pas dessus.
        </p>
      )}
    </>
  );
}
