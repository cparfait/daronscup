import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChatView } from "@/components/chat-view";

export const metadata = { title: "Tchat · DaronsFC" };
export const dynamic = "force-dynamic";

type ChatMsg = {
  id: string;
  userId: string;
  user: string;
  text: string;
  pinned: boolean;
  timestamp: string;
};

export default async function ChatPage() {
  const session = await auth();
  const currentUser = {
    id: session?.user?.id ?? "",
    name: session?.user?.name ?? "Daron",
  };

  let initial: ChatMsg[] = [];
  try {
    const rows = await prisma.message.findMany({
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
      take: 50,
    });
    initial = rows.map((m) => ({
      id: m.id,
      userId: m.userId,
      user: m.user.name ?? "Daron",
      text: m.content,
      pinned: m.pinned,
      timestamp: m.createdAt.toISOString(),
    }));
  } catch {}

  return <ChatView currentUser={currentUser} initial={initial} />;
}
