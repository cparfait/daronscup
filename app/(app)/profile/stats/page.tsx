import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Flag } from "@/components/flag";
import { getPersonalStats } from "@/lib/data/queries";

export const metadata = { title: "Mes stats · DaronsFC" };
export const dynamic = "force-dynamic";

const pct = (x: number) => `${Math.round(x * 100)}%`;
const one = (x: number) => (Math.round(x * 10) / 10).toString().replace(".", ",");

export default async function StatsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const stats = userId
    ? await getPersonalStats(userId)
    : null;

  const STATS = stats
    ? [
        { emoji: "🎯", label: "Taux de réussite", value: pct(stats.successRate) },
        { emoji: "💎", label: "Scores exacts", value: pct(stats.exactRate) },
        { emoji: "📊", label: "Pts / match", value: one(stats.avgPoints) },
        { emoji: "🃏", label: "Jokers joués", value: String(stats.jokersUsed) },
      ]
    : [];

  return (
    <>
      <Link
        href="/profile"
        className="mb-5 inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-cream)]"
      >
        <ArrowLeft className="size-4" />
        <span>Profil</span>
      </Link>

      <h1 className="mb-1 font-[family-name:var(--font-display)] text-2xl font-extrabold">
        Ton Wrapped CdM 🎬
      </h1>
      <p className="mb-6 text-sm text-[var(--color-muted)]">
        Ta Coupe du Monde en chiffres.
      </p>

      {!stats || stats.totalPredictions === 0 ? (
        <Card className="glass p-8 text-center">
          <p className="text-sm text-[var(--color-muted)]">
            Place tes premiers pronos et reviens : ton bilan se construit ici ! ⚽
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Hero : total points + pronos */}
          <Card className="glass-strong glow-gold flex items-center justify-between p-5">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
                Total points
              </p>
              <p className="text-gradient-gold font-[family-name:var(--font-display)] text-4xl font-extrabold">
                {stats.points}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
                Pronos
              </p>
              <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-cream)]">
                {stats.finished}
                <span className="text-base text-[var(--color-muted)]">
                  /{stats.totalPredictions}
                </span>
              </p>
            </div>
          </Card>

          {/* Grille de stats */}
          <div className="grid grid-cols-2 gap-3">
            {STATS.map((s) => (
              <Card key={s.label} className="glass p-4 text-center">
                <p className="text-2xl">{s.emoji}</p>
                <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-gold)]">
                  {s.value}
                </p>
                <p className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                  {s.label}
                </p>
              </Card>
            ))}
          </div>

          {/* Équipe fétiche */}
          {stats.favoriteTeam && (
            <Card className="glass flex items-center gap-3 p-4">
              <Flag code={stats.favoriteTeam.flag} team={stats.favoriteTeam.team} className="h-8 w-12" />
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                  Ton équipe fétiche
                </p>
                <p className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-cream)]">
                  {stats.favoriteTeam.team}
                </p>
              </div>
              <span className="rounded-full bg-[var(--color-surface-2)] px-2.5 py-1 text-xs font-semibold text-[var(--color-muted)]">
                soutenue {stats.favoriteTeam.count}×
              </span>
            </Card>
          )}

          {/* Meilleur prono */}
          {stats.bestPrediction && (
            <Card className="glass p-4">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                Ton meilleur prono
              </p>
              <div className="flex items-center gap-2 text-sm">
                <Flag code={stats.bestPrediction.homeFlag} team={stats.bestPrediction.homeTeam} className="h-4 w-6" />
                <span className="truncate font-medium">
                  {stats.bestPrediction.homeTeam}
                </span>
                <span className="font-[family-name:var(--font-display)] font-bold text-[var(--color-gold)]">
                  {stats.bestPrediction.resHome}-{stats.bestPrediction.resAway}
                </span>
                <span className="truncate font-medium">
                  {stats.bestPrediction.awayTeam}
                </span>
                <Flag code={stats.bestPrediction.awayFlag} team={stats.bestPrediction.awayTeam} className="h-4 w-6" />
                <span className="ml-auto shrink-0 rounded-full bg-[var(--color-gold)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-gold)]">
                  +{stats.bestPrediction.points} pts
                </span>
              </div>
              <p className="mt-1.5 text-xs italic text-[var(--color-muted)]">
                Ton prono : {stats.bestPrediction.predHome}-
                {stats.bestPrediction.predAway}
              </p>
            </Card>
          )}

          {/* Pari champion */}
          {stats.championPick && (
            <Card className="glass flex items-center gap-3 border-[var(--color-gold)]/25 bg-[var(--color-gold)]/[0.04] p-4">
              <span className="text-xl">🏆</span>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                  Ton pari pour le titre
                </p>
                <p className="flex items-center gap-2 font-[family-name:var(--font-display)] font-bold text-[var(--color-cream)]">
                  <Flag code={stats.championPick.flag} team={stats.championPick.team} className="h-4 w-6" />
                  {stats.championPick.team}
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-[var(--color-gold)]">
                +50 si 🏆
              </span>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
