import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { compareRanked } from "@/lib/ranking";

/**
 * Clôture le tournoi : attribue le badge « daronissime » 👑 au joueur en tête
 * du classement DE CHAQUE GROUPE (un vainqueur par groupe, pas de vainqueur
 * global). Réservé aux admins. Idempotent (upsert).
 *
 *   POST /api/admin/close-tournament
 */
export async function POST() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès réservé aux admins." }, { status: 403 });
  }

  const badge = await prisma.badge.findUnique({ where: { key: "daronissime" } });
  if (!badge) {
    return NextResponse.json({ error: "Badge introuvable." }, { status: 500 });
  }

  // Tous les groupes avec leurs membres (non bannis), leur score et leur nom.
  const groups = await prisma.group.findMany({
    include: {
      members: {
        where: { user: { banned: false } },
        include: { user: { include: { score: true } } },
      },
    },
  });

  // Vainqueur de chaque groupe : meilleur classé (départage officiel) avec
  // au moins 1 point. Un même joueur peut gagner plusieurs groupes (1 badge).
  const winners = new Map<string, string>(); // userId → nom
  const champions: { group: string; champion: string }[] = [];

  for (const g of groups) {
    const ranked = g.members
      .map((m) => ({
        userId: m.userId,
        name: m.user.name ?? "Anonyme",
        points: m.user.score?.points ?? 0,
        exactScores: m.user.score?.exactScores ?? 0,
        correctResults: m.user.score?.correctResults ?? 0,
      }))
      .sort(compareRanked);

    const top = ranked[0];
    if (!top || top.points === 0) continue;

    winners.set(top.userId, top.name);
    champions.push({ group: g.name, champion: top.name });
  }

  if (winners.size === 0) {
    return NextResponse.json(
      { error: "Aucun joueur classé pour décerner le titre." },
      { status: 400 }
    );
  }

  await Promise.all(
    [...winners.keys()].map((userId) =>
      prisma.userBadge.upsert({
        where: { userId_badgeId: { userId, badgeId: badge.id } },
        update: {},
        create: { userId, badgeId: badge.id },
      })
    )
  );

  return NextResponse.json({ ok: true, winners: winners.size, champions });
}
