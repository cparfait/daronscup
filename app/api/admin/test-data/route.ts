import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { PREVIEW_COOKIE } from "@/lib/season";
import { seedTestData, purgeTestData, getTestDataStatus } from "@/lib/test-data";

/**
 * Jeu de test injectable / purgeable, visible des seuls admins (admins only).
 *
 *   GET  /api/admin/test-data                       → état du jeu + mode aperçu
 *   POST /api/admin/test-data { action: "seed" }     → injecte et passe en aperçu
 *   POST /api/admin/test-data { action: "purge" }    → supprime et quitte l'aperçu
 *   POST /api/admin/test-data { action: "preview", on } → entre/sort de l'aperçu
 *
 * Le jeu vit dans la saison `TEST-DATA`, marquée `adminOnly` : elle n'est JAMAIS
 * la saison active, donc invisible des autres joueurs, de la synchro et du
 * scoring. C'est le cookie d'aperçu, posé ici, qui la révèle à un admin
 * (cf. lib/season.ts → `getViewingSeason`).
 */
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("seed") }),
  z.object({ action: z.literal("purge") }),
  z.object({ action: z.literal("preview"), on: z.boolean() }),
]);

/** Pose ou retire le cookie d'aperçu (session, pas de persistance longue). */
async function setPreview(on: boolean): Promise<void> {
  const jar = await cookies();
  if (on) {
    jar.set(PREVIEW_COOKIE, "1", { path: "/", sameSite: "lax" });
  } else {
    jar.delete(PREVIEW_COOKIE);
  }
}

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
      // On bascule l'admin en aperçu : sans ça, il ne verrait rien de ce qu'il
      // vient de créer (la saison de test n'est pas la saison active).
      await setPreview(true);
      return NextResponse.json({ ok: true, preview: true, ...s });
    }

    if (parsed.data.action === "purge") {
      const p = await purgeTestData();
      await setPreview(false);
      return NextResponse.json({ ok: true, preview: false, ...p });
    }

    await setPreview(parsed.data.on);
    return NextResponse.json({ ok: true, preview: parsed.data.on });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Échec de l'opération.";
    console.error("[admin/test-data] échec:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
