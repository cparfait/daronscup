import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ArrowLeft, Trophy, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Flag } from "@/components/flag";
import { getGroupChampionPicks } from "@/lib/data/queries";
import { getGroupMemberIds, requireActiveGroup } from "@/lib/groups";

export const metadata = { title: "Champions du groupe · DaronsFC" };
export const dynamic = "force-dynamic";

function FanAvatar({ name, avatar }: { name: string; avatar: string | null }) {
  if (avatar) {
    return (
      <Image
        src={avatar}
        alt={name}
        width={24}
        height={24}
        className="size-6 rounded-full object-cover ring-1 ring-[var(--color-border-medium)]"
      />
    );
  }
  return (
    <span className="flex size-6 items-center justify-center rounded-full bg-[var(--color-surface-3)] text-[10px] font-bold uppercase text-[var(--color-cream)] ring-1 ring-[var(--color-border-medium)]">
      {name.charAt(0)}
    </span>
  );
}

export default async function ChampionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const activeGroup = await requireActiveGroup(userId);
  const memberIds = await getGroupMemberIds(activeGroup.id);
  const picks = await getGroupChampionPicks(memberIds);

  const deciders = picks.reduce((n, p) => n + p.fans.length, 0);

  return (
    <>
      <Link
        href="/dashboard"
        className="mb-5 inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-cream)]"
      >
        <ArrowLeft className="size-4" />
        <span>Hub</span>
      </Link>

      <PageHeader
        title="Les champions du groupe"
        subtitle={`${activeGroup.name} · qui mise sur qui ?`}
      />

      <div className="mb-5 flex items-center gap-2 text-xs text-[var(--color-muted)]">
        <Users className="size-3.5" />
        <span>
          {deciders}/{memberIds.length} joueur{memberIds.length > 1 ? "s" : ""}{" "}
          {deciders > 1 ? "ont" : "a"} choisi leur champion
        </span>
      </div>

      {picks.length === 0 ? (
        <Card className="glass p-8 text-center">
          <Trophy className="mx-auto mb-3 size-7 text-[var(--color-muted)]/50" />
          <p className="text-sm text-[var(--color-muted)]">
            Personne n&apos;a encore désigné son champion du tournoi.
            Sois le premier depuis le Hub ! 🏆
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2.5">
          {picks.map((p, i) => {
            const leader = i === 0;
            return (
              <Card
                key={p.team}
                className={
                  "glass card-hover p-4" +
                  (leader
                    ? " border-[var(--color-gold)]/30 bg-[var(--color-gold)]/[0.05]"
                    : "")
                }
              >
                <div className="flex items-center gap-3">
                  <Flag code={p.flag} team={p.team} className="h-8 w-11 shrink-0 drop-shadow" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-[family-name:var(--font-display)] text-base font-bold text-[var(--color-cream)]">
                      {p.team}
                      {leader && (
                        <span className="rounded-full bg-[var(--color-gold)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-gold)]">
                          Favori
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-[var(--color-muted)]">
                      {p.fans.length} vote{p.fans.length > 1 ? "s" : ""}
                    </p>
                  </div>
                  <span
                    className={
                      "font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums" +
                      (leader
                        ? " text-[var(--color-gold-bright)]"
                        : " text-[var(--color-muted)]")
                    }
                  >
                    {p.fans.length}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[var(--color-border-subtle)] pt-3">
                  {p.fans.map((f) => (
                    <span
                      key={f.userId}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-2)] py-1 pl-1 pr-2.5 text-xs"
                    >
                      <FanAvatar name={f.name} avatar={f.avatar} />
                      <span className="max-w-[10rem] truncate font-medium">
                        {f.name}
                      </span>
                    </span>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
