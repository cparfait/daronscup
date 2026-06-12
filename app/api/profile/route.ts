import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reassignOwnedGroups } from "@/lib/groups";

const schema = z.object({ name: z.string().trim().min(2).max(30) });

/**
 * Met à jour le pseudo de l'utilisateur connecté.
 *
 *   PATCH /api/profile  { name }
 */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Pseudo invalide (2 à 30 caractères)." },
      { status: 400 }
    );
  }
  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: parsed.data.name },
  });
  return NextResponse.json({ ok: true, name: parsed.data.name });
}

/** Suppression définitive du compte de l'utilisateur connecté. */
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }
  // Transmet la propriété de ses groupes avant la cascade (sinon le groupe
  // resterait sans organisateur).
  await reassignOwnedGroups(session.user.id).catch(() => {});
  // Cascade : pronos, score, messages, badges, abonnements… (schéma Prisma).
  await prisma.user.delete({ where: { id: session.user.id } });
  return NextResponse.json({ ok: true });
}
