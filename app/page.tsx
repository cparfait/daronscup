import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { GoogleSignInButton } from "@/components/auth-buttons";

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const features = [
    {
      icon: "\u{1F3AF}",
      title: "Pronostique chaque match de la CdM",
      description:
        "Score exact, vainqueur, nombre de buts\u2014choisis ta méthode.",
    },
    {
      icon: "\u{1F0CF}",
      title: "Joue ton Joker \u00D72 strat\u00e9gique",
      description:
        "Double tes points : 4 jokers en poules, 2 en phase finale.",
    },
    {
      icon: "\u{1F3C6}",
      title: "Domine le classement de ta bande",
      description:
        "Classement en temps réel. Qui est le vrai patron\u00a0?",
    },
  ];

  return (
    <main className="relative flex min-h-dvh flex-col overflow-x-hidden">
      {/* ── Animated gradient background ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background: [
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(22,163,74,0.18) 0%, transparent 60%)",
            "radial-gradient(ellipse 60% 40% at 20% 80%, rgba(22,163,74,0.08) 0%, transparent 50%)",
            "radial-gradient(ellipse 50% 50% at 80% 60%, rgba(245,158,11,0.06) 0%, transparent 50%)",
            "var(--color-bg)",
          ].join(","),
        }}
      />

      {/* ── CSS-only particle dots ── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        <div className="landing-particles">
          {Array.from({ length: 20 }).map((_, i) => (
            <span
              key={i}
              className="landing-dot"
              style={{
                left: `${5 + ((i * 37) % 90)}%`,
                top: `${5 + ((i * 53) % 90)}%`,
                animationDelay: `${(i * 0.7) % 4}s`,
                animationDuration: `${3 + (i % 3)}s`,
                width: `${2 + (i % 3)}px`,
                height: `${2 + (i % 3)}px`,
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Decorative pitch line at top ── */}
      <div
        aria-hidden="true"
        className="absolute left-0 right-0 top-0 z-10 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, var(--color-pitch) 30%, var(--color-pitch-bright) 50%, var(--color-pitch) 70%, transparent 100%)",
          opacity: 0.4,
        }}
      />

      {/* ── Content ── */}
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 pt-8 pb-6 text-center">
        {/* Football icon with float */}
        <div className="animate-float animate-stagger stagger-1 mb-5">
          <div
            className="
              flex size-16 items-center justify-center rounded-[1.5rem]
              text-3xl
              shadow-[0_0_40px_rgba(22,163,74,0.25)]
            "
            style={{
              background:
                "linear-gradient(135deg, rgba(22,163,74,0.15), rgba(22,163,74,0.05))",
              border: "1px solid rgba(22,163,74,0.2)",
            }}
          >
            {"\u26BD"}
          </div>
        </div>

        {/* Title */}
        <h1
          className="
            animate-stagger stagger-2
            font-[family-name:var(--font-display)]
            text-5xl font-bold leading-none tracking-tight
            sm:text-6xl
          "
        >
          Darons
          <span className="text-gradient-gold">FC</span>
        </h1>

        {/* Tagline */}
        <p
          className="
            animate-stagger stagger-3
            mt-3 max-w-xs text-balance text-sm leading-relaxed
            text-[var(--color-muted)]
          "
        >
          Prouve &agrave; tes potes que t&apos;as pas regard&eacute; les matchs
          pour rien.
        </p>

        {/* Divider */}
        <div
          aria-hidden="true"
          className="animate-stagger stagger-3 my-5 h-px w-16"
          style={{
            background:
              "linear-gradient(90deg, transparent, var(--color-pitch), transparent)",
            opacity: 0.4,
          }}
        />

        {/* Feature cards */}
        <div className="animate-stagger stagger-4 grid w-full gap-2.5">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`
                glass card-hover
                animate-stagger stagger-${4 + i}
                flex items-center gap-3.5 rounded-2xl px-4 py-3 text-left
              `}
            >
              <span
                className="
                  flex size-9 shrink-0 items-center justify-center
                  rounded-xl text-lg
                "
                style={{
                  background:
                    "linear-gradient(135deg, rgba(22,163,74,0.12), rgba(22,163,74,0.04))",
                  border: "1px solid rgba(22,163,74,0.15)",
                }}
              >
                {f.icon}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--color-cream)]">
                  {f.title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-muted)]">
                  {f.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Decorative divider */}
        <div
          aria-hidden="true"
          className="animate-stagger stagger-7 my-5 h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, var(--color-border-subtle), transparent)",
          }}
        />

        {/* Sign in section */}
        <div className="animate-stagger stagger-7 flex w-full flex-col items-center gap-4">
          <GoogleSignInButton className="w-full" />

          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/login"
              className="
                text-[var(--color-muted)] underline-offset-4
                transition-colors hover:text-[var(--color-cream)] hover:underline
              "
            >
              Connexion par email
            </Link>
            <span className="text-[var(--color-border-subtle)]">|</span>
            <Link
              href="/register"
              className="
                text-[var(--color-muted)] underline-offset-4
                transition-colors hover:text-[var(--color-cream)] hover:underline
              "
            >
              Cr&eacute;er un compte
            </Link>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer
        className="
          animate-stagger stagger-8
          relative z-10 pb-6 text-center text-xs tracking-wide
          text-[var(--color-muted)]
        "
      >
        <div
          aria-hidden="true"
          className="mx-auto mb-4 h-px w-32"
          style={{
            background:
              "linear-gradient(90deg, transparent, var(--color-border-subtle), transparent)",
          }}
        />
        DaronsFC &middot; Coupe du Monde 2026
      </footer>

      {/* ── Bottom decorative pitch line ── */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 right-0 z-10 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, var(--color-pitch) 30%, var(--color-gold) 50%, var(--color-pitch) 70%, transparent 100%)",
          opacity: 0.25,
        }}
      />

    </main>
  );
}
