// ─────────────────────────────────────────────
// Couche d'accès aux données — console admin (serveur uniquement).
// ─────────────────────────────────────────────

import { prisma } from "@/lib/prisma";

export type AdminStats = {
  users: number;
  predictions: number;
  messages: number;
  finishedMatches: number;
  totalMatches: number;
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
    predictions: 0,
    messages: 0,
    finishedMatches: 0,
    totalMatches: 0,
  };
  try {
    const [users, predictions, messages, finishedMatches, totalMatches] =
      await Promise.all([
        prisma.user.count(),
        prisma.prediction.count(),
        prisma.message.count(),
        prisma.result.count({ where: { status: "FINISHED" } }),
        prisma.match.count(),
      ]);
    return { users, predictions, messages, finishedMatches, totalMatches };
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

/** Matchs non encore terminés (pour la saisie manuelle d'un score). */
export async function getUnfinishedMatches(): Promise<
  { id: string; homeTeam: string; awayTeam: string; kickoffAt: string }[]
> {
  try {
    const matches = await prisma.match.findMany({
      where: { result: { is: null } },
      orderBy: { kickoffAt: "asc" },
      select: { id: true, homeTeam: true, awayTeam: true, kickoffAt: true },
    });
    return matches.map((m) => ({
      id: m.id,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      kickoffAt: m.kickoffAt.toISOString(),
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
