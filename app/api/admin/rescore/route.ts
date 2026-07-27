import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyMatchResult } from "@/lib/football-data";
import { getActiveSeason } from "@/lib/season";

/**
 * Recalcule les points de la SAISON EN COURS à partir des résultats enregistrés.
 * À utiliser après un changement de barème (ex. règle des nuls) : ré-applique
 * chaque résultat avec `force`, ce qui recalcule intégralement les scores.
 * Idempotent — un second appel ne change rien. Réservé aux admins.
 *
 *   POST /api/admin/rescore
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
    const results = await prisma.result.findMany({
      where: { status: "FINISHED", match: { seasonId: season.id } },
      select: { matchId: true, homeScore: true, awayScore: true },
    });

    let predictions = 0;
    for (const r of results) {
      const { scored } = await applyMatchResult(r.matchId, r.homeScore, r.awayScore, {
        force: true,
      });
      predictions += scored;
    }

    return NextResponse.json({ ok: true, matches: results.length, predictions });
  } catch (err) {
    console.error("[admin/rescore] échec:", err);
    return NextResponse.json({ error: "Échec du recalcul." }, { status: 500 });
  }
}
