import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { maybeSyncMatches } from "@/lib/football-data";
import { maybeInit } from "@/lib/init";
import { BottomNav } from "@/components/bottom-nav";
import { PushAutoEnroll } from "@/components/push-auto-enroll";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  maybeInit().catch(() => {});
  maybeSyncMatches().catch(() => {});

  // Clé VAPID lue au runtime (NEXT_PUBLIC_* figé au build ne marche pas via
  // Portainer) — passée en prop, comme sur la page profil.
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <main className="page-enter flex-1 px-4 pb-24 pt-4">
        <PushAutoEnroll vapidKey={vapidKey} />
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
