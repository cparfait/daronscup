import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { maybeSyncMatches } from "@/lib/football-data";
import { maybeInit } from "@/lib/init";
import { getFranceMatchToday } from "@/lib/data/queries";
import { BottomNav } from "@/components/bottom-nav";
import { PushAutoEnroll } from "@/components/push-auto-enroll";
import { FranceMatchBanner } from "@/components/france-match-banner";
import { cn } from "@/lib/utils";

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

  // Thème tricolore les jours de match de l'équipe de France.
  const franceMatch = await getFranceMatchToday().catch(() => null);

  return (
    <div
      className={cn(
        "mx-auto flex min-h-dvh max-w-md flex-col",
        franceMatch && "theme-france"
      )}
    >
      <main className="page-enter flex-1 px-4 pb-24 pt-4">
        <PushAutoEnroll vapidKey={vapidKey} />
        {franceMatch && (
          <div className="mb-4">
            <FranceMatchBanner match={franceMatch} />
          </div>
        )}
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
