import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { SeasonLogo } from "@/components/season-logo";
import { getViewingSeason, hasTwoLeggedTies } from "@/lib/season";
import { seasonBudgets, firstPhaseLabel } from "@/lib/jokers";

export const metadata = { title: "Prise en main · DaronsFC" };
export const dynamic = "force-dynamic";

/**
 * « Prise en main » — le guide illustré du nouveau joueur, pensé pour le
 * lancement d'une saison.
 *
 * Complémentaire de /regles, qui reste la référence textuelle exhaustive : ici
 * on suit l'app écran par écran, capture à l'appui, dans l'ordre où un joueur
 * les découvre. Les captures vivent dans `public/guide/` et sont faites au
 * format téléphone (390×844 @2x) — c'est l'usage réel de l'app.
 */
export default async function GuidePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const season = await getViewingSeason();
  const budgets = seasonBudgets(season);
  const twoLegged = hasTwoLeggedTies(season);
  const isClubs = season?.kind === "CLUBS";
  const restricted = (season?.focusCountries.length ?? 0) > 0;
  const bonus = season?.championBonus ?? 50;
  // 10 étapes systématiques, plus les deux conditionnelles ci-dessous.
  const stepCount = 10 + (restricted ? 1 : 0) + (isClubs && twoLegged ? 1 : 0);

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
            Prise en main <SeasonLogo season={season} size={26} />
          </span>
        }
        subtitle={season?.name ?? "Le tour du propriétaire"}
      />

      <Card className="glass mb-4 p-4">
        <P>
          Bienvenue chez <B>DaronsFC</B>. Le principe tient en une phrase : tu
          pronostiques le <B>score exact</B> des matchs, tu marques des points
          selon ce que valait le résultat, et le classement de ton groupe tranche
          à la fin.
        </P>
        <P>
          Ce guide fait le tour de l&apos;app en <B>{stepCount} étapes</B>,
          captures à l&apos;appui. Compte cinq minutes.
        </P>
      </Card>

      <div className="flex flex-col gap-4 [counter-reset:step]">
        {/* ── 1. Se connecter ── */}
        <Step emoji="🔑" title="Créer son compte">
          <P>
            Deux façons d&apos;entrer : <B>Continuer avec Google</B> en un clic,
            ou un classique email + mot de passe. Les deux mènent au même compte
            si tu utilises la même adresse.
          </P>
          <P>
            Tu arrives normalement par un <B>lien d&apos;invitation</B> envoyé
            par l&apos;organisateur de ton groupe : il te met dedans
            automatiquement.
          </P>
          <Shot src="/guide/01-connexion.webp" alt="Écran de connexion DaronsFC" />
        </Step>

        {/* ── 2. Le Hub ── */}
        <Step emoji="🏠" title="Le Hub, ton point de départ">
          <P>
            C&apos;est l&apos;écran d&apos;accueil. Il te donne, dans
            l&apos;ordre : tes <B>points</B>, tes <B>scores exacts</B>, ton{" "}
            <B>rang</B>, le <B>prochain match</B> à pronostiquer avec ses points
            en jeu, et le podium du moment.
          </P>
          <P>
            Tout en haut, le sélecteur de <B>groupe</B> : si tu joues dans
            plusieurs bandes, tu bascules de l&apos;une à l&apos;autre ici.
          </P>
          <Shot src="/guide/02-hub.webp" alt="Le Hub de DaronsFC" />
          <Note>
            L&apos;<B>enjeu de la saison</B> est fixé par l&apos;organisateur —
            et l&apos;app te rappelle en permanence qui est actuellement dans le
            viseur. Aucune pitié.
          </Note>
          <Shot
            src="/guide/03-hub-enjeu.webp"
            alt="L'enjeu de la saison et le prochain match"
            caption="L'enjeu, tes compteurs et le prochain match avec ses points en jeu"
          />
        </Step>

        {/* ── 3. Pronostiquer ── */}
        <Step emoji="🎯" title="Faire ses pronos">
          <P>
            Onglet <B>Matchs</B>. Pour chaque affiche, tu règles le score avec
            les boutons <B>−</B> et <B>+</B>. C&apos;est{" "}
            <B>enregistré tout seul</B> : pas de bouton « valider » à oublier.
          </P>
          <P>
            Au-dessus des équipes, le bloc <B>Points en jeu</B> annonce ce que
            rapporte chaque issue. Sur la capture, une victoire de Monaco vaut{" "}
            <B>5 points</B> et une victoire du Barça <B>3</B> : Monaco est
            l&apos;outsider, donc il paie plus.
          </P>
          <P>
            Tu peux aussi laisser un <B>commentaire</B> visible par le groupe —
            le meilleur endroit pour t&apos;engager sur un score que tu
            regretteras publiquement.
          </P>
          <Shot
            src="/guide/05-prono.webp"
            alt="Carte de pronostic avec les points en jeu et le joker"
            caption="Points en jeu par issue, réglage du score, joker et commentaire"
          />
          <Warn>
            Tout se verrouille au <B>coup d&apos;envoi</B>, à la seconde près.
            Après, plus aucune modification n&apos;est possible — et les pronos
            de tout le groupe deviennent visibles.
          </Warn>
        </Step>

        {/* ── 4. Le barème ── */}
        <Step emoji="🧮" title="Comment on marque des points">
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
            C&apos;est la difficulté du <B>résultat réel</B> qui compte, pas
            celle de ton prono. Miser sur le favori et voir l&apos;outsider
            l&apos;emporter ne rapporte rien : c&apos;est celui qui avait vu
            venir l&apos;exploit qui empoche le gros lot.
          </Note>
          <Link
            href="/profile/scoring"
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-gold-bright)] hover:underline"
          >
            Le barème en détail <ChevronRight className="size-4" />
          </Link>
        </Step>

        {/* ── 5. Les jokers ── */}
        <Step emoji="🃏" title="Les jokers">
          <P>
            Un joker <B>double les points</B> d&apos;un prono. Tu en as{" "}
            <B>{budgets.group}</B> pour la {firstPhaseLabel(season).toLowerCase()}{" "}
            et <B>{budgets.knockout}</B> pour la phase finale — deux budgets
            séparés, l&apos;un ne se reporte pas sur l&apos;autre.
          </P>
          <P>
            Tu l&apos;actives d&apos;un tap sur la puce <B>Joker ×2</B> de la
            carte du match. Ton compteur reste visible depuis l&apos;onglet{" "}
            <B>Profil</B>.
          </P>
          <Shot
            src="/guide/10-profil-club.webp"
            alt="Compteur de jokers et badges dans le profil"
            caption="Tes jokers restants, par phase — et ta collection de badges"
          />
          <Note>
            Un joker sur un prono raté ne coûte rien de plus que 0 point. Mais il
            est perdu pour la suite : garde-les pour les matchs où tu te sens
            vraiment inspiré.
          </Note>
        </Step>

        {/* ── 6. Périmètre de pari (saisons à clubs restreintes) ── */}
        {restricted && (
          <Step emoji="⚽" title="Sur quels matchs on parie">
            <P>
              La phase de ligue compte <B>144 matchs</B>. Impossible de tout
              remplir. Donc tant qu&apos;un <B>club français</B> est encore en
              lice, on ne pronostique <B>que ses matchs</B> — une petite
              trentaine sur la saison au lieu de 189.
            </P>
            <P>
              Le jour où ils sont tous éliminés, <B>tout s&apos;ouvre</B> :
              barrages, huitièmes, quarts… tu pronostiques alors l&apos;intégralité
              des matchs restants.
            </P>
            <Shot
              src="/guide/04-matchs.webp"
              alt="Liste des matchs ouverts aux pronostics"
              caption="L'onglet Matchs ne montre que les affiches ouvertes"
            />
            <Note>
              Les matchs non pronosticables restent visibles dans{" "}
              <B>Résultats</B> : tu suis la compétition en entier, tu ne paries
              simplement pas dessus.
            </Note>
          </Step>
        )}

        {/* ── 7. Format C1 ── */}
        {isClubs && twoLegged && (
          <Step emoji="⭐" title="Le format de la C1">
            <P>
              <B>Phase de ligue</B> : 36 clubs, un seul classement, 8 journées.
              Les 8 premiers filent en huitièmes, les 9ᵉ à 24ᵉ passent par des
              barrages, les autres sont éliminés.
            </P>
            <P>
              <B>Aller-retour</B> : chaque tour à élimination directe se joue en
              deux manches, sauf la finale. Tu pronostiques{" "}
              <B>chaque match séparément</B>, et c&apos;est le <B>score cumulé</B>{" "}
              qui qualifie.
            </P>
            <Note>
              Sur une manche, un <B>nul est un résultat normal</B> : on ne te
              demande pas de vainqueur aux tirs au but. Seule la <B>finale</B>,
              match sec, pose la question — et la bonne réponse vaut{" "}
              <B>R + 2</B>.
            </Note>
          </Step>
        )}

        {/* ── 8. Le pari vainqueur ── */}
        <Step
          emoji="🏆"
          title="Le pari vainqueur"
        >
          <P>
            Un seul choix, <B>définitif</B> : l&apos;équipe que tu vois soulever
            le trophée. Si tu tombes juste, <B>+{bonus} points</B> en fin de
            compétition. De quoi renverser une saison entière.
          </P>
          <P>
            Les paris ferment au <B>coup d&apos;envoi du premier match à
            élimination directe</B>. Ne traîne pas : ça ne se rattrape pas.
          </P>
        </Step>

        {/* ── 9. Résultats & classement ── */}
        <Step
          emoji="🏅"
          title="Résultats et classement"
        >
          <P>
            Les scores tombent <B>automatiquement</B>, sans que personne ait à
            les saisir : l&apos;app se synchronise toute seule, toutes les 90
            secondes quand un match est en cours.
          </P>
          <Shot
            src="/guide/06-resultats.webp"
            alt="Écran des résultats"
            caption="Chaque match terminé, avec ton prono et les points marqués"
          />
          <P>
            Au <B>classement</B>, plusieurs choses se lisent d&apos;un coup
            d&apos;œil : le podium, ta progression, le petit 🔥 des{" "}
            <B>séries</B> de bons résultats, l&apos;écusson de ton{" "}
            <B>club de cœur</B> à gauche du nom, et celui de ton{" "}
            <B>pari vainqueur</B> à droite des points.
          </P>
          <Shot
            src="/guide/07-classement.webp"
            alt="Classement du groupe avec podium"
            caption="Podium, séries en cours, club de cœur et pari vainqueur"
          />
          <Note>
            Trois vues au choix : <B>Mon groupe</B>, <B>Général</B> (tous les
            joueurs) et <B>Tournoi</B> (le tableau de la compétition).
          </Note>
        </Step>

        {/* ── 10. Tchat ── */}
        <Step
          emoji="💬"
          title="Le tchat et les récaps"
        >
          <P>
            Chaque groupe a son <B>tchat</B>. Après chaque match, un bot y poste
            un <B>récap</B> automatique : podium, meilleurs pronos, jokers
            grillés, changement de leader… et la <B>boulette du jour</B>, pour
            celui qui était le plus loin du compte.
          </P>
          <Shot
            src="/guide/08-tchat.webp"
            alt="Le tchat du groupe avec les récaps automatiques"
          />
        </Step>

        {/* ── 11. Profil ── */}
        <Step
          emoji="👤"
          title="Ton profil"
        >
          <P>
            Le coffre à jouets : ton <B>Wrapped</B> de la saison (taux de
            réussite, meilleur prono), tes <B>duels</B> contre les autres membres,
            le <B>musée des horreurs</B>, les <B>archives</B> des saisons passées
            et ta collection de <B>badges</B>.
          </P>
          <P>
            C&apos;est aussi là que tu choisis ton <B>club de cœur</B>, affiché à
            côté de ton nom au classement. <B>Zéro point en jeu</B> — juste tes
            couleurs, et le chambrage qui va avec.
          </P>
          <Shot
            src="/guide/09-profil.webp"
            alt="La page profil"
            caption="Wrapped, duels, musée des horreurs, archives et badges"
          />
          <Warn>
            Si tu jouais déjà la saison précédente, ton club de cœur est resté
            sur ton ancien choix. Pense à le remettre à jour pour cette saison.
          </Warn>
        </Step>

        {/* ── 12. Installer ── */}
        <Step
          emoji="📲"
          title="Installe-la sur ton téléphone"
        >
          <P>
            DaronsFC s&apos;installe comme une vraie application : depuis le menu
            de ton navigateur, <B>« Installer l&apos;application »</B> ou{" "}
            <B>« Ajouter à l&apos;écran d&apos;accueil »</B>. Elle s&apos;ouvre
            alors en plein écran, sans barre d&apos;adresse.
          </P>
          <P>
            Active les <B>notifications</B> dans la foulée : tu seras prévenu
            quand un résultat tombe et quand un match approche sans que tu aies
            pronostiqué. C&apos;est le meilleur moyen de ne pas prendre un zéro
            par simple oubli.
          </P>
        </Step>

        {/* ── Pour aller plus loin ── */}
        <Card className="glass p-4">
          <h2 className="mb-2 font-[family-name:var(--font-display)] text-base font-bold text-[var(--color-cream)]">
            Et voilà, tu sais tout
          </h2>
          <P>
            Le reste s&apos;apprend en jouant. Pour les détails — périmètre des
            pronos, duels, saisons, cas particuliers — la page des règles reprend
            tout, point par point.
          </P>
          <Link
            href="/regles"
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-pitch-bright)] hover:underline"
          >
            Les règles complètes <ChevronRight className="size-4" />
          </Link>
        </Card>
      </div>
    </>
  );
}

