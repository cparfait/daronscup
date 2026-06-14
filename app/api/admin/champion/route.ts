import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { settleChampionBonus } from "@/lib/football-data";
import { getChampionableTeams } from "@/lib/data/queries";

const schema = z.object({ team: z.string().min(1) });

/**
 * Désigne MANUELLEMENT le vainqueur du tournoi (cas d'une finale aux tirs au
 * but, où le score seul ne désigne pas de gagnant). Crédite aussitôt le bonus
 * champion aux bons parieurs. Réservé aux admins.
 *
 *   POST /api/admin/champion   { team }
 *   DELETE /api/admin/champion          → annule la désignation manuelle
 */
export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès réservé aux admins." }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Équipe manquante." }, { status: 400 });
  }

  const teams = await getChampionableTeams();
  const team = teams.find((t) => t.team === parsed.data.team);
  if (!team) {
    return NextResponse.json({ error: "Équipe inconnue." }, { status: 400 });
  }

  await prisma.championOverride.upsert({
    where: { id: "singleton" },
    update: { team: team.team, flag: team.flag },
    create: { id: "singleton", team: team.team, flag: team.flag },
  });

  await settleChampionBonus();

  return NextResponse.json({ ok: true, team: team.team, flag: team.flag });
}

export async function DELETE() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès réservé aux admins." }, { status: 403 });
  }
  await prisma.championOverride.deleteMany({});
  await settleChampionBonus();
  return NextResponse.json({ ok: true });
}
