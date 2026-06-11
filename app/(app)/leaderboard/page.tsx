import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getLeaderboard, getBadges } from "@/lib/data/queries";

export const metadata = { title: "Classement · DaronsFC" };
export const dynamic = "force-dynamic";

const MEDALS = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];

export default async function LeaderboardPage() {
  const [sorted, badges] = await Promise.all([getLeaderboard(), getBadges()]);
  const top3 = sorted.slice(0, 3);
  const rest = sorted;

  const badgeEmoji = (key: string) =>
    badges.find((b) => b.key === key)?.emoji ?? "";

  return (
    <>
      <PageHeader title="Classement" subtitle="La bande des darons" />

      {sorted.length === 0 && (
        <Card className="glass mt-4 p-8 text-center">
          <p className="text-sm text-[var(--color-muted)]">
            Aucun joueur class\u00e9 pour l&apos;instant. Les points arrivent apr\u00e8s
            les premiers matchs. \ud83c\udfc6
          </p>
        </Card>
      )}

      {/* ── Podium ── */}
      <div className="flex items-end justify-center gap-3 px-2 pt-4 pb-8">
        {/* 2nd place — left */}
        {top3[1] && (
          <PodiumCard
            rank={2}
            name={top3[1].name}
            points={top3[1].points}
            index={1}
          />
        )}

        {/* 1st place — center, bigger */}
        {top3[0] && (
          <PodiumCard
            rank={1}
            name={top3[0].name}
            points={top3[0].points}
            index={0}
            champion
          />
        )}

        {/* 3rd place — right */}
        {top3[2] && (
          <PodiumCard
            rank={3}
            name={top3[2].name}
            points={top3[2].points}
            index={2}
          />
        )}
      </div>

      {/* ── Full Ranking ── */}
      <div className="flex flex-col gap-2">
        {rest.map((user, i) => {
          const isTop3 = i < 3;
          const isChampion = i === 0;

          return (
            <Card
              key={user.email}
              className={cn(
                "flex items-center gap-3 p-3 transition-colors duration-200 hover:bg-[var(--color-surface-2)]",
                isChampion &&
                  "border-[var(--color-gold)]/30 bg-[var(--color-gold)]/[0.04]"
              )}
            >
              {/* Rank */}
              <span
                className={cn(
                  "w-8 text-center font-[family-name:var(--font-display)] text-lg font-bold",
                  isChampion && "text-[var(--color-gold)]"
                )}
              >
                {isTop3 ? MEDALS[i] : i + 1}
              </span>

              {/* Name + badges */}
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "truncate font-medium",
                    isChampion && "font-bold"
                  )}
                >
                  {user.name}
                </p>
                <div className="flex items-center gap-2">
                  {user.badges.length > 0 && (
                    <span className="text-xs leading-none">
                      {user.badges.map(badgeEmoji).join(" ")}
                    </span>
                  )}
                  <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-muted)]">
                    {user.exactScores} score
                    {user.exactScores !== 1 ? "s" : ""} exact
                    {user.exactScores !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* Points */}
              <span
                className={cn(
                  "font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums",
                  isChampion
                    ? "text-[var(--color-gold-bright)]"
                    : "text-[var(--color-gold)]"
                )}
              >
                {user.points}
              </span>
            </Card>
          );
        })}
      </div>
    </>
  );
}

/* ─── Podium card ─── */

function PodiumCard({
  rank,
  name,
  points,
  index,
  champion = false,
}: {
  rank: number;
  name: string;
  points: number;
  index: number;
  champion?: boolean;
}) {
  const heights = ["h-40", "h-28", "h-24"] as const;

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2",
        champion && "animate-stagger",
        !champion && `stagger-${index + 1}`
      )}
      style={{ animationDelay: champion ? "0ms" : `${(index + 1) * 150}ms` }}
    >
      {/* Crown for 1st */}
      {champion && (
        <span className="text-2xl drop-shadow-[0_0_8px_var(--color-gold)]">
          {"\u{1F451}"}
        </span>
      )}

      {/* Avatar */}
      <div
        className={cn(
          "flex items-center justify-center rounded-full border-2 font-[family-name:var(--font-display)] font-bold",
          champion
            ? "h-16 w-16 border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-2xl text-[var(--color-gold-bright)] shadow-[0_0_20px_var(--color-gold)]/30"
            : "h-12 w-12 border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] text-lg text-[var(--color-cream)]"
        )}
      >
        {name[0]}
      </div>

      {/* Info */}
      <p
        className={cn(
          "font-[family-name:var(--font-display)] font-semibold",
          champion ? "text-sm" : "text-xs"
        )}
      >
        {name}
      </p>
      <p
        className={cn(
          "font-[family-name:var(--font-display)] font-bold tabular-nums",
          champion
            ? "text-xl text-[var(--color-gold-bright)]"
            : "text-base text-[var(--color-gold)]"
        )}
      >
        {points} pts
      </p>

      {/* Pedestal */}
      <div
        className={cn(
          "w-full rounded-t-lg",
          heights[rank - 1],
          champion
            ? "w-24 bg-gradient-to-t from-[var(--color-gold)]/20 to-[var(--color-gold)]/5 border border-[var(--color-gold)]/20"
            : "w-20 bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)]"
        )}
      />
    </div>
  );
}
