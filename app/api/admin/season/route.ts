import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getSeasons } from "@/lib/season";
import { closeSeason, openSeason } from "@/lib/season-archive";
import { cloneGroupsToSeason } from "@/lib/groups";

/**
 * Gestion des saisons (admins).
 *
 *   GET  /api/admin/season                                    → liste
 *   POST /api/admin/season { action: "close",  seasonId }     → archive le palmarès + 👑
 *   POST /api/admin/season { action: "open",   seasonId, cloneGroupsFrom? }
 *                                                             → active + remise à zéro
 *   POST /api/admin/season { action: "clone-groups", seasonId, cloneGroupsFrom }
 *
 * « open » remet à zéro points, badges et paris champion : à ne lancer qu'après
 * un « close » de la saison en cours (garde-fou côté `openSeason`).
 */
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("close"), seasonId: z.string().min(1) }),
  z.object({
    action: z.literal("open"),
    seasonId: z.string().min(1),
    cloneGroupsFrom: z.string().min(1).nullable().optional(),
  }),
  z.object({
    action: z.literal("clone-groups"),
    seasonId: z.string().min(1),
    cloneGroupsFrom: z.string().min(1),
  }),
]);

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès réservé aux admins." }, { status: 403 });
  }
  return NextResponse.json({ seasons: await getSeasons() });
}

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès réservé aux admins." }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  try {
    if (parsed.data.action === "close") {
      const { palmares, champions } = await closeSeason(parsed.data.seasonId);
      return NextResponse.json({
        ok: true,
        champions,
        winner: palmares.winner,
        groups: palmares.groups.map((g) => ({
          name: g.name,
          champion: g.players[0]?.name ?? null,
          points: g.players[0]?.points ?? 0,
        })),
        totals: palmares.totals,
      });
    }

    if (parsed.data.action === "open") {
      const { groups, members } = await openSeason(parsed.data.seasonId, {
        cloneGroupsFrom: parsed.data.cloneGroupsFrom ?? null,
      });
      return NextResponse.json({ ok: true, groups, members });
    }

    const { groups, members } = await cloneGroupsToSeason(
      parsed.data.cloneGroupsFrom,
      parsed.data.seasonId
    );
    return NextResponse.json({ ok: true, groups, members });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Échec de l'opération.";
    console.error("[admin/season] échec:", err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
