import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyMatchResult } from "@/lib/football-data";

const schema = z.object({
  matchId: z.string().min(1),
  homeScore: z.number().int().min(0).max(99),
  awayScore: z.number().int().min(0).max(99),
});

/**
 * Saisie manuelle du résultat d'un match (si l'API est en retard).
 * Réservé aux admins. PREMIÈRE saisie uniquement : un match dont le résultat
 * est déjà enregistré est verrouillé (aucune correction possible).
 *
 *   POST /api/admin/result  { matchId, homeScore, awayScore }
 */
export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès réservé aux admins." }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Score invalide." }, { status: 400 });
  }

  const { matchId, homeScore, awayScore } = parsed.data;

  // Verrou : on refuse toute saisie si un résultat existe déjà (pas de correction).
  const existing = await prisma.result.findUnique({ where: { matchId } });
  if (existing) {
    return NextResponse.json(
      { error: "Résultat déjà enregistré — verrouillé (pas de correction)." },
      { status: 409 }
    );
  }

  try {
    const { scored } = await applyMatchResult(matchId, homeScore, awayScore);
    return NextResponse.json({ ok: true, scored });
  } catch {
    return NextResponse.json({ error: "Erreur lors de l'enregistrement." }, { status: 500 });
  }
}
