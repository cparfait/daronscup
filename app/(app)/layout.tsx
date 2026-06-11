import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { maybeSyncMatches } from "@/lib/football-data";
import { BottomNav } from "@/components/bottom-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Sync silencieux au (re)lancement de l'app — debounce 2 min, ne bloque pas le rendu
  maybeSyncMatches().catch(() => {});

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <main className="page-enter flex-1 px-4 pb-24 pt-4">{children}</main>
      <BottomNav />
    </div>
  );
}
