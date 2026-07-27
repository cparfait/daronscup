import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reassignOwnedGroups } from "@/lib/groups";
import { getChampionableTeams } from "@/lib/data/queries";

const schema = z.object({
  name: z.string().trim().min(2).max(30).optional(),
  /** Club de cœur : nom d'une équipe de la saison en cours, ou null pour retirer. */
  favoriteTeam: z.string().trim().max(60).nullable().optional(),
});

/**
 * Met à jour le profil de l'utilisateur connecté : pseudo et/ou club de cœur.
 *
 *   PATCH /api/profile  { name?, favoriteTeam? }
 *
 * Le club de cœur doit faire partie des équipes de la compétition en cours
 * (anti-saisie arbitraire) ; son emblème est repris depuis le match, donc on ne
 * fait jamais confiance au client pour l'URL de l'écusson.
 */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Requête invalide (pseudo : 2 à 30 caractères)." },
      { status: 400 }
    );
  }

  const { name, favoriteTeam } = parsed.data;
  const data: { name?: string; favoriteTeam?: string | null; favoriteTeamFlag?: string | null } =
    {};

  if (name !== undefined) data.name = name;

  if (favoriteTeam !== undefined) {
    if (favoriteTeam === null || favoriteTeam === "") {
      data.favoriteTeam = null;
      data.favoriteTeamFlag = null;
    } else {
      const teams = await getChampionableTeams();
      const found = teams.find((t) => t.team === favoriteTeam);
      if (!found) {
        return NextResponse.json({ error: "Équipe inconnue." }, { status: 400 });
      }
      data.favoriteTeam = found.team;
      data.favoriteTeamFlag = found.flag;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Rien à mettre à jour." }, { status: 400 });
  }

  await prisma.user.update({ where: { id: session.user.id }, data });
  return NextResponse.json({ ok: true, ...data });
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
