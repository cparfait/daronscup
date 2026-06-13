import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Barème · DaronsFC" };

const RULES = [
  {
    emoji: "🎯",
    title: "Score exact",
    points: "3 pts",
    desc: "Le score parfait, au but près.",
    example: "Tu pronostiques 2-1, le match finit 2-1.",
    color: "border-[var(--color-gold)]/30 bg-[var(--color-gold)]/[0.05]",
  },
  {
    emoji: "⚽",
    title: "Bon vainqueur + bonne différence de buts",
    points: "2 pts",
    desc: "Le bon gagnant avec le bon écart (hors nul).",
    example: "Tu pronostiques 3-1, le match finit 2-0. Même vainqueur, même écart de 2.",
    color: "border-[var(--color-pitch)]/25 bg-[var(--color-pitch)]/[0.04]",
  },
  {
    emoji: "✅",
    title: "Bon sens du résultat",
    points: "1 pt",
    desc: "Le bon vainqueur, ou le bon nul — mais pas le bon score.",
    example: "Tu pronostiques 1-0, le match finit 3-0. Bon vainqueur, mauvais score.",
    color: "border-[var(--color-border-subtle)] bg-[var(--color-surface-2)]",
  },
  {
    emoji: "❌",
    title: "Mauvais pronostic",
    points: "0 pt",
    desc: "Ni le bon vainqueur, ni le bon nul.",
    example: "Tu pronostiques 1-0, le match finit 0-2.",
    color: "border-[var(--color-border-subtle)] bg-[var(--color-surface-2)]",
  },
];

export default function ScoringPage() {
  return (
    <>
      <Link
        href="/profile"
        className="mb-5 inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-cream)]"
      >
        <ArrowLeft className="size-4" />
        <span>Profil</span>
      </Link>

      <h1 className="mb-1 font-[family-name:var(--font-display)] text-2xl font-extrabold">
        Comment ça marche ?
      </h1>
      <p className="mb-6 text-sm text-[var(--color-muted)]">
        Le système de points et les jokers, en détail.
      </p>

      {/* ── Barème ── */}
      <h2 className="mb-3 flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-bold">
        <span className="text-base">🏆</span>
        Calcul des points
      </h2>

      <div className="mb-6 flex flex-col gap-3">
        {RULES.map((rule) => (
          <Card key={rule.title} className={`p-4 ${rule.color}`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">{rule.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-[var(--color-cream)]">
                    {rule.title}
                  </h3>
                  <span className="shrink-0 font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-gold)]">
                    {rule.points}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                  {rule.desc}
                </p>
                <p className="mt-1.5 rounded-lg bg-[var(--color-surface)] px-2.5 py-1.5 text-xs italic text-[var(--color-muted)]">
                  {rule.example}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Note sur les nuls ── */}
      <Card className="glass mb-6 p-4">
        <p className="text-sm leading-relaxed text-[var(--color-muted)]">
          <strong className="text-[var(--color-cream)]">Note sur les nuls :</strong>{" "}
          un match nul a toujours une différence de buts nulle. Le bonus de 2 pts
          ne s&apos;applique donc pas aux nuls — un nul bien vu mais au mauvais
          score rapporte 1 pt (et 3 si le score est exact).
        </p>
      </Card>

      {/* ── Jokers ── */}
      <h2 className="mb-3 flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-bold">
        <span className="text-base">🃏</span>
        Les jokers
      </h2>

      <Card className="glass mb-3 p-4">
        <p className="mb-3 text-sm leading-relaxed text-[var(--color-cream)]">
          Un joker <strong>doublera les points</strong> d&apos;un pronostic (×2).
          À utiliser stratégiquement sur tes pronostics les plus confiants !
        </p>

        <div className="flex flex-col gap-3">
          {/* Poules */}
          <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-semibold text-[var(--color-cream)]">
                Phase de poules
              </span>
              <span className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-gold)]">
                4 jokers
              </span>
            </div>
            <p className="text-xs text-[var(--color-muted)]">
              Utilisables sur n&apos;importe quel match de la phase de groupes.
            </p>
          </div>

          {/* Phase finale */}
          <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-semibold text-[var(--color-cream)]">
                Phase finale
              </span>
              <span className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-gold)]">
                2 jokers
              </span>
            </div>
            <p className="text-xs text-[var(--color-muted)]">
              Huitièmes, quarts, demies, finale et match pour la 3ᵉ place.
            </p>
          </div>
        </div>
      </Card>

      {/* Exemple concret */}
      <Card className="border-[var(--color-gold)]/25 bg-[var(--color-gold)]/[0.04] p-4">
        <h3 className="mb-2 font-semibold text-[var(--color-gold)]">
          💡 Exemple
        </h3>
        <p className="text-sm leading-relaxed text-[var(--color-muted)]">
          Tu pronostiques <strong className="text-[var(--color-cream)]">2-1</strong> avec
          un joker, et le match finit <strong className="text-[var(--color-cream)]">2-1</strong>.
          Score exact : <strong className="text-[var(--color-gold)]">3 pts × 2 = 6 pts</strong> 🎉
        </p>
      </Card>
    </>
  );
}
