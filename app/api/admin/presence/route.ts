import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ONLINE_WINDOW_MS } from "@/lib/presence";

/**
 * Liste des joueurs « en ligne » (heartbeat dans la fenêtre) — pour décider
 * quand pousser une mise à jour sans gêner personne. Admins uniquement.
 *
 *   GET /api/admin/presence
 */
export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès réservé aux admins." }, { status: 403 });
  }
  const since = new Date(Date.now() - ONLINE_WINDOW_MS);
  const online = await prisma.user.findMany({
    where: { banned: false, lastSeenAt: { gte: since } },
    select: { name: true, lastSeenAt: true },
    orderBy: { lastSeenAt: "desc" },
  });
  return NextResponse.json({
    count: online.length,
    users: online.map((u) => u.name ?? "Daron"),
  });
}
