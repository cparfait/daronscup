import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { SeasonLogo } from "@/components/season-logo";
import { getActiveSeason, hasTwoLeggedTies } from "@/lib/season";
import { seasonBudgets, firstPhaseLabel } from "@/lib/jokers";

export const metadata = { title: "Règles du jeu · DaronsFC" };
export const dynamic = "force-dynamic";

/**
 * « Comment ça marche » — la page de référence du jeu, adaptée à la saison en
 * cours (format de la compétition, budgets de jokers, périmètre de pari).
 *
 * C'est ici qu'on explique tout ce qui n'est pas devinable depuis l'interface :
 * pourquoi certains matchs ne sont pas pronosticables, ce qu'est le score
 * cumulé en aller-retour, à quoi servent les duels…
 */
export default async function ReglesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const season = await getActiveSeason();
  const budgets = seasonBudgets(season);
  const twoLegged = hasTwoLeggedTies(season);
  const isClubs = season?.kind === "CLUBS";
  const restricted = (season?.focusCountries.length ?? 0) > 0;

  return (
    <>
      <Link
        href="/profile"
        className="mb-5 inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-cream)]"
      >
        <ArrowLeft className="size-4" />
        <span>Profil</span>
      </Link>

      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            Règles du jeu <SeasonLogo season={season} size={26} />
          </span>
        }
        subtitle={season?.name ?? "Comment ça marche"}
      />

      <div className="flex flex-col gap-4">
        {/* ── 1. Sur quoi on parie ── */}
        <Section emoji="⚽" title="Sur quoi on parie">
          {restricted ? (
            <>
              <P>
                La phase de ligue de la Ligue des Champions compte{" "}
                <B>144 matchs</B>. Impossible de tout remplir. Alors on a réduit
                le périmètre : tant qu&apos;un <B>club français</B> est encore en
                lice, on ne pronostique <B>que ses matchs</B>.
              </P>
              <P>
                Concrètement, ça fait une petite trentaine de matchs sur la
                saison au lieu de 189. L&apos;onglet <B>Matchs</B> ne te montre
                que les affiches ouvertes, et te dit combien sont masquées.
              </P>
              <P>
                Le jour où les clubs français sont tous éliminés,{" "}
                <B>tout s&apos;ouvre</B> : barrages, huitièmes, quarts… tu
                pronostiques alors l&apos;intégralité des matchs restants.
              </P>
              <Note>
                Les matchs non pronosticables restent visibles dans{" "}
                <B>Résultats</B> — tu suis la compétition en entier, tu ne paries
                simplement pas dessus.
              </Note>
            </>
          ) : (
            <P>
              Tu pronostiques le score exact de chaque match de la compétition,
              modifiable jusqu&apos;au coup d&apos;envoi. Après, c&apos;est
              verrouillé — et les pronos de tout le groupe deviennent visibles.
            </P>
          )}
        </Section>

        {/* ── 2. Le barème ── */}
        <Section emoji="🧮" title="Comment on marque des points">
          <P>
            Le barème est <B>indexé sur les cotes</B> : plus le résultat était
            improbable, plus il rapporte. On appelle <B>R</B> les points du bon
            résultat, entre <B>1</B> (grand favori) et <B>6</B> (gros exploit).
          </P>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            <Rule label="🎯 Score exact" value="R × 2" />
            <Rule label="⚽ Bon vainqueur + bonne différence de buts" value="R + 1" />
            <Rule label="✅ Bon sens du résultat" value="R" />
            <Rule label="❌ Mauvais prono" value="0" />
            <Rule label="🃏 Joker activé" value="× 2" />
          </ul>
          <Note>
            Un nul a toujours une différence de buts nulle : le bonus « bonne
            diff » ne s&apos;y applique donc pas.
          </Note>
          <Link
            href="/profile/scoring"
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-gold-bright)] hover:underline"
          >
            Le barème en détail <ChevronRight className="size-4" />
          </Link>
        </Section>

        {/* ── 3. Les jokers ── */}
        <Section emoji="🃏" title="Les jokers">
          <P>
            Un joker <B>double les points</B> d&apos;un prono. Budget de cette
            saison : <B>{budgets.group}</B> en {firstPhaseLabel(season).toLowerCase()}{" "}
            et <B>{budgets.knockout}</B> en phase finale.
          </P>
          <P>
            À garder pour les matchs où tu te sens vraiment inspiré : un joker sur
            un prono raté ne coûte rien de plus, mais il est perdu pour la suite.
          </P>
        </Section>

        {/* ── 4. Le format de la compétition ── */}
        {isClubs && (
          <Section emoji="⭐" title="Le format de la Ligue des Champions">
            <P>
              <B>Phase de ligue</B> : 36 clubs dans un classement unique, 8
              journées. Les 8 premiers filent en huitièmes, les 9ᵉ à 24ᵉ passent
              par des barrages, les autres sont éliminés.
            </P>
            {twoLegged && (
              <>
                <P>
                  <B>Aller-retour</B> : chaque tour à élimination directe se joue
                  en deux manches (sauf la finale). Tu pronostiques{" "}
                  <B>chaque match séparément</B>, et le tableau affiche le{" "}
                  <B>score cumulé</B> — c&apos;est lui qui qualifie.
                </P>
                <P>
                  Du coup, sur une manche, un <B>nul est un résultat normal</B> :
                  on ne te demande pas de désigner un vainqueur aux tirs au but.
                  Sauf en <B>finale</B>, qui est un match sec.
                </P>
              </>
            )}
          </Section>
        )}

        {/* ── 5. Le pari champion ── */}
        <Section emoji="🏆" title="Le pari vainqueur">
          <P>
            Un seul choix, <B>définitif</B> : l&apos;équipe que tu vois soulever
            le trophée. Si tu tombes juste, <B>+{season?.championBonus ?? 50} points</B>{" "}
            en fin de compétition.
          </P>
          <P>
            Les paris ferment au <B>coup d&apos;envoi du premier match à
            élimination directe</B> — après, la moitié du plateau est connue et ça
            n&apos;aurait plus de sel.
          </P>
        </Section>

        {/* ── 6. Le groupe ── */}
        <Section emoji="👥" title="Ton groupe">
          <P>
            Le classement, le tchat et les duels sont <B>propres à ton groupe</B>.
            Tes pronos, eux, sont les mêmes partout : tu ne remplis qu&apos;une
            fois.
          </P>
          <P>
            Après chaque match, le bot poste un <B>récap</B> dans le tchat :
            podium, meilleurs pronos, jokers grillés, changement de leader… et la{" "}
            <B>boulette du jour</B>, pour celui qui était le plus loin du compte.
          </P>
        </Section>

        {/* ── 7. Duels, séries et couronnes ── */}
        <Section emoji="⚔️" title="Duels, séries et petites gloires">
          <P>
            À chaque journée, tu es opposé à un membre du groupe par rotation :
            celui qui marque le plus remporte le <B>duel</B>. Un bilan
            tête-à-tête se construit sur la saison.
          </P>
          <P>
            Une <B>série</B> de 3 bons résultats d&apos;affilée ou plus
            s&apos;affiche au classement (🔥). Le vainqueur de la saison
            précédente porte une <B>couronne</B> 👑 toute la saison suivante.
          </P>
          <P>
            Tu peux aussi afficher ton <B>club de cœur</B> à côté de ton nom.
            Zéro point en jeu — juste tes couleurs, et le chambrage qui va avec.
          </P>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href="/profile/rivals"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-pitch-bright)] hover:underline"
            >
              Mes duels <ChevronRight className="size-4" />
            </Link>
            <Link
              href="/museum"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-danger)] hover:underline"
            >
              Musée des horreurs <ChevronRight className="size-4" />
            </Link>
          </div>
        </Section>

        {/* ── 8. Les saisons ── */}
        <Section emoji="🗓️" title="Les saisons">
          <P>
            L&apos;app suit <B>une compétition à la fois</B>. À la fin, le
            classement est figé dans les <B>archives</B> avec le palmarès de
            chaque groupe, puis tout le monde repart à <B>zéro point</B> pour la
            compétition suivante.
          </P>
          <P>
            Les matchs, résultats et pronos des saisons passées ne sont jamais
            effacés : tu peux les reconsulter à tout moment.
          </P>
          <Link
            href="/archives"
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-pitch-bright)] hover:underline"
          >
            Voir les archives <ChevronRight className="size-4" />
          </Link>
        </Section>
      </div>
    </>
  );
}

/* ─── Briques de mise en page ─── */

function Section({
  emoji,
  title,
  children,
}: {
  emoji: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="glass p-4">
      <h2 className="mb-2 flex items-center gap-2 font-[family-name:var(--font-display)] text-base font-bold text-[var(--color-cream)]">
        <span className="text-lg leading-none">{emoji}</span>
        {title}
      </h2>
      <div className="flex flex-col gap-2">{children}</div>
    </Card>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm leading-relaxed text-[var(--color-muted)]">{children}</p>
  );
}

function B({ children }: { children: React.ReactNode }) {
  return <strong className="text-[var(--color-cream)]">{children}</strong>;
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-xs leading-relaxed text-[var(--color-muted)]">
      💡 {children}
    </p>
  );
}

function Rule({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center gap-2 rounded-lg bg-[var(--color-surface-2)] px-3 py-1.5">
      <span className="min-w-0 flex-1 text-[var(--color-muted)]">{label}</span>
      <span className="shrink-0 font-[family-name:var(--font-mono)] font-bold text-[var(--color-gold)]">
        {value}
      </span>
    </li>
  );
}
