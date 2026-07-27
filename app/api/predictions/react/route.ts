import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Même filtre que les réactions du tchat : n'importe quel emoji Unicode, mais
// rien d'autre (sinon « 1 » ou « # » passeraient).
const EMOJI_ONLY = /^[\p{Emoji}\p{Emoji_Component}‍️]+$/u;
const MEANINGFUL = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;

const schema = z.object({
  predictionId: z.string().min(1),
  emoji: z
    .string()
    .min(1)
    .max(40)
    .refine((e) => EMOJI_ONLY.test(e) && MEANINGFUL.test(e), "Emoji invalide"),
});

/**
 * Ajoute / retire une réaction emoji sur le PRONOSTIC d'un joueur (toggle).
 *
 *   POST /api/predictions/react  { predictionId, emoji }
 *
 * Garde-fous :
 *  - anti-influence : impossible de réagir avant le coup d'envoi, sinon la
 *    réaction révélerait le prono d'un autre joueur ;
 *  - il faut partager un groupe avec l'auteur du prono (on ne chambre pas des
 *    inconnus, et un admin en consultation reste en lecture seule).
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Réaction invalide" }, { status: 400 });
  }
  const { predictionId, emoji } = parsed.data;
  const userId = session.user.id;

  const prediction = await prisma.prediction.findUnique({
    where: { id: predictionId },
    select: { userId: true, match: { select: { kickoffAt: true, seasonId: true } } },
  });
  if (!prediction) {
    return NextResponse.json({ error: "Prono introuvable" }, { status: 404 });
  }

  // ── Anti-influence : les pronos ne sont publics qu'après le coup d'envoi ──
  if (Date.now() < prediction.match.kickoffAt.getTime()) {
    return NextResponse.json(
      { error: "Les pronos ne sont visibles qu'après le coup d'envoi." },
      { status: 403 }
    );
  }

  // ── Il faut jouer dans le même groupe que l'auteur ──
  if (prediction.userId !== userId) {
    const shared = await prisma.groupMember.findFirst({
      where: {
        userId,
        group: {
          seasonId: prediction.match.seasonId,
          members: { some: { userId: prediction.userId } },
        },
      },
      select: { groupId: true },
    });
    if (!shared) {
      return NextResponse.json({ error: "Lecture seule." }, { status: 403 });
    }
  }

  const existing = await prisma.reaction.findUnique({
    where: { predictionId_userId_emoji: { predictionId, userId, emoji } },
  });

  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true, reacted: false });
  }
  await prisma.reaction.create({ data: { predictionId, userId, emoji } });
  return NextResponse.json({ ok: true, reacted: true });
}
