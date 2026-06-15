import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/push";
import { SYSTEM_USER_EMAIL } from "@/lib/match-recap";

/**
 * Diffuse une annonce admin dans le tchat de TOUS les groupes. Le message est
 * posté par le compte système « DaronsFC » et rendu en bandeau (isSystem,
 * systemKind "ADMIN" → libellé « Annonce »). Une push est envoyée à tous les
 * membres (sauf si `push: false`). Admins uniquement.
 *
 *   POST /api/admin/broadcast  { content, push? }
 */
export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès réservé aux admins." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const content = (body?.content ?? "").trim();
  const withPush = body?.push !== false; // push activée par défaut
  if (!content) {
    return NextResponse.json({ error: "Message vide." }, { status: 400 });
  }
  const text = content.slice(0, 1000);

  const bot = await prisma.user.findUnique({
    where: { email: SYSTEM_USER_EMAIL },
    select: { id: true },
  });
  if (!bot) {
    return NextResponse.json(
      { error: "Compte système « DaronsFC » introuvable." },
      { status: 500 }
    );
  }

  const groups = await prisma.group.findMany({
    select: { id: true, members: { select: { userId: true } } },
  });
  if (groups.length === 0) {
    return NextResponse.json({ ok: true, groups: 0, users: 0 });
  }

  await prisma.message.createMany({
    data: groups.map((g) => ({
      userId: bot.id,
      groupId: g.id,
      content: text,
      isSystem: true,
      systemKind: "ADMIN",
    })),
  });

  // Push à tous les membres (dédupliqués entre groupes), fire-and-forget.
  let recipients = 0;
  if (withPush) {
    const userIds = [
      ...new Set(groups.flatMap((g) => g.members.map((m) => m.userId))),
    ];
    recipients = userIds.length;
    sendPushToUsers(userIds, {
      title: "📢 DaronsFC",
      body: text.slice(0, 120),
      url: "/chat",
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, groups: groups.length, users: recipients });
}
