import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  matchId: z.string().min(1),
  homeScore: z.number().int().min(0).max(20),
  awayScore: z.number().int().min(0).max(20),
  joker: z.boolean().optional().default(false),
  comment: z.string().max(280).optional(),
});

/**
 * Soumission / mise à jour d'un pronostic.
 *
 * Sécurité (non contournable côté client) :
 *  - Authentification requise.
 *  - Verrou serveur : rejet si `kickoffAt` (UTC) est déjà passé.
 *  - Joker : 1 seul par journée (matchday) — verrouillé avec le prono.
 *  - Horodatage `submittedAt` conservé en base.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Requête invalide.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { matchId, homeScore, awayScore, joker, comment } = parsed.data;
  const userId = session.user.id;

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) {
    return NextResponse.json({ error: "Match introuvable." }, { status: 404 });
  }

  // ── VERROU SERVEUR — comparaison UTC, non contournable ──
  if (Date.now() >= match.kickoffAt.getTime()) {
    return NextResponse.json(
      { error: "Pronostics fermés : le coup d'envoi est passé." },
      { status: 403 }
    );
  }

  // ── Règle Joker : 1 seul match par journée ──
  if (joker && match.matchday != null) {
    const existingJoker = await prisma.prediction.findFirst({
      where: {
        userId,
        joker: true,
        matchId: { not: matchId },
        match: { matchday: match.matchday },
      },
      select: { matchId: true },
    });
    if (existingJoker) {
      return NextResponse.json(
        { error: "Joker déjà utilisé sur un autre match de cette journée." },
        { status: 409 }
      );
    }
  }

  const prediction = await prisma.prediction.upsert({
    where: { userId_matchId: { userId, matchId } },
    update: { homeScore, awayScore, joker, comment, submittedAt: new Date() },
    create: { userId, matchId, homeScore, awayScore, joker, comment },
  });

  return NextResponse.json({ ok: true, prediction }, { status: 200 });
}
