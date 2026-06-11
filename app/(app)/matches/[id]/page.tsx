import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock, Trophy, Sparkles } from "lucide-react";
import { CountdownTimer } from "@/components/countdown-timer";
import { PredictionForm } from "@/components/prediction-form";
import { Flag } from "@/components/flag";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMatch } from "@/lib/data/queries";
import { STAGE_LABELS } from "@/lib/data/matches";
import { jokerPhase, stagesOfPhase, jokerBudget } from "@/lib/jokers";
import { formatKickoff } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [match, session] = await Promise.all([getMatch(id), auth()]);
  if (!match) notFound();

  // Prono existant de l'utilisateur connecté (pour pré-remplir le formulaire)
  let existing: { homeScore: number; awayScore: number; joker: boolean; comment?: string } | undefined;
  if (session?.user?.id) {
    try {
      const pred = await prisma.prediction.findUnique({
        where: { userId_matchId: { userId: session.user.id, matchId: id } },
        select: { homeScore: true, awayScore: true, joker: true, comment: true },
      });
      if (pred) {
        existing = {
          homeScore: pred.homeScore,
          awayScore: pred.awayScore,
          joker: pred.joker,
          comment: pred.comment ?? undefined,
        };
      }
    } catch {}
  }

  // Jokers restants pour la phase de ce match (poules = 4, phase finale = 2)
  const budget = jokerBudget(match.stage);
  let jokersLeft = budget;
  if (session?.user?.id) {
    try {
      const usedElsewhere = await prisma.prediction.count({
        where: {
          userId: session.user.id,
          joker: true,
          matchId: { not: id },
          match: { stage: { in: stagesOfPhase(jokerPhase(match.stage)) } },
        },
      });
      jokersLeft = Math.max(0, budget - usedElsewhere);
    } catch {}
  }

  const kickoff = new Date(match.kickoffAt);
  const locked = Date.now() >= kickoff.getTime();
  const finished = match.result?.status === "FINISHED";
  const group = match.group ? `Groupe ${match.group}` : STAGE_LABELS[match.stage];

  return (
    <>
      {/* ── Back link ── */}
      <Link
        href="/matches"
        className="mb-5 inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-cream)]"
      >
        <ArrowLeft className="size-4" />
        <span>Tous les matchs</span>
      </Link>

      {/* ── Hero section with decorative glow ── */}
      <div className="relative">
        {/* Background glow */}
        <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-72 w-[120%] rounded-full bg-[var(--color-pitch)] opacity-[0.06] blur-[80px]" />
        <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 h-48 w-[80%] rounded-full bg-[var(--color-gold)] opacity-[0.04] blur-[60px]" />

        {/* Main hero card */}
        <div className="glass-strong relative overflow-hidden rounded-3xl p-6 sm:p-8">
          {/* Stage / Group label */}
          <div className="mb-6 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-1 font-[family-name:var(--font-mono)] text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--color-muted)]">
              {group}
            </span>
          </div>

          {/* Teams + Score / VS */}
          <div className="flex items-center justify-center gap-4 sm:gap-8">
            {/* Home team */}
            <div className="flex flex-1 flex-col items-center gap-2">
              <Flag code={match.homeFlag} className="h-14 w-20 drop-shadow-lg sm:h-16 sm:w-24" />
              <span className="max-w-28 truncate font-[family-name:var(--font-display)] text-base font-bold sm:text-lg">
                {match.homeTeam}
              </span>
            </div>

            {/* Score or VS */}
            <div className="flex flex-col items-center gap-1">
              {finished ? (
                <div className="flex items-baseline gap-2">
                  <span className="font-[family-name:var(--font-display)] text-5xl font-extrabold tabular-nums text-gradient-gold sm:text-6xl">
                    {match.result!.homeScore}
                  </span>
                  <span className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-muted)]">
                    &ndash;
                  </span>
                  <span className="font-[family-name:var(--font-display)] text-5xl font-extrabold tabular-nums text-gradient-gold sm:text-6xl">
                    {match.result!.awayScore}
                  </span>
                </div>
              ) : (
                <div className="relative">
                  <span className="font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase tracking-wider text-[var(--color-muted)] animate-[glow-pulse_2s_ease-in-out_infinite]">
                    VS
                  </span>
                  <div className="absolute inset-0 -z-10 rounded-full bg-[var(--color-pitch)] opacity-10 blur-xl" />
                </div>
              )}
            </div>

            {/* Away team */}
            <div className="flex flex-1 flex-col items-center gap-2">
              <Flag code={match.awayFlag} className="h-14 w-20 drop-shadow-lg sm:h-16 sm:w-24" />
              <span className="max-w-28 truncate font-[family-name:var(--font-display)] text-base font-bold sm:text-lg">
                {match.awayTeam}
              </span>
            </div>
          </div>

          {/* Kickoff time + Countdown */}
          <div className="mt-6 flex flex-col items-center gap-3">
            <span className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--color-muted)]">
              {formatKickoff(kickoff)}
            </span>

            {!finished && (
              <div className="glass mt-1 rounded-2xl px-6 py-3">
                <CountdownTimer target={kickoff} />
              </div>
            )}

            {finished && (
              <div className="mt-1 inline-flex items-center gap-2 rounded-full bg-[var(--color-gold)]/10 px-4 py-1.5">
                <Trophy className="size-3.5 text-[var(--color-gold)]" />
                <span className="text-xs font-semibold text-[var(--color-gold)]">
                  Match terminé
                </span>
              </div>
            )}
          </div>

          {/* Decorative corner accents */}
          <div className="pointer-events-none absolute -left-px -top-px h-16 w-16 rounded-tl-3xl border-l-2 border-t-2 border-[var(--color-pitch)]/20" />
          <div className="pointer-events-none absolute -bottom-px -right-px h-16 w-16 rounded-br-3xl border-b-2 border-r-2 border-[var(--color-pitch)]/20" />
        </div>
      </div>

      {/* ── Prediction / Result section ── */}
      <section className="mt-8">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-5 w-1 rounded-full bg-[var(--color-gold)]" />
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
            {finished ? "Résultat" : "Ton pronostic"}
          </h2>
        </div>

        {finished ? (
          /* ── Finished match: result + user prediction ── */
          <div className="glass-strong overflow-hidden rounded-2xl">
            <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-gold)]/5 px-5 py-4">
              <div className="flex items-center justify-center gap-3">
                <Flag code={match.homeFlag} className="h-6 w-9" />
                <span className="font-[family-name:var(--font-display)] text-2xl font-extrabold tabular-nums text-gradient-gold">
                  {match.result!.homeScore} - {match.result!.awayScore}
                </span>
                <Flag code={match.awayFlag} className="h-6 w-9" />
              </div>
            </div>
            <div className="p-5">
              {existing ? (
                <div className="flex items-center gap-3">
                  <Sparkles className="size-4 shrink-0 text-[var(--color-gold)]" />
                  <span className="text-sm text-[var(--color-muted)]">
                    Ton prono :{" "}
                    <span className="font-[family-name:var(--font-display)] font-bold text-[var(--color-cream)]">
                      {existing.homeScore} - {existing.awayScore}
                    </span>
                    {existing.joker && (
                      <span className="ml-2" title="Joker activé">🃏</span>
                    )}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
                  <Sparkles className="size-4 text-[var(--color-gold)]" />
                  <span>Tu n&apos;avais pas pronostiqué ce match.</span>
                </div>
              )}
            </div>
          </div>
        ) : locked ? (
          /* ── Locked: kickoff passed — affiche le prono si existant ── */
          <div className="space-y-3">
            <div className="glass-strong flex items-center gap-4 rounded-2xl p-5">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-2)]">
                <Lock className="size-5 text-[var(--color-muted)]" />
              </div>
              <div>
                <p className="font-[family-name:var(--font-display)] text-sm font-bold">
                  Pronostics fermés
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                  Le coup d&apos;envoi est passé, les pronos sont verrouillés.
                </p>
              </div>
            </div>
            {existing && (
              <div className="glass rounded-2xl px-5 py-4">
                <p className="text-sm text-[var(--color-muted)]">
                  Ton prono :{" "}
                  <span className="font-[family-name:var(--font-display)] font-bold text-[var(--color-cream)]">
                    {existing.homeScore} - {existing.awayScore}
                  </span>
                  {existing.joker && (
                    <span className="ml-2" title="Joker activé">🃏</span>
                  )}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* ── Open: show prediction form ── */
          <PredictionForm
            matchId={match.id}
            homeTeam={match.homeTeam}
            awayTeam={match.awayTeam}
            homeFlag={match.homeFlag}
            awayFlag={match.awayFlag}
            kickoffAt={match.kickoffAt}
            locked={locked}
            initial={existing}
            jokersLeft={jokersLeft}
            jokerBudget={budget}
          />
        )}
      </section>
    </>
  );
}
