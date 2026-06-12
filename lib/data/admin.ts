// ─────────────────────────────────────────────
// Couche d'accès aux données — console admin (serveur uniquement).
// ─────────────────────────────────────────────

import { prisma } from "@/lib/prisma";

export type AdminStats = {
  users: number;
  activePlayers: number;
  predictions: number;
  messages: number;
  finishedMatches: number;
  totalMatches: number;
  topScorer: { name: string; points: number } | null;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  banned: boolean;
  points: number;
  predictions: number;
};

/** Compteurs globaux pour le tableau de bord admin. */
export async function getAdminStats(): Promise<AdminStats> {
  const empty: AdminStats = {
    users: 0,
    activePlayers: 0,
    predictions: 0,
    messages: 0,
    finishedMatches: 0,
    totalMatches: 0,
    topScorer: null,
  };
  try {
    const [users, activePlayers, predictions, messages, finishedMatches, totalMatches, top] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { predictions: { some: {} } } }),
        prisma.prediction.count(),
        prisma.message.count(),
        prisma.result.count({ where: { status: "FINISHED" } }),
        prisma.match.count(),
        prisma.score.findFirst({
          where: { user: { banned: false } },
          orderBy: [{ points: "desc" }, { exactScores: "desc" }],
          include: { user: { select: { name: true } } },
        }),
      ]);
    return {
      users,
      activePlayers,
      predictions,
      messages,
      finishedMatches,
      totalMatches,
      topScorer:
        top && top.points > 0
          ? { name: top.user.name ?? "Anonyme", points: top.points }
          : null,
    };
  } catch {
    return empty;
  }
}

/** Liste des joueurs avec leur statut et leurs stats clés. */
export async function getAdminUsers(): Promise<AdminUser[]> {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        score: { select: { points: true } },
        _count: { select: { predictions: true } },
      },
    });
    return users.map((u) => ({
      id: u.id,
      name: u.name ?? "Daron anonyme",
      email: u.email,
      role: u.role,
      banned: u.banned,
      points: u.score?.points ?? 0,
      predictions: u._count.predictions,
    }));
  } catch {
    return [];
  }
}

export type AdminMatchResult = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  /** Résultat déjà saisi (terminé) → permet la correction + le pré-remplissage. */
  finished: boolean;
  homeScore: number | null;
  awayScore: number | null;
};

/**
 * Matchs éligibles à la saisie manuelle d'un score : ceux dont le coup d'envoi
 * est passé OU qui ont déjà un résultat. Les matchs terminés sont inclus pour
 * permettre une CORRECTION (le score saisi recalcule alors les points).
 * Triés du plus récent au plus ancien.
 */
export async function getMatchesForResultEntry(): Promise<AdminMatchResult[]> {
  try {
    const matches = await prisma.match.findMany({
      where: {
        OR: [{ kickoffAt: { lte: new Date() } }, { result: { isNot: null } }],
      },
      orderBy: { kickoffAt: "desc" },
      include: { result: { select: { homeScore: true, awayScore: true, status: true } } },
    });
    return matches.map((m) => ({
      id: m.id,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      kickoffAt: m.kickoffAt.toISOString(),
      finished: m.result?.status === "FINISHED",
      homeScore: m.result?.homeScore ?? null,
      awayScore: m.result?.awayScore ?? null,
    }));
  } catch {
    return [];
  }
}

export type AdminMatchBrief = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  finished: boolean;
};

/** TOUS les matchs (passés inclus) — pour l'import de pronos. */
export async function getAllMatchesBrief(): Promise<AdminMatchBrief[]> {
  try {
    const matches = await prisma.match.findMany({
      orderBy: { kickoffAt: "asc" },
      include: { result: { select: { status: true } } },
    });
    return matches.map((m) => ({
      id: m.id,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      finished: m.result?.status === "FINISHED",
    }));
  } catch {
    return [];
  }
}
