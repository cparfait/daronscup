import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { seedTestData, purgeTestData, getTestDataStatus } from "@/lib/test-data";

/**
 * Jeu de test injectable / purgeable (admins).
 *
 *   GET  /api/admin/test-data                    → état du jeu
 *   POST /api/admin/test-data { action: "seed" }  → injecte et active
 *   POST /api/admin/test-data { action: "purge" } → supprime et restaure
 *
 * Tout le jeu vit dans la saison `TEST-DATA` et sur des comptes
 * `@test.daronsfc.local` : les données réelles ne sont jamais touchées
 * (cf. lib/test-data.ts).
 */
const schema = z.object({ action: z.enum(["seed", "purge"]) });

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès réservé aux admins." }, { status: 403 });
  }
  return NextResponse.json(await getTestDataStatus());
}

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN" || !session.user.id) {
    return NextResponse.json({ error: "Accès réservé aux admins." }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Action invalide." }, { status: 400 });
  }

  try {
    if (parsed.data.action === "seed") {
      const s = await seedTestData(session.user.id);
      return NextResponse.json({ ok: true, ...s });
    }
    const p = await purgeTestData();
    return NextResponse.json({ ok: true, ...p });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Échec de l'opération.";
    console.error("[admin/test-data] échec:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
