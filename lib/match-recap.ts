/**
 * Récap automatique posté dans le tchat de chaque groupe après un match terminé.
 *
 * Déclenché par `applyMatchResult` uniquement à la TRANSITION vers FINISHED
 * (jamais sur un simple rescore). Idempotent par (match, groupe) grâce au champ
 * `Message.matchId`. Le message est attribué au compte bot « DaronsFC » et
 * affiché en bandeau (cf. `isSystem`).
 */

import { prisma } from "./prisma";
import { computePoints } from "./scoring";
import { compareRanked, type Rankable } from "./ranking";

/** Compte « système » auteur des messages auto (créé par `maybeInit`). */
export const SYSTEM_USER_EMAIL = "bot@daronsfc.local";
export const SYSTEM_USER_NAME = "DaronsFC";

const MEDALS = ["🥇", "🥈", "🥉"];

/**
 * Déclenche une push via la route interne node-only (`/api/internal/push`).
 * On passe par HTTP plutôt que d'importer `lib/push` : ça garde `web-push` hors
 * du graphe d'import de football-data / instrumentation (sinon le bundle edge
 * échoue sur `require('http')`). Fire-and-forget.
 */
function firePush(
  userIds: string[],
  payload: { title: string; body: string; url: string }
): void {
  const secret = process.env.AUTH_SECRET;
  if (!secret || userIds.length === 0) return;
  const port = process.env.PORT ?? "3000";
  fetch(`http://127.0.0.1:${port}/api/internal/push`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-internal-secret": secret },
    body: JSON.stringify({ userIds, payload }),
  }).catch(() => {});
}

type MemberRow = {
  id: string;
  name: string;
  predicted: boolean;
  joker: boolean;
  matchPts: number;
  exact: boolean;
  scored: boolean; // a marqué des points sur ce match
  /** Prono posé (null s'il n'a pas joué ce match) — sert à la « boulette ». */
  pred: { home: number; away: number } | null;
  after: Rankable; // classement après ce match (points figés actuels)
  before: Rankable; // classement reconstitué avant ce match
};

/**
 * Poste le récap de ce match dans les groupes concernés (si pas déjà fait).
 * Bornage à la saison du match : sans ça, un récap tomberait aussi dans les
 * tchats des groupes de saisons archivées.
 */
export async function postMatchRecaps(matchId: string): Promise<void> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { result: true },
  });
  if (!match?.result || match.result.status !== "FINISHED") return;
  const result = match.result;

  const bot = await prisma.user.findUnique({
    where: { email: SYSTEM_USER_EMAIL },
    select: { id: true },
  });
  if (!bot) return; // bot non initialisé → on s'abstient silencieusement

  // Détail des points de ce match, par joueur.
  const matchPreds = await prisma.prediction.findMany({
    where: { matchId },
    select: { userId: true, homeScore: true, awayScore: true, joker: true },
  });
  const breakdown = new Map<
    string,
    {
      points: number;
      exact: boolean;
      correct: boolean;
      joker: boolean;
      pred: { home: number; away: number };
    }
  >();
  for (const p of matchPreds) {
    const b = computePoints(
      { homeScore: p.homeScore, awayScore: p.awayScore },
      { homeScore: result.homeScore, awayScore: result.awayScore },
      p.joker,
      { home: match.oddsHome, draw: match.oddsDraw, away: match.oddsAway }
    );
    breakdown.set(p.userId, {
      points: b.points,
      exact: b.exactScore,
      correct: b.correctResult,
      joker: p.joker,
      pred: { home: p.homeScore, away: p.awayScore },
    });
  }

  const groups = await prisma.group.findMany({
    where: { seasonId: match.seasonId },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, score: true } },
        },
      },
    },
  });

  for (const group of groups) {
    // Pas de récap pour un groupe quasi vide (peu d'intérêt, podium ridicule).
    if (group.members.length < 2) continue;

    // Idempotence : un seul récap par match et par groupe.
    const already = await prisma.message.findFirst({
      where: { groupId: group.id, matchId, isSystem: true, systemKind: "RECAP" },
      select: { id: true },
    });
    if (already) continue;

    const rows: MemberRow[] = group.members.map((m) => {
      const name = m.user.name ?? "Daron";
      const bd = breakdown.get(m.user.id);
      const pts = m.user.score?.points ?? 0;
      const exactScores = m.user.score?.exactScores ?? 0;
      const correctResults = m.user.score?.correctResults ?? 0;
      const matchPts = bd?.points ?? 0;
      return {
        id: m.user.id,
        name,
        predicted: !!bd,
        joker: bd?.joker ?? false,
        matchPts,
        exact: bd?.exact ?? false,
        scored: matchPts > 0,
        pred: bd ? bd.pred : null,
        after: { points: pts, exactScores, correctResults, name },
        // Reconstitution de l'état AVANT ce match en retranchant sa contribution.
        before: {
          points: pts - matchPts,
          exactScores: exactScores - (bd?.exact ? 1 : 0),
          correctResults: correctResults - (bd?.correct ? 1 : 0),
          name,
        },
      };
    });

    // Pas de récap si personne dans ce groupe n'a pronostiqué : ça n'apporte
    // rien (classement inchangé) et éviterait de spammer les groupes inactifs
    // sur les matchs qu'ils ignorent.
    if (!rows.some((r) => r.predicted)) continue;

    const content = buildRecap(match.homeTeam, match.awayTeam, result, rows, matchId);
    if (!content) continue;

    await prisma.message.create({
      data: {
        userId: bot.id,
        groupId: group.id,
        matchId,
        isSystem: true,
        systemKind: "RECAP",
        content,
      },
    });

    // Notification push aux membres du groupe.
    const memberIds = group.members.map((m) => m.user.id);
    firePush(memberIds, {
      title: `${group.name} · Récap`,
      body: `🏁 ${match.homeTeam} ${result.homeScore}–${result.awayScore} ${match.awayTeam} — nouveau classement !`,
      url: "/chat",
    });
  }
}