/* ─── Briques de mise en page ─── */

/**
 * Une étape du guide. Le numéro n'est pas passé en prop mais dérivé d'un
 * compteur CSS armé par le conteneur : les étapes conditionnelles (périmètre de
 * pari, format à clubs) se renumérotent donc toutes seules.
 */
function Step({
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
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-pitch)] text-xs font-bold text-white [counter-increment:step] before:[content:counter(step)]" />
        <span className="text-lg leading-none">{emoji}</span>
        {title}
      </h2>
      <div className="flex flex-col gap-2">{children}</div>
    </Card>
  );
}

/**
 * Capture d'écran présentée dans un cadre de téléphone. Largeur volontairement
 * contenue : une capture 390×844 affichée pleine largeur ferait défiler la page
 * sur des kilomètres.
 */
function Shot({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption?: string;
}) {
  return (
    <figure className="mt-3">
      <div className="mx-auto max-w-[230px] overflow-hidden rounded-[1.75rem] border-4 border-[#2a2a2a] bg-black shadow-[0_18px_40px_-16px_rgba(0,0,0,0.95)]">
        <Image
          src={src}
          alt={alt}
          width={780}
          height={1688}
          className="h-auto w-full"
          sizes="230px"
        />
      </div>
      {caption && (
        <figcaption className="mt-2 text-center text-xs leading-relaxed text-[var(--color-muted)]">
          {caption}
        </figcaption>
      )}
    </figure>
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

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1 rounded-xl border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 px-3 py-2 text-xs leading-relaxed text-[var(--color-muted)]">
      ⚠️ {children}
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
