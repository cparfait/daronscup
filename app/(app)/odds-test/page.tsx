import { TrendingUp, Info } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Flag } from "@/components/flag";
import { countryCode } from "@/lib/flags";
import { formatKickoff } from "@/lib/utils";
import {
  fetchLiveOdds,
  impliedProbabilities,
  outcomeTier,
  BASE_CORRECT_RESULT,
  SAMPLE_ODDS,
  ODDS_SPORT,
  type OddsMatch,
} from "@/lib/odds";

export const metadata = { title: "Test cotes · DaronsFC" };
export const dynamic = "force-dynamic";

/** Une colonne d'issue (1 / N / 2) : cote, proba implicite, palier, points. */
function OutcomeCol({
  label,
  odds,
  prob,
}: {
  label: React.ReactNode;
  odds: number;
  prob: number;
}) {
  const tier = outcomeTier(prob);
  const points = BASE_CORRECT_RESULT + tier.bonus;
  return (
    <div className="flex flex-1 flex-col items-center gap-1 rounded-xl bg-[var(--color-surface-2)] px-2 py-3 text-center">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
        {label}
      </span>
      <span className="font-[family-name:var(--font-mono)] text-lg font-bold tabular-nums text-[var(--color-cream)]">
        {odds.toFixed(2)}
      </span>
      <span className="text-[11px] text-[var(--color-muted)]">
        {Math.round(prob)}%
      </span>
      <span
        className="mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
        style={{ color: tier.accent, backgroundColor: "color-mix(in srgb, currentColor 15%, transparent)" }}
      >
        {tier.label}
      </span>
      <span className="font-[family-name:var(--font-display)] text-sm font-bold text-[var(--color-pitch-bright)]">
        {points} pt{points > 1 ? "s" : ""}
      </span>
    </div>
  );
}

function OddsRow({ m }: { m: OddsMatch }) {
  const p = impliedProbabilities(m);
  return (
    <Card className="glass p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Flag code={countryCode(m.home)} className="h-5 w-7 shrink-0" />
          <span className="truncate text-sm font-bold">{m.home}</span>
          <span className="text-xs text-[var(--color-muted)]">vs</span>
          <Flag code={countryCode(m.away)} className="h-5 w-7 shrink-0" />
          <span className="truncate text-sm font-bold">{m.away}</span>
        </div>
      </div>
      <p className="mb-3 font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-muted)]">
        {formatKickoff(m.commenceTime)}
        {m.bookmaker ? ` · ${m.bookmaker}` : ""}
      </p>

      <div className="flex items-stretch gap-2">
        <OutcomeCol
          label={
            <span className="inline-flex items-center gap-1">
              <Flag code={countryCode(m.home)} className="h-3 w-4" /> 1
            </span>
          }
          odds={m.oddsHome}
          prob={p.home}
        />
        <OutcomeCol label="Nul" odds={m.oddsDraw} prob={p.draw} />
        <OutcomeCol
          label={
            <span className="inline-flex items-center gap-1">
              2 <Flag code={countryCode(m.away)} className="h-3 w-4" />
            </span>
          }
          odds={m.oddsAway}
          prob={p.away}
        />
      </div>
    </Card>
  );
}

export default async function OddsTestPage() {
  let matches: OddsMatch[] = SAMPLE_ODDS;
  let live = false;
  let error: string | null = null;

  try {
    const fetched = await fetchLiveOdds();
    if (fetched && fetched.length > 0) {
      matches = fetched;
      live = true;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Erreur de récupération des cotes.";
  }

  return (
    <>
      <PageHeader
        title="Test cotes"
        subtitle="Aperçu d'un scoring façon MPP basé sur les cotes"
        action={
          <span
            className={
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider " +
              (live
                ? "bg-[var(--color-pitch)]/15 text-[var(--color-pitch-bright)]"
                : "bg-[var(--color-gold)]/15 text-[var(--color-gold)]")
            }
          >
            <TrendingUp className="size-3" />
            {live ? "En direct" : "Exemple"}
          </span>
        }
      />

      {!live && (
        <Card className="glass mb-5 flex items-start gap-3 border-[var(--color-gold)]/25 bg-[var(--color-gold)]/[0.05] p-3.5">
          <Info className="mt-0.5 size-4 shrink-0 text-[var(--color-gold)]" />
          <div className="text-xs leading-relaxed text-[var(--color-muted)]">
            <p className="font-semibold text-[var(--color-cream)]">
              Données d&apos;exemple
            </p>
            <p className="mt-0.5">
              Ajoute une clé <code className="text-[var(--color-cream)]">ODDS_API_KEY</code>{" "}
              (gratuite sur the-odds-api.com) pour afficher les vraies cotes du
              sport <code className="text-[var(--color-cream)]">{ODDS_SPORT}</code>.
            </p>
            {error && (
              <p className="mt-1.5 text-red-400">Dernière erreur : {error}</p>
            )}
          </div>
        </Card>
      )}

      {/* Légende des paliers */}
      <Card className="glass mb-5 p-3.5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Principe — plus l&apos;issue est improbable, plus elle rapporte
        </p>
        <ul className="space-y-1 text-xs text-[var(--color-muted)]">
          <li>
            <span className="font-semibold text-[var(--color-cream)]">Favori</span>{" "}
            (≥ 50 %) → 1 pt
          </li>
          <li>
            <span className="font-semibold text-[var(--color-pitch-bright)]">Équilibré</span>{" "}
            (33–50 %) → 1 + 1 = 2 pts
          </li>
          <li>
            <span className="font-semibold text-[var(--color-gold)]">Outsider</span>{" "}
            (18–33 %) → 1 + 2 = 3 pts
          </li>
          <li>
            <span className="font-semibold text-[var(--color-gold-bright)]">Gros outsider</span>{" "}
            (&lt; 18 %) → 1 + 3 = 4 pts
          </li>
        </ul>
        <p className="mt-2 text-[11px] italic text-[var(--color-muted)]">
          Les points indiqués correspondent au « bon résultat ». Le score exact
          et l&apos;écart de buts s&apos;ajouteraient par-dessus, comme aujourd&apos;hui.
        </p>
      </Card>

      <div className="flex flex-col gap-3">
        {matches.map((m, i) => (
          <OddsRow key={`${m.home}-${m.away}-${i}`} m={m} />
        ))}
      </div>
    </>
  );
}
