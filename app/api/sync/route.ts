import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncMatches } from "@/lib/football-data";

/**
 * Synchronise les matchs de la Coupe du Monde depuis football-data.org (gratuit)
 * vers la base. Réservé aux admins. À déclencher manuellement ou via un cron.
 *
 *   POST /api/sync
 */
export async function POST() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès réservé aux admins." }, { status: 403 });
  }

  try {
    const result = await syncMatches();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
