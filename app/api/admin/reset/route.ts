import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveSeason } from "@/lib/season";

/**
 * Remise à zéro des données de JEU de la SAISON EN COURS. Réservé aux admins.
 *
 * Efface : pronostics (+ jokers), résultats, messages (+ réactions), badges
 * décernés. Remet tous les scores à 0.
 * CONSERVE : comptes utilisateurs, calendrier des matchs, groupes d'amis, et
 * TOUT ce qui appartient aux saisons archivées.
 *
 *   POST /api/admin/reset
 */
export async function POST() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès réservé aux admins." }, { status: 403 });
  }

  const season = await getActiveSeason();
  if (!season) {
    return NextResponse.json({ error: "Aucune saison en cours." }, { status: 400 });
  }

  try {
    const [predictions, results, messages, badges] = await prisma.$transaction([
      prisma.prediction.deleteMany({ where: { match: { seasonId: season.id } } }),
      prisma.result.deleteMany({ where: { match: { seasonId: season.id } } }),
      // Les réactions sont supprimées en cascade avec les messages.
      prisma.message.deleteMany({ where: { group: { seasonId: season.id } } }),
      prisma.userBadge.deleteMany(),
      prisma.score.updateMany({
        data: {
          points: 0,
          exactScores: 0,
          correctResults: 0,
          previousRank: null,
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      predictions: predictions.count,
      results: results.count,
      messages: messages.count,
      badges: badges.count,
    });
  } catch (err) {
    console.error("[admin/reset] échec:", err);
    return NextResponse.json({ error: "Échec de la remise à zéro." }, { status: 500 });
  }
}