/**
 * Banque de vannes du bot, par situation. On en tire UNE de façon déterministe
 * (graine = id du match) : le récap ne doit pas changer si quelqu'un recharge
 * le tchat, et les deux membres d'un groupe doivent lire la même chose.
 */
const PUNCHLINES = {
  /** Un joker posé et grillé. */
  jokerFail: [
    "Le joker, c'était censé DOUBLER les points. Pas les zéros.",
    "Poser un joker là-dessus, il fallait oser. Il a osé.",
    "On appelle ça investir à perte.",
    "Le joker retourne au vestiaire, tête basse.",
  ],
  /** Personne n'a marqué. */
  blank: [
    "Une communion dans la médiocrité. C'est beau.",
    "Zéro pour tout le monde : au moins le classement ne bouge pas.",
    "Ce match, personne ne l'avait vu venir. Personne.",
    "On va dire que c'était un match piège.",
  ],
  /** Un seul joueur a marqué des points. */
  loneWinner: [
    "Seul contre tous, et il avait raison.",
    "Les autres feraient bien de recopier, la prochaine fois.",
    "Un flair de renard. Ou un coup de chance monumental.",
  ],
  /** Score exact trouvé. */
  exact: [
    "Au but près. Suspect.",
    "Soit c'est du talent, soit il a un cousin dans le vestiaire.",
    "Le genre de prono qu'on ressort pendant dix ans.",
  ],
  /** Changement de leader. */
  newLeader: [
    "Le trône a changé de propriétaire.",
    "Profites-en, ça ne dure jamais.",
    "L'ancien leader n'a rien vu venir.",
  ],
  /** Grosse boulette (écart énorme). */
  howler: [
    "On a retrouvé le prono. Il était très loin.",
    "Statistiquement, c'est un exploit d'être aussi à côté.",
    "Ce prono entre directement au musée des horreurs.",
    "Il y a des jours où il faut savoir s'abstenir.",
  ],
} as const;

/** Tire une vanne de façon stable pour un match donné. */
function punchline(kind: keyof typeof PUNCHLINES, seed: string): string {
  const bank = PUNCHLINES[kind];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return bank[Math.abs(h) % bank.length]!;
}

