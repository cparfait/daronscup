import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getActiveSeason } from "@/lib/season";
import { closeSeason } from "@/lib/season-archive";

/**
 * Clôture la saison en cours : fige son palmarès (classement final par groupe,
 * champions pariés, badges) dans les archives et attribue le badge
 * « daronissime » 👑 au joueur en tête de CHAQUE groupe (un vainqueur par
 * groupe, pas de vainqueur global).
 *
 * Ne remet rien à zéro : c'est l'ouverture de la saison suivante qui le fait
 * (POST /api/admin/season { action: "open" }). Réservé aux admins. Idempotent.
 *
 *   POST /api/admin/close-tournament
 */
export async function POST() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès réservé aux admins." }, { status: 403 });
  }

  const season = await getActiveSeason();
  if (!season) {
    return NextResponse.json({ error: "Aucune saison en cours." }, { status: 400 });
  }

  try {
    const { palmares, champions } = await closeSeason(season.id);
    return NextResponse.json({
      ok: true,
      season: season.name,
      winners: champions,
      champions: palmares.groups
        .filter((g) => g.players.length > 0)
        .map((g) => ({ group: g.name, champion: g.players[0]!.name })),
    });
  } catch (err) {
    console.error("[admin/close-tournament] échec:", err);
    return NextResponse.json({ error: "Échec de la clôture." }, { status: 500 });
  }
}
