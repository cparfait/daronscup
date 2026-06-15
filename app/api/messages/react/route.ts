import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED = ["👍", "😂", "🔥", "😮", "⚽", "💀"];

const schema = z.object({
  messageId: z.string().min(1),
  emoji: z.string().refine((e) => ALLOWED.includes(e), "Emoji non autorisé"),
});

/**
 * Ajoute / retire une réaction emoji sur un message (toggle).
 *
 *   POST /api/messages/react  { messageId, emoji }
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
  const { messageId, emoji } = parsed.data;
  const userId = session.user.id;

  // Lecture seule : on ne réagit que dans un groupe dont on est membre (un admin
  // qui consulte un autre groupe ne doit pas pouvoir y écrire).
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { groupId: true },
  });
  if (!message) {
    return NextResponse.json({ error: "Message introuvable" }, { status: 404 });
  }
  if (message.groupId) {
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: message.groupId, userId } },
    });
    if (!member) {
      return NextResponse.json({ error: "Lecture seule." }, { status: 403 });
    }
  }

  const existing = await prisma.reaction.findUnique({
    where: { messageId_userId_emoji: { messageId, userId, emoji } },
  });

  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true, reacted: false });
  }
  await prisma.reaction.create({ data: { messageId, userId, emoji } });
  return NextResponse.json({ ok: true, reacted: true });
}
