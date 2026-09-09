import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Swords, Copy, Skull, Clock, Flame, History } from "lucide-react";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { DuelCard } from "@/components/duel-card";
import {
  getDuels,
  getRivalry,
  getPlayersFlair,
  getCurrentDuel,
  getDuelMembers,
} from "@/lib/fun";
import { getGroupMemberIds, requireActiveGroup } from "@/lib/groups";
import { getViewingSeason, hasTwoLeggedTies } from "@/lib/season";
import { cn } from "@/lib/utils";

export const metadata = { title: "Duels · DaronsFC" };
export const dynamic = "force-dynamic";

// Couleurs littérales (pas les variables de thème) : le vert « victoire » doit
// rester vert même quand `--color-pitch` passe en bleu (thème France) ou aux
// couleurs d'un club. Chaque encart a sa teinte, pour qu'on distingue les
// rubriques d'un coup d'œil en scrollant.
const WIN = "#22c55e";
const LOSS = "#ef4444";
const MIRROR = "#a78bfa"; // violet — le miroir
const LEAD = "#38bdf8"; // cyan — la ponctualité
const STREAK = "#fb923c"; // orange — la série

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
    getViewingSeason(),
  ]);

  const members = await getDuelMembers(memberIds);
  const twoLegged = hasTwoLeggedTies(season);

  const [duels, rivalry, flair, currentDuel] = await Promise.all([
    getDuels(userId, members, twoLegged),
    getRivalry(userId, members, twoLegged),
    getPlayersFlair(memberIds),
    getCurrentDuel(userId, members, twoLegged),
  ]);

  const mine = flair.get(userId);
  const nothingYet =
    !currentDuel &&
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
          {/* ── Le duel en cours, en tête : c'est le seul qui se joue encore ── */}
          {currentDuel && (
            <div>
              <SectionTitle icon={Swords} color="var(--color-gold)">
                Duel de la journée
              </SectionTitle>
              <DuelCard duel={currentDuel} href={null} />
            </div>
          )}

          {/* ── Ma série et ma ponctualité ── */}
          {mine && (mine.streak > 0 || mine.medianLeadMinutes !== null) && (
            <Card className="glass flex items-stretch gap-4 overflow-hidden p-4">
              {mine.streak > 0 && (
                <div
                  className="-my-4 -ml-4 flex flex-col items-center justify-center px-4 text-center"
                  style={{
                    background: `linear-gradient(180deg, ${STREAK}22, transparent)`,
                  }}
                >
                  <Flame className="size-4" style={{ color: STREAK }} />
                  <p
                    className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold leading-none"
                    style={{ color: STREAK }}
                  >
                    {mine.streak}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                    Série
                  </p>
                </div>
              )}
              {mine.medianLeadMinutes !== null && (
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm text-[var(--color-cream)]">
                    <Clock className="size-3.5 shrink-0" style={{ color: LEAD }} />
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
            <Accent color="var(--color-gold)" icon={Copy} label="Il fallait recopier">
              Sur les matchs que vous avez tous les deux pronostiqués,{" "}
              <strong className="text-[var(--color-gold)]">
                {rivalry.shouldHaveCopied.name}
              </strong>{" "}
              a marqué{" "}
              <strong>{rivalry.shouldHaveCopied.theirPoints} pts</strong> quand tu
              en as pris <strong>{rivalry.shouldHaveCopied.myPoints}</strong>. Soit{" "}
              <strong className="text-[var(--color-gold)]">
                +{rivalry.shouldHaveCopied.delta} pts
              </strong>{" "}
              si tu l&apos;avais bêtement copié.
            </Accent>
          )}

          {/* ── Ton miroir ── */}
          {rivalry.mirror && (
            <Accent color={MIRROR} emoji="🪞" label="Ton miroir">
              <strong style={{ color: MIRROR }}>{rivalry.mirror.name}</strong> pose
              exactement le même prono que toi{" "}
              <strong style={{ color: MIRROR }}>
                {Math.round(rivalry.mirror.sameRate * 100)}%
              </strong>{" "}
              du temps ({rivalry.mirror.common} matchs en commun).
              {rivalry.mirror.sameRate > 0.5
                ? " À ce stade, vous pourriez partager un compte."
                : ""}
            </Accent>
          )}

          {/* ── Ta bête noire ── */}
          {rivalry.nemesis && (
            <Accent color={LOSS} icon={Skull} label="Ta bête noire">
              <strong style={{ color: LOSS }}>{rivalry.nemesis.name}</strong>{" "}
              t&apos;a battu sur <strong>{rivalry.nemesis.lostTo}</strong> journée
              {rivalry.nemesis.lostTo > 1 ? "s" : ""} — tu n&apos;as fait mieux que{" "}
              {rivalry.nemesis.beat} fois.
            </Accent>
          )}

          {/* ── Bilan des duels ── */}
          {duels.opponents.length > 0 && (
            <div>
              <SectionTitle icon={Swords} color={WIN}>
                Bilan des duels
              </SectionTitle>
              <Card className="glass overflow-hidden">
                <ul>
                  {duels.opponents.map((o, i) => {
                    const played = o.wins + o.draws + o.losses;
                    const pct = (n: number) =>
                      played > 0 ? `${(n / played) * 100}%` : "0%";
                    return (
                      <li
                        key={o.userId}
                        className={cn(
                          "px-4 py-2.5",
                          i > 0 && "border-t border-[var(--color-border-subtle)]"
                        )}
                      >
                        <div className="flex items-center gap-3 text-sm">
                          <span className="min-w-0 flex-1 truncate font-medium">
                            {o.name}
                          </span>
                          <span className="shrink-0 font-[family-name:var(--font-mono)] text-sm">
                            <span className="font-bold" style={{ color: WIN }}>
                              {o.wins}
                            </span>
                            <span className="text-[var(--color-muted)]"> – </span>
                            <span className="text-[var(--color-muted)]">
                              {o.draws}
                            </span>
                            <span className="text-[var(--color-muted)]"> – </span>
                            <span className="font-bold" style={{ color: LOSS }}>
                              {o.losses}
                            </span>
                          </span>
                        </div>
                        {/* Barre V/N/D : le bilan se lit sans compter. */}
                        {played > 0 && (
                          <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
                            <span
                              style={{ width: pct(o.wins), background: WIN }}
                            />
                            <span
                              style={{
                                width: pct(o.draws),
                                background: "var(--color-muted)",
                              }}
                            />
                            <span
                              style={{ width: pct(o.losses), background: LOSS }}
                            />
                          </div>
                        )}
                      </li>
                    );
                  })}
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
              <SectionTitle icon={History} color={LEAD}>
                Derniers duels
              </SectionTitle>
              <div className="flex flex-col gap-2">
                {duels.recent.map((d, i) => {
                  const tint =
                    d.outcome === "win" ? WIN : d.outcome === "loss" ? LOSS : null;
                  return (
                    <Card
                      key={`${d.label}-${i}`}
                      className="glass relative flex items-center gap-3 overflow-hidden p-3 pl-4 text-sm"
                      style={
                        tint
                          ? {
                              borderColor: `${tint}59`,
                              background: `linear-gradient(90deg, ${tint}1f, transparent 60%)`,
                            }
                          : undefined
                      }
                    >
                      {/* Liseré de couleur : gagné / perdu se voit avant de lire. */}
                      <span
                        className="absolute inset-y-0 left-0 w-1"
                        style={{ background: tint ?? "var(--color-muted)" }}
                      />
                      <span className="w-6 shrink-0 text-center text-base leading-none">
                        {d.outcome === "win"
                          ? "✅"
                          : d.outcome === "loss"
                            ? "❌"
                            : "🤝"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[var(--color-cream)]">
                          vs {d.opponent.name}
                        </span>
                        <span className="text-xs text-[var(--color-muted)]">
                          {d.label}
                        </span>
                      </span>
                      <span
                        className="shrink-0 font-[family-name:var(--font-mono)] font-bold"
                        style={{ color: tint ?? undefined }}
                      >
                        {d.mine} – {d.theirs}
                      </span>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/** Titre de rubrique, avec pastille colorée — repère visuel au scroll. */
function SectionTitle({
  icon: Icon,
  color,
  children,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <h2 className="mb-2 flex items-center gap-2 font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-widest text-[var(--color-muted)]">
      <span
        className="flex size-6 items-center justify-center rounded-lg"
        style={{ background: `${colorAlpha(color)}` }}
      >
        <Icon className="size-3.5" style={{ color }} />
      </span>
      {children}
    </h2>
  );
}

/** Encart d'anecdote teinté (miroir, bête noire, « il fallait recopier »…). */
function Accent({
  color,
  icon: Icon,
  emoji,
  label,
  children,
}: {
  color: string;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  emoji?: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Card
      className="glass relative overflow-hidden p-4 pl-5"
      style={{
        borderColor: `${colorAlpha(color, "4d")}`,
        background: `linear-gradient(135deg, ${colorAlpha(color, "1a")}, transparent 70%)`,
      }}
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: color }} />
      <p
        className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider"
        style={{ color }}
      >
        {Icon ? <Icon className="size-3.5" /> : <span>{emoji}</span>}
        {label}
      </p>
      <p className="text-sm leading-relaxed text-[var(--color-cream)]">{children}</p>
    </Card>
  );
}

/**
 * Teinte translucide d'une couleur d'accent. Les hex littéraux acceptent un
 * suffixe alpha ; les variables CSS (`var(--color-gold)`) passent par
 * `color-mix`, qui, lui, ne se concatène pas.
 */
function colorAlpha(color: string, alpha = "26"): string {
  if (color.startsWith("#")) return `${color}${alpha}`;
  const pct = Math.round((parseInt(alpha, 16) / 255) * 100);
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}

/** « 2 h 15 avant le coup d'envoi », « 12 min avant »… */
function formatLead(minutes: number): string {
  if (minutes < 60) return `Prono posé ~${minutes} min avant le coup d'envoi`;
  const h = Math.floor(minutes / 60);
  if (h < 24) return `Prono posé ~${h} h avant le coup d'envoi`;
  const d = Math.floor(h / 24);
  return `Prono posé ~${d} jour${d > 1 ? "s" : ""} avant le coup d'envoi`;
}
