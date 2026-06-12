import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  userId: z.string().min(1),
  action: z.enum(["ban", "unban", "promote", "demote", "delete"]),
});

/**
 * Actions admin sur un utilisateur : bannir/débannir, passer admin/user,
 * supprimer. Réservé aux admins. Un admin ne peut pas se bannir, se
 * rétrograder ni se supprimer lui-même (anti-verrouillage).
 *
 *   POST /api/admin/users  { userId, action }
 */
export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès réservé aux admins." }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const { userId, action } = parsed.data;
  if (
    userId === session.user.id &&
    (action === "ban" || action === "demote" || action === "delete")
  ) {
    return NextResponse.json(
      { error: "Tu ne peux pas te bannir, te rétrograder ni te supprimer toi-même." },
      { status: 400 }
    );
  }

  try {
    if (action === "delete") {
      // Cascade : prédictions, score, messages, badges, abonnements… (schéma).
      await prisma.user.delete({ where: { id: userId } });
      return NextResponse.json({ ok: true });
    }

    const data =
      action === "ban"
        ? { banned: true }
        : action === "unban"
          ? { banned: false }
          : action === "promote"
            ? { role: "ADMIN" as const }
            : { role: "USER" as const };

    await prisma.user.update({ where: { id: userId }, data });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
  }
}