function buildRecap(
  homeTeam: string,
  awayTeam: string,
  result: { homeScore: number; awayScore: number },
  rows: MemberRow[],
  seed: string
): string {
  const lines: string[] = [];

  // ── En-tête : le score ──
  lines.push(`🏁 ${homeTeam} ${result.homeScore}–${result.awayScore} ${awayTeam}`);

  const anyPredicted = rows.some((r) => r.predicted);

  if (!anyPredicted) {
    lines.push("🙈 Personne n'avait pronostiqué ce match…");
  } else {
    // ── Meilleurs pronos ──
    const exacts = rows.filter((r) => r.exact).map((r) => r.name);
    if (exacts.length > 0) {
      lines.push(`🎯 Score exact : ${exacts.join(", ")} — ${punchline("exact", seed)}`);
    } else {
      const best = Math.max(...rows.map((r) => r.matchPts));
      if (best > 0) {
        const names = rows.filter((r) => r.matchPts === best).map((r) => r.name);
        lines.push(`✅ Meilleur prono : ${names.join(", ")} (+${best})`);
        // Un seul à avoir marqué alors que d'autres avaient joué : c'est notable.
        const scorers = rows.filter((r) => r.scored);
        const players = rows.filter((r) => r.predicted);
        if (scorers.length === 1 && players.length >= 3) {
          lines.push(`🦊 ${punchline("loneWinner", seed)}`);
        }
      } else {
        lines.push("💀 Personne n'a marqué le moindre point sur ce match !");
        lines.push(punchline("blank", seed));
      }
    }

    // ── Jokers ──
    const jokerWin = rows.filter((r) => r.joker && r.matchPts > 0);
    const jokerFail = rows.filter((r) => r.joker && r.matchPts === 0);
    for (const r of jokerWin) {
      lines.push(`🃏 ${r.name} double la mise : +${r.matchPts} pts 😎`);
    }
    for (const r of jokerFail) {
      lines.push(
        `🃏 Joker grillé pour ${r.name}… 0 pt 💀 ${punchline("jokerFail", seed)}`
      );
    }

    // ── La boulette du jour ──
    // Le prono le plus éloigné du score réel (somme des écarts), parmi ceux qui
    // n'ont rien marqué. On ne l'annonce que si l'écart est vraiment gênant, et
    // s'ils sont au moins deux à avoir joué (sinon c'est du tir sur ambulance).
    const players = rows.filter((r) => r.predicted && r.pred);
    if (players.length >= 2) {
      let worst: { name: string; gap: number; pred: { home: number; away: number } } | null =
        null;
      for (const r of players) {
        if (r.scored) continue;
        const gap =
          Math.abs(r.pred!.home - result.homeScore) +
          Math.abs(r.pred!.away - result.awayScore);
        if (!worst || gap > worst.gap) {
          worst = { name: r.name, gap, pred: r.pred! };
        }
      }
      if (worst && worst.gap >= 3) {
        lines.push(
          `🤡 Boulette du jour : ${worst.name} avait dit ${worst.pred.home}–${worst.pred.away}. ${punchline("howler", seed)}`
        );
      }
    }
  }

  // ── Classements avant / après pour les mouvements ──
  const afterSorted = [...rows].sort((a, b) => compareRanked(a.after, b.after));
  const beforeSorted = [...rows].sort((a, b) => compareRanked(a.before, b.before));
  const afterRank = new Map(afterSorted.map((r, i) => [r.id, i + 1]));
  const beforeRank = new Map(beforeSorted.map((r, i) => [r.id, i + 1]));

  // ── Changement de leader ──
  const newLeader = afterSorted[0];
  const oldLeader = beforeSorted[0];
  if (newLeader && oldLeader && newLeader.id !== oldLeader.id) {
    lines.push(
      `👑 Nouveau leader : ${newLeader.name} prend la tête ! ${punchline("newLeader", seed)}`
    );
  }

  // ── Plus grosse remontée (hors changement de leader déjà annoncé) ──
  let topClimber: { name: string; delta: number } | null = null;
  for (const r of rows) {
    const delta = (beforeRank.get(r.id) ?? 0) - (afterRank.get(r.id) ?? 0);
    if (delta > 0 && (!topClimber || delta > topClimber.delta)) {
      topClimber = { name: r.name, delta };
    }
  }
  if (
    topClimber &&
    !(newLeader && oldLeader && newLeader.id !== oldLeader.id && topClimber.name === newLeader.name)
  ) {
    lines.push(
      `📈 ${topClimber.name} grimpe de ${topClimber.delta} place${topClimber.delta > 1 ? "s" : ""} !`
    );
  }

  // ── Podium ──
  const podium = afterSorted
    .slice(0, 3)
    .map((r, i) => `${MEDALS[i]} ${r.name} ${r.after.points} pts`)
    .join("  ·  ");
  if (podium) lines.push(`🏆 ${podium}`);

  return lines.join("\n");
}
