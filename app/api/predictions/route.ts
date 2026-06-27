import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jokerPhase, stagesOfPhase, jokerBudget } from "@/lib/jokers";

const bodySchema = z.object({
  matchId: z.string().min(1),
  homeScore: z.number().int().min(0).max(20),
  awayScore: z.number().int().min(0).max(20),
  joker: z.boolean().optional().default(false),
  penaltyPick: z.enum(["home", "away"]).nullable().optional(),
  comment: z.string().max(280).optional(),
});

/**
 * Soumission / mise à jour d'un pronostic.
 *
 * Sécurité (non contournable côté client) :
 *  - Authentification requise.
 *  - Verrou serveur : rejet si `kickoffAt` (UTC) est déjà passé.
 *  - Joker : budget par phase (4 en poules, 2 en phase finale).
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

  const { matchId, homeScore, awayScore, joker, penaltyPick, comment } = parsed.data;
  const userId = session.user.id;

  const [match, me] = await Promise.all([
    prisma.match.findUnique({ where: { id: matchId } }),
    // La session JWT ne reflète pas un bannissement prononcé après le login :
    // on vérifie en base à chaque écriture.
    prisma.user.findUnique({ where: { id: userId }, select: { banned: true } }),
  ]);
  if (!me || me.banned) {
    return NextResponse.json({ error: "Compte suspendu." }, { status: 403 });
  }
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

  // ── Règle Joker : budget par phase (4 en poules, 2 en phase finale) ──
  if (joker) {
    const phase = jokerPhase(match.stage);
    const budget = jokerBudget(match.stage);
    const used = await prisma.prediction.count({
      where: {
        userId,
        joker: true,
        matchId: { not: matchId },
        match: { stage: { in: stagesOfPhase(phase) } },
      },
    });
    if (used >= budget) {
      return NextResponse.json(
        {
          error: `Budget de jokers épuisé pour cette phase (${budget} max).`,
        },
        { status: 409 }
      );
    }
  }

  const prediction = await prisma.prediction.upsert({
    where: { userId_matchId: { userId, matchId } },
    update: { homeScore, awayScore, joker, penaltyPick: penaltyPick ?? null, comment, submittedAt: new Date() } as any,
    create: { userId, matchId, homeScore, awayScore, joker, penaltyPick: penaltyPick ?? null, comment } as any,
  });

  return NextResponse.json({ ok: true, prediction }, { status: 200 });
}
