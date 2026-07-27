import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Swords, Copy, Skull, Clock } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { getDuels, getRivalry, getPlayersFlair } from "@/lib/fun";
import { getGroupMemberIds, requireActiveGroup } from "@/lib/groups";
import { getActiveSeason, hasTwoLeggedTies } from "@/lib/season";
import { cn } from "@/lib/utils";

export const metadata = { title: "Duels · DaronsFC" };
export const dynamic = "force-dynamic";

/**
 * Duels de journée et rivalités au sein du groupe actif. Tout est dérivé des
 * pronostics existants : aucune donnée saisie, rien à administrer.
 */
export default async function RivalsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const activeGroup = await requireActiveGroup(userId);
  const [memberIds, season] = await Promise.all([
    getGroupMemberIds(activeGroup.id),
    getActiveSeason(),
  ]);

  const users = await prisma.user
    .findMany({
      where: { id: { in: memberIds }, banned: false },
      select: { id: true, name: true },
    })
    .catch(() => []);
  const members = users.map((u) => ({ userId: u.id, name: u.name ?? "Anonyme" }));
  const twoLegged = hasTwoLeggedTies(season);

  const [duels, rivalry, flair] = await Promise.all([
    getDuels(userId, members, twoLegged),
    getRivalry(userId, members, twoLegged),
    getPlayersFlair(memberIds),
  ]);

  const mine = flair.get(userId);
  const nothingYet =
    duels.recent.length === 0 &&
    !rivalry.mirror &&
    !rivalry.shouldHaveCopied &&
    !rivalry.nemesis;

  return (
    <>
      <Link
        href="/profile"
        className="mb-5 inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-cream)]"
      >
        <ArrowLeft className="size-4" />
        <span>Profil</span>
      </Link>

      <PageHeader
        title="Duels & rivalités"
        subtitle={`${activeGroup.name} — qui domine qui ?`}
      />

      {nothingYet ? (
        <Card className="glass p-8 text-center">
          <Swords className="mx-auto mb-3 size-7 text-[var(--color-muted)]/50" />
          <p className="text-sm leading-relaxed text-[var(--color-muted)]">
            Rien à raconter pour l&apos;instant : il faut au moins une journée
            jouée, et des potes dans ton groupe. Reviens après les premiers
            matchs. ⚔️
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          {/* ── Ma série et ma ponctualité ── */}
          {mine && (mine.streak > 0 || mine.medianLeadMinutes !== null) && (
            <Card className="glass flex items-center gap-4 p-4">
              {mine.streak > 0 && (
                <div className="text-center">
                  <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-orange-400">
                    🔥{mine.streak}
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                    Série en cours
                  </p>
                </div>
              )}
              {mine.medianLeadMinutes !== null && (
                <div className="flex-1 border-l border-[var(--color-border-subtle)] pl-4">
                  <p className="flex items-center gap-1.5 text-sm text-[var(--color-cream)]">
                    <Clock className="size-3.5 text-[var(--color-muted)]" />
                    {formatLead(mine.medianLeadMinutes)}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                    {mine.medianLeadMinutes < 60
                      ? "Tu pronostiques au dernier moment. Le frisson, sans doute."
                      : "Ton avance habituelle avant le coup d'envoi."}
                  </p>
                </div>
              )}
            </Card>
          )}

          {/* ── Ce que tu aurais gagné ── */}
          {rivalry.shouldHaveCopied && (
            <Card className="glass border-[var(--color-gold)]/30 bg-[var(--color-gold)]/[0.05] p-4">
              <p className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                <Copy className="size-3.5" />
                Il fallait recopier
              </p>
              <p className="text-sm leading-relaxed text-[var(--color-cream)]">
                Sur les matchs que vous avez tous les deux pronostiqués,{" "}
                <strong className="text-[var(--color-gold)]">
                  {rivalry.shouldHaveCopied.name}
                </strong>{" "}
                a marqué{" "}
                <strong>{rivalry.shouldHaveCopied.theirPoints} pts</strong> quand
                tu en as pris{" "}
                <strong>{rivalry.shouldHaveCopied.myPoints}</strong>. Soit{" "}
                <strong className="text-[var(--color-gold)]">
                  +{rivalry.shouldHaveCopied.delta} pts
                </strong>{" "}
                si tu l&apos;avais bêtement copié.
              </p>
            </Card>
          )}

          {/* ── Ton miroir ── */}
          {rivalry.mirror && (
            <Card className="glass p-4">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                🪞 Ton miroir
              </p>
              <p className="text-sm leading-relaxed text-[var(--color-cream)]">
                <strong>{rivalry.mirror.name}</strong> pose exactement le même
                prono que toi{" "}
                <strong>{Math.round(rivalry.mirror.sameRate * 100)}%</strong> du
                temps ({rivalry.mirror.common} matchs en commun).
                {rivalry.mirror.sameRate > 0.5
                  ? " À ce stade, vous pourriez partager un compte."
                  : ""}
              </p>
            </Card>
          )}

          {/* ── Ta bête noire ── */}
          {rivalry.nemesis && (
            <Card className="glass border-[var(--color-danger)]/25 bg-[var(--color-danger)]/[0.05] p-4">
              <p className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                <Skull className="size-3.5" />
                Ta bête noire
              </p>
              <p className="text-sm leading-relaxed text-[var(--color-cream)]">
                <strong>{rivalry.nemesis.name}</strong> t&apos;a battu sur{" "}
                <strong>{rivalry.nemesis.lostTo}</strong> journée
                {rivalry.nemesis.lostTo > 1 ? "s" : ""} — tu n&apos;as fait mieux
                que {rivalry.nemesis.beat} fois.
              </p>
            </Card>
          )}

          {/* ── Bilan des duels ── */}
          {duels.opponents.length > 0 && (
            <div>
              <h2 className="mb-2 flex items-center gap-2 font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-widest text-[var(--color-muted)]">
                <Swords className="size-4" />
                Bilan des duels
              </h2>
              <Card className="glass overflow-hidden">
                <ul>
                  {duels.opponents.map((o, i) => (
                    <li
                      key={o.userId}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 text-sm",
                        i > 0 && "border-t border-[var(--color-border-subtle)]"
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {o.name}
                      </span>
                      <span className="shrink-0 font-[family-name:var(--font-mono)] text-sm">
                        <span className="font-bold text-[#22c55e]">{o.wins}</span>
                        <span className="text-[var(--color-muted)]"> – </span>
                        <span className="text-[var(--color-muted)]">{o.draws}</span>
                        <span className="text-[var(--color-muted)]"> – </span>
                        <span className="font-bold text-[var(--color-danger)]">
                          {o.losses}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
              <p className="mt-1.5 px-1 text-[11px] text-[var(--color-muted)]">
                À chaque journée, tu es opposé à un membre du groupe par
                rotation. Victoires – nuls – défaites.
              </p>
            </div>
          )}

          {/* ── Derniers duels ── */}
          {duels.recent.length > 0 && (
            <div>
              <h2 className="mb-2 font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-widest text-[var(--color-muted)]">
                Derniers duels
              </h2>
              <div className="flex flex-col gap-2">
                {duels.recent.map((d, i) => (
                  <Card
                    key={`${d.label}-${i}`}
                    className={cn(
                      "glass flex items-center gap-3 p-3 text-sm",
                      d.outcome === "win" && "border-[#22c55e]/30",
                      d.outcome === "loss" && "border-[var(--color-danger)]/30"
                    )}
                  >
                    <span className="w-6 shrink-0 text-center text-base leading-none">
                      {d.outcome === "win" ? "✅" : d.outcome === "loss" ? "❌" : "🤝"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[var(--color-cream)]">
                        vs {d.opponent.name}
                      </span>
                      <span className="text-xs text-[var(--color-muted)]">
                        {d.label}
                      </span>
                    </span>
                    <span className="shrink-0 font-[family-name:var(--font-mono)] font-bold">
                      {d.mine} – {d.theirs}
                    </span>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/** « 2 h 15 avant le coup d'envoi », « 12 min avant »… */
function formatLead(minutes: number): string {
  if (minutes < 60) return `Prono posé ~${minutes} min avant le coup d'envoi`;
  const h = Math.floor(minutes / 60);
  if (h < 24) return `Prono posé ~${h} h avant le coup d'envoi`;
  const d = Math.floor(h / 24);
  return `Prono posé ~${d} jour${d > 1 ? "s" : ""} avant le coup d'envoi`;
}
