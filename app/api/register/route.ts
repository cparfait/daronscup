import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const registerSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  inviteToken: z.string().optional(),
  groupToken: z.string().optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, email, password, inviteToken, groupToken } = parsed.data;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Cet email est déjà utilisé." },
        { status: 409 }
      );
    }

    // Validation + consommation ATOMIQUE du lien d'invitation : le décrément
    // conditionnel (usesLeft > 0) empêche deux inscriptions simultanées de
    // passer toutes les deux sur le dernier usage.
    let claimedInviteId: string | null = null;
    if (inviteToken) {
      const invite = await prisma.invite.findUnique({
        where: { token: inviteToken },
      });
      if (!invite || (invite.expiresAt && invite.expiresAt < new Date())) {
        return NextResponse.json(
          { error: "Lien d'invitation invalide ou expiré." },
          { status: 400 }
        );
      }
      if (invite.usesLeft != null) {
        const claimed = await prisma.invite.updateMany({
          where: { id: invite.id, usesLeft: { gt: 0 } },
          data: { usesLeft: { decrement: 1 } },
        });
        if (claimed.count === 0) {
          return NextResponse.json(
            { error: "Lien d'invitation invalide ou expiré." },
            { status: 400 }
          );
        }
        claimedInviteId = invite.id;
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let user;
    try {
      user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          score: { create: {} },
        },
      });
    } catch (err) {
      // L'inscription a échoué après consommation de l'invitation : on rend
      // l'usage (best effort) pour ne pas griller le lien.
      if (claimedInviteId) {
        await prisma.invite
          .update({
            where: { id: claimedInviteId },
            data: { usesLeft: { increment: 1 } },
          })
          .catch(() => {});
      }
      throw err;
    }

    // Rejoint le groupe d'amis si la création vient d'un lien de groupe.
    if (groupToken) {
      const group = await prisma.group.findUnique({
        where: { token: groupToken },
        select: { id: true },
      });
      if (group) {
        await prisma.groupMember.create({
          data: { groupId: group.id, userId: user.id, role: "MEMBER" },
        });
      }
    }

    return NextResponse.json({ ok: true, userId: user.id }, { status: 201 });
  } catch (err) {
    // Le plus souvent : base injoignable (DATABASE_URL non configurée / Postgres éteint).
    console.error("[register] échec création utilisateur:", err);
    return NextResponse.json(
      {
        error:
          "Inscription indisponible : la base de données est injoignable. Vérifie ta configuration.",
      },
      { status: 503 }
    );
  }
}
