import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Admin · DaronsFC" };

export default async function AdminPage() {
  const session = await auth();
  // Garde serveur : seul un ADMIN accède à la console.
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const PANELS = [
    { title: "👥 Utilisateurs", desc: "Ban, reset points, rôles." },
    { title: "⚽ Scores manuels", desc: "Saisie si l'API est en retard." },
    { title: "📌 Messages épinglés", desc: "Annonces dans le tchat." },
    { title: "📊 Stats", desc: "Participation, top scorers, activité." },
  ];

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 py-6">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-cream)]"
      >
        <ArrowLeft className="size-4" /> Retour à l&apos;app
      </Link>

      <PageHeader title="Console Admin" subtitle="Réservé aux darons en chef" />

      <div className="grid gap-3">
        {PANELS.map((p) => (
          <Card key={p.title}>
            <CardContent className="p-4">
              <CardTitle className="text-base">{p.title}</CardTitle>
              <p className="mt-1 text-sm text-[var(--color-muted)]">{p.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-[var(--color-muted)]">
        Modules interactifs complets : Sprint 5.
      </p>
    </main>
  );
}
