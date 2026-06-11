import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const since = searchParams.get("since");
    const messages = await prisma.message.findMany({
      where: since ? { createdAt: { gt: new Date(since) } } : {},
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
    return NextResponse.json(
      messages.map((m) => ({
        id: m.id,
        userId: m.userId,
        user: m.user.name ?? "Daron",
        text: m.content,
        pinned: m.pinned,
        timestamp: m.createdAt.toISOString(),
      }))
    );
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }
  try {
    const { content } = await req.json();
    const text = (content ?? "").trim();
    if (!text) {
      return NextResponse.json({ error: "Message vide" }, { status: 400 });
    }
    const msg = await prisma.message.create({
      data: { userId: session.user.id, content: text.slice(0, 500) },
      include: { user: { select: { id: true, name: true } } },
    });
    return NextResponse.json({
      id: msg.id,
      userId: msg.userId,
      user: msg.user.name ?? "Daron",
      text: msg.content,
      pinned: msg.pinned,
      timestamp: msg.createdAt.toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
