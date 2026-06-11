import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="text-6xl">🥅</span>
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">
        Hors-jeu !
      </h1>
      <p className="text-sm text-[var(--color-muted)]">
        Cette page n&apos;existe pas (ou plus).
      </p>
      <Link href="/dashboard">
        <Button>Retour au hub</Button>
      </Link>
    </main>
  );
}
