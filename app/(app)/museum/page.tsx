import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Skull } from "lucide-react";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Flag } from "@/components/flag";
import { getHorrorMuseum } from "@/lib/fun";
import { getGroupMemberIds, requireActiveGroup } from "@/lib/groups";

export const metadata = { title: "Musée des horreurs · DaronsFC" };
export const dynamic = "force-dynamic";

/**
 * Les pires pronostics du groupe, TOUTES SAISONS confondues. Un patrimoine que
 * la remise à zéro de chaque saison n'effacera pas.
 */
export default async function MuseumPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const activeGroup = await requireActiveGroup(session.user.id);
  const memberIds = await getGroupMemberIds(activeGroup.id);
  const entries = await getHorrorMuseum(memberIds, 15);

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
        title="Musée des horreurs"
        subtitle="Les pronos qu'on aimerait oublier — toutes saisons"
      />

      {entries.length === 0 ? (
        <Card className="glass p-8 text-center">
          <Skull className="mx-auto mb-3 size-7 text-[var(--color-muted)]/50" />
          <p className="text-sm leading-relaxed text-[var(--color-muted)]">
            Le musée est vide. Profitez-en, ça ne durera pas. 💀
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2.5">
          {entries.map((e, i) => (
            <Card key={`${e.matchId}-${e.player}`} className="glass p-3.5">
              <div className="mb-2 flex items-center gap-2">
                <span className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-muted)]/50">
                  #{i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold text-[var(--color-cream)]">
                  {e.player}
                </span>
                {e.joker && (
                  <span className="shrink-0 rounded-full bg-[var(--color-gold)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-gold)]">
                    🃏 joker
                  </span>
                )}
                <span className="shrink-0 rounded-full bg-[var(--color-danger)]/15 px-2 py-0.5 text-[10px] font-bold text-[var(--color-danger)]">
                  {e.gap} buts d&apos;écart
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Flag code={e.homeFlag} className="h-4 w-6 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{e.homeTeam}</span>
                <span className="shrink-0 font-[family-name:var(--font-mono)]">
                  <span className="text-[var(--color-danger)] line-through decoration-1">
                    {e.predHome}
                  </span>
                  <span className="mx-1 text-[var(--color-muted)]">→</span>
                  <span className="font-bold text-[var(--color-cream)]">
                    {e.resHome}
                  </span>
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm">
                <Flag code={e.awayFlag} className="h-4 w-6 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{e.awayTeam}</span>
                <span className="shrink-0 font-[family-name:var(--font-mono)]">
                  <span className="text-[var(--color-danger)] line-through decoration-1">
                    {e.predAway}
                  </span>
                  <span className="mx-1 text-[var(--color-muted)]">→</span>
                  <span className="font-bold text-[var(--color-cream)]">
                    {e.resAway}
                  </span>
                </span>
              </div>

              <p className="mt-2 border-t border-[var(--color-border-subtle)] pt-2 text-[11px] text-[var(--color-muted)]">
                {e.seasonName}
              </p>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
