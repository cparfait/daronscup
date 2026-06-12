import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Clôture le tournoi : attribue le badge « daronissime » 👑 au joueur en tête
 * du classement. Réservé aux admins. Idempotent (upsert).
 *
 *   POST /api/admin/close-tournament
 */
export async function POST() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès réservé aux admins." }, { status: 403 });
  }

  const top = await prisma.score.findFirst({
    where: { user: { banned: false } },
    orderBy: [
      { points: "desc" },
      { exactScores: "desc" },
      { correctResults: "desc" },
    ],
    include: { user: { select: { name: true } } },
  });

  if (!top || top.points === 0) {
    return NextResponse.json(
      { error: "Aucun joueur classé pour décerner le titre." },
      { status: 400 }
    );
  }

  const badge = await prisma.badge.findUnique({ where: { key: "daronissime" } });
  if (!badge) {
    return NextResponse.json({ error: "Badge introuvable." }, { status: 500 });
  }

  await prisma.userBadge.upsert({
    where: { userId_badgeId: { userId: top.userId, badgeId: badge.id } },
    update: {},
    create: { userId: top.userId, badgeId: badge.id },
  });

  return NextResponse.json({ ok: true, champion: top.user.name ?? "Anonyme" });
}
