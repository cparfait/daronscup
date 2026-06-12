import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { applyMatchResult } from "@/lib/football-data";

const schema = z.object({
  matchId: z.string().min(1),
  homeScore: z.number().int().min(0).max(99),
  awayScore: z.number().int().min(0).max(99),
});

/**
 * Saisie manuelle du résultat d'un match (si l'API est en retard).
 * Réservé aux admins. Idempotent : ne crédite que les pronostics non traités.
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
  try {
    // force: recalcule même à score identique (ré-application du barème).
    const { scored } = await applyMatchResult(matchId, homeScore, awayScore, {
      force: true,
    });
    return NextResponse.json({ ok: true, scored });
  } catch {
    return NextResponse.json({ error: "Erreur lors de l'enregistrement." }, { status: 500 });
  }
}
