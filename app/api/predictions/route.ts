import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jokerPhase, stagesOfPhase, jokerBudget } from "@/lib/jokers";
import { getActiveSeason, needsPenaltyPick } from "@/lib/season";
import { getBettingScope, isBettableMatch } from "@/lib/betting";

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
 *  - Match hors de la saison en cours : rejeté (une archive est en lecture seule).
 *  - Match hors du périmètre de pari (clubs suivis) : rejeté — cf. lib/betting.ts.
 *  - Joker : budget par phase, défini par la saison (cf. lib/jokers.ts).
 *  - Vainqueur aux tirs au but : ignoré là où il n'a pas de sens (manche d'une
 *    confrontation aller-retour, où un nul est un résultat normal).
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

  const [match, me, season] = await Promise.all([
    prisma.match.findUnique({ where: { id: matchId } }),
    // La session JWT ne reflète pas un bannissement prononcé après le login :
    // on vérifie en base à chaque écriture.
    prisma.user.findUnique({ where: { id: userId }, select: { banned: true } }),
    getActiveSeason(),
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

  // ── Saison : on ne prono que la compétition en cours ──
  if (season && match.seasonId && match.seasonId !== season.id) {
    return NextResponse.json(
      { error: "Ce match appartient à une saison terminée." },
      { status: 403 }
    );
  }

  // ── Périmètre de pari : tant qu'un club français est en lice, on ne parie
  // que sur ses matchs (évite de noyer les joueurs sous la phase de ligue) ──
  const scope = await getBettingScope(match.seasonId);
  if (!isBettableMatch(match, scope)) {
    return NextResponse.json(
      {
        error:
          "Ce match n'est pas ouvert aux pronos : tant qu'un club français est en lice, seuls ses matchs comptent.",
      },
      { status: 403 }
    );
  }

  // Vainqueur aux tirs au but : seulement là où un nul doit être départagé.
  const effectivePenaltyPick = needsPenaltyPick(season, match.stage)
    ? (penaltyPick ?? null)
    : null;

  // ── Règle Joker : budget par phase, propre à la saison ──
  if (joker) {
    const phase = jokerPhase(match.stage);
    const budget = jokerBudget(match.stage, season);
    const used = await prisma.prediction.count({
      where: {
        userId,
        joker: true,
        matchId: { not: matchId },
        match: {
          stage: { in: stagesOfPhase(phase) },
          ...(season ? { seasonId: season.id } : {}),
        },
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update: { homeScore, awayScore, joker, penaltyPick: effectivePenaltyPick, comment, submittedAt: new Date() } as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: { userId, matchId, homeScore, awayScore, joker, penaltyPick: effectivePenaltyPick, comment } as any,
  });

  return NextResponse.json({ ok: true, prediction }, { status: 200 });
}
