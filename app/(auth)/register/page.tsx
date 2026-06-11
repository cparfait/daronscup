import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { RegisterForm } from "@/components/auth-buttons";

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-8">
      {/* ── Animated background ────────────────────── */}
      <div className="pointer-events-none absolute inset-0">
        {/* Base dark */}
        <div className="absolute inset-0 bg-[var(--color-bg)]" />

        {/* Gold gradient orb – top left */}
        <div
          className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full opacity-[0.06] blur-[120px]"
          style={{
            background:
              "radial-gradient(circle, var(--color-gold) 0%, transparent 70%)",
          }}
        />

        {/* Pitch gradient orb – bottom right */}
        <div
          className="absolute -bottom-32 -right-32 h-[400px] w-[400px] rounded-full opacity-[0.06] blur-[100px]"
          style={{
            background:
              "radial-gradient(circle, var(--color-pitch) 0%, transparent 70%)",
          }}
        />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              "linear-gradient(var(--color-cream) 1px, transparent 1px), linear-gradient(90deg, var(--color-cream) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* ── Card ───────────────────────────────────── */}
      <div className="animate-stagger stagger-1 relative z-10 flex w-full max-w-md flex-col">
        {/* Glass card */}
        <div className="glass-strong rounded-3xl p-8 shadow-2xl shadow-black/40">
          {/* Back link */}
          <Link
            href="/login"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] transition-colors duration-200 hover:text-[var(--color-cream)]"
          >
            <svg
              className="size-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5 8.25 12l7.5-7.5"
              />
            </svg>
            Retour a la connexion
          </Link>

          {/* Header */}
          <div className="mb-8">
            {/* Logo accent */}
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-gold)]/10">
                <svg
                  className="size-5 text-[var(--color-gold-bright)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z"
                  />
                </svg>
              </div>
            </div>

            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--color-cream)]">
              Inscription
            </h1>
            <p className="mt-1.5 text-sm text-[var(--color-muted)]">
              Cree ton compte et commence a prono.
            </p>
          </div>

          {/* Register form */}
          <RegisterForm />

          {/* Login link */}
          <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
            Deja un compte ?{" "}
            <Link
              href="/login"
              className="font-medium text-[var(--color-pitch-bright)] transition-colors duration-200 hover:text-[var(--color-pitch)] hover:underline"
            >
              Connecte-toi
            </Link>
          </p>
        </div>

        {/* Terms hint */}
        <p className="mt-4 text-center text-xs text-[var(--color-muted)]/60">
          En creant un compte, tu acceptes les regles de la Darons League.
        </p>
      </div>
    </main>
  );
}
