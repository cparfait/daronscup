import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getChampionableTeams, isChampionPickOpen } from "@/lib/data/queries";

const schema = z.object({
  team: z.string().min(1),
  flag: z.string().min(1),
});

/**
 * Enregistre le pari « vainqueur du tournoi » d'un joueur. Choix UNIQUE et
 * DÉFINITIF : refusé si un pari existe déjà ou si la finale est jouée.
 *
 *   POST /api/champion-pick  { team, flag }
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }
  const userId = session.user.id;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Choix invalide." }, { status: 400 });
  }

  // Verrou : un seul pari, définitif.
  const existing = await prisma.championPick.findUnique({ where: { userId } });
  if (existing) {
    return NextResponse.json(
      { error: "Ton champion est déjà choisi — c'est définitif !" },
      { status: 409 }
    );
  }

  if (!(await isChampionPickOpen())) {
    return NextResponse.json(
      { error: "Les paris sont fermés (la finale est jouée)." },
      { status: 403 }
    );
  }

  // L'équipe doit faire partie des nations du tournoi (anti-saisie arbitraire).
  const teams = await getChampionableTeams();
  const match = teams.find((t) => t.team === parsed.data.team);
  if (!match) {
    return NextResponse.json({ error: "Équipe inconnue." }, { status: 400 });
  }

  await prisma.championPick.create({
    data: { userId, team: match.team, flag: match.flag },
  });

  return NextResponse.json({ ok: true, team: match.team, flag: match.flag });
}
