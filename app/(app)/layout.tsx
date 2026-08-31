import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { maybeSyncMatches } from "@/lib/football-data";
import { maybeInit } from "@/lib/init";
import {
  getFranceMatchToday,
  getFavoriteClubMatchToday,
} from "@/lib/data/queries";
import { BottomNav } from "@/components/bottom-nav";
import { PushAutoEnroll } from "@/components/push-auto-enroll";
import { PresenceHeartbeat } from "@/components/presence-heartbeat";
import { FranceMatchBanner } from "@/components/france-match-banner";
import { ClubMatchBanner } from "@/components/club-match-banner";
import { PreviewBanner } from "@/components/preview-banner";
import { getViewingSeason } from "@/lib/season";
import { getClubTheme, clubThemeCss } from "@/lib/club-themes";
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

  // Thème tricolore les jours de match de l'équipe de France (sélections), et
  // thème aux couleurs du club de cœur les jours où IL joue (clubs). Les deux
  // getters s'excluent par le format de la saison : jamais de conflit.
  const franceMatch = await getFranceMatchToday().catch(() => null);
  const clubDay = await getFavoriteClubMatchToday(session.user.id).catch(
    () => null
  );
  // Sans palette connue pour ce club, on n'invente pas de couleurs : pas de
  // thème, et pas de bandeau non plus.
  const clubTheme = clubDay ? getClubTheme(clubDay.team) : null;

  // Mode aperçu : un admin consulte une saison de test que personne d'autre ne
  // voit. On le lui rappelle en permanence (cf. lib/season.ts).
  const viewing = await getViewingSeason().catch(() => null);
  const previewSeason = viewing?.adminOnly ? viewing.name : null;

  return (
    <>
      {clubTheme && <style>{clubThemeCss(clubTheme)}</style>}
      <div
        className={cn(
          "mx-auto flex min-h-dvh max-w-md flex-col",
          franceMatch && "theme-france",
          clubTheme && "theme-club"
        )}
      >
        <main className="page-enter flex-1 px-4 pb-24 pt-4">
          <PushAutoEnroll vapidKey={vapidKey} />
          <PresenceHeartbeat />
          {previewSeason && <PreviewBanner seasonName={previewSeason} />}
          {franceMatch && (
            <div className="mb-4">
              <FranceMatchBanner match={franceMatch} />
            </div>
          )}
          {clubTheme && clubDay && (
            <div className="mb-4">
              <ClubMatchBanner match={clubDay.match} team={clubDay.team} />
            </div>
          )}
          {children}
        </main>
        <BottomNav />
      </div>
    </>
  );
}
