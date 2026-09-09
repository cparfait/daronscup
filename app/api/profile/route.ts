import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reassignOwnedGroups } from "@/lib/groups";
import { getChampionableTeams } from "@/lib/data/queries";

/**
 * Avatar : image redimensionnée côté navigateur (cf. components/avatar-picker)
 * et stockée en data URL. Pas de bucket à provisionner, pas d'URL externe à
 * faire confiance — la photo vit dans la ligne User, en quelques dizaines de
 * kilo-octets. `null` remet l'initiale.
 */
const AVATAR_MAX_CHARS = 200_000; // ≈ 150 Ko une fois décodé
const AVATAR_PREFIX = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

const schema = z.object({
  name: z.string().trim().min(2).max(30).optional(),
  /** Club de cœur : nom d'une équipe de la saison en cours, ou null pour retirer. */
  favoriteTeam: z.string().trim().max(60).nullable().optional(),
  avatar: z
    .string()
    .max(AVATAR_MAX_CHARS)
    .regex(AVATAR_PREFIX)
    .nullable()
    .optional(),
});

/**
 * Met à jour le profil de l'utilisateur connecté : pseudo, avatar et/ou club
 * de cœur.
 *
 *   PATCH /api/profile  { name?, favoriteTeam?, avatar? }
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
    const onAvatar = parsed.error.issues.some((i) => i.path[0] === "avatar");
    return NextResponse.json(
      {
        error: onAvatar
          ? "Image invalide ou trop lourde."
          : "Requête invalide (pseudo : 2 à 30 caractères).",
      },
      { status: 400 }
    );
  }

  const { name, favoriteTeam, avatar } = parsed.data;
  const data: {
    name?: string;
    favoriteTeam?: string | null;
    favoriteTeamFlag?: string | null;
    avatarUrl?: string | null;
    image?: string | null;
  } = {};

  if (name !== undefined) data.name = name;

  // `avatarUrl` est l'avatar métier, `image` celui de l'adapter NextAuth : on
  // écrit les deux, sinon la moitié de l'app continuerait d'afficher la photo
  // Google. `null` sur les deux fait retomber sur l'initiale.
  if (avatar !== undefined) {
    data.avatarUrl = avatar;
    data.image = avatar;
  }

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
  // On ne renvoie pas l'avatar : le client vient de l'envoyer, inutile de lui
  // repasser 150 Ko de base64.
  return NextResponse.json({
    ok: true,
    name: data.name,
    favoriteTeam: data.favoriteTeam,
    favoriteTeamFlag: data.favoriteTeamFlag,
  });
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
