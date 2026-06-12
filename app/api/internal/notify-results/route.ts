import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/push";
import { compareRanked } from "@/lib/ranking";

/**
 * Envoie les notifications push « résultat tombé » pour les matchs terminés
 * pas encore notifiés, puis les marque comme notifiés. Route NODE-only,
 * appelée en interne par la boucle de sync (instrumentation) via HTTP — ce qui
 * évite que web-push entre dans le bundle edge.
 *
 * Protégée par l'en-tête `x-internal-secret` = AUTH_SECRET.
 */
export async function POST(req: Request) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || req.headers.get("x-internal-secret") !== secret) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const pending = await prisma.result.findMany({
    where: { status: "FINISHED", notified: false },
    include: {
      match: {
        select: {
          homeTeam: true,
          awayTeam: true,
          predictions: { select: { userId: true } },
        },
      },
    },
    take: 20,
  });

  let sent = 0;
  for (const r of pending) {
    const userIds = [...new Set(r.match.predictions.map((p) => p.userId))];
    if (userIds.length > 0) {
      await sendPushToUsers(userIds, {
        title: "Résultat tombé ⚽",
        body: `${r.match.homeTeam} ${r.homeScore} - ${r.awayScore} ${r.match.awayTeam} — découvre tes points !`,
        url: "/leaderboard",
      });
      sent++;
    }
    await prisma.result.update({
      where: { matchId: r.matchId },
      data: { notified: true },
    });
  }

  // Notification « tu t'es fait doubler » : joueurs dont le rang a baissé
  // depuis le dernier match (previousRank figé avant l'attribution des points).
  if (pending.length > 0) {
    // Même comparateur que le classement affiché (snapshotRanks / leaderboard),
    // sinon deux joueurs à égalité pourraient être « doublés » à tort.
    const scores = await prisma.score.findMany({
      where: { user: { banned: false } },
      select: {
        userId: true,
        previousRank: true,
        points: true,
        exactScores: true,
        correctResults: true,
        user: { select: { name: true } },
      },
    });
    const dropped = scores
      .map((s) => ({ ...s, name: s.user.name }))
      .sort(compareRanked)
      .map((s, i) => ({ userId: s.userId, rank: i + 1, prev: s.previousRank }))
      .filter((s) => s.prev != null && s.rank > s.prev)
      .map((s) => s.userId);
    if (dropped.length > 0) {
      await sendPushToUsers(dropped, {
        title: "Tu t'es fait doubler ! 😱",
        body: "Le classement a bougé — va voir où tu en es.",
        url: "/leaderboard",
      });
    }
  }

  return NextResponse.json({ ok: true, processed: pending.length, sent });
}
