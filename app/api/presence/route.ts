import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Heartbeat de présence : met à jour `lastSeenAt` de l'utilisateur courant.
 * Appelé périodiquement par le composant client `PresenceHeartbeat`.
 *
 *   POST /api/presence
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { lastSeenAt: new Date() },
    });
  } catch {
    // Best-effort : un échec de heartbeat ne doit jamais gêner l'utilisateur.
  }
  return NextResponse.json({ ok: true });
}
