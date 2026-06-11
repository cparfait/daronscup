import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  userId: z.string().min(1),
  action: z.enum(["ban", "unban", "promote", "demote"]),
});

/**
 * Actions admin sur un utilisateur : bannir/débannir, passer admin/user.
 * Réservé aux admins. Un admin ne peut pas se bannir ni se rétrograder
 * lui-même (anti-verrouillage).
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
  if (userId === session.user.id && (action === "ban" || action === "demote")) {
    return NextResponse.json(
      { error: "Tu ne peux pas te bannir ni te rétrograder toi-même." },
      { status: 400 }
    );
  }

  const data =
    action === "ban"
      ? { banned: true }
      : action === "unban"
        ? { banned: false }
        : action === "promote"
          ? { role: "ADMIN" as const }
          : { role: "USER" as const };

  try {
    await prisma.user.update({ where: { id: userId }, data });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
  }
}
