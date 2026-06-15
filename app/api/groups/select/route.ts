import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GROUP_COOKIE } from "@/lib/groups";

const selectSchema = z.object({ groupId: z.string().min(1) });

/** Définit le groupe actif (cookie). L'utilisateur doit en être membre. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }
  const parsed = selectSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: parsed.data.groupId, userId: session.user.id } },
  });
  if (!member) {
    // Un admin peut consulter n'importe quel groupe (lecture seule) ; les
    // autres doivent en être membres.
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Tu n'es pas membre de ce groupe." }, { status: 403 });
    }
    const exists = await prisma.group.findUnique({
      where: { id: parsed.data.groupId },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json({ error: "Groupe introuvable." }, { status: 404 });
    }
  }

  const jar = await cookies();
  jar.set(GROUP_COOKIE, parsed.data.groupId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  return NextResponse.json({ ok: true });
}
