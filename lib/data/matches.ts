// ─────────────────────────────────────────────
// Types partagés du domaine DaronsFC.
//
// ⚠️ Ce fichier ne contient AUCUNE donnée : la source de vérité est la base
// (Prisma), alimentée par API-Football. Les getters serveur vivent dans
// `lib/data/queries.ts`.
// ─────────────────────────────────────────────

export type Stage =
  | "GROUP"
  | "ROUND_OF_32"
  | "ROUND_OF_16"
  | "QUARTER"
  | "SEMI"
  | "THIRD_PLACE"
  | "FINAL";

/** Libellés FR des phases du tournoi. */
export const STAGE_LABELS: Record<Stage, string> = {
  GROUP: "Phase de poules",
  ROUND_OF_32: "16ᵉˢ de finale",
  ROUND_OF_16: "8ᵉˢ de finale",
  QUARTER: "Quart de finale",
  SEMI: "Demi-finale",
  THIRD_PLACE: "Petite finale",
  FINAL: "Finale",
};

/** Match tel que consommé par l'UI (kickoff sérialisé en ISO string). */
export type Match = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  kickoffAt: string;
  stage: Stage;
  group: string | null;
  matchday: number | null;
  result?: { homeScore: number; awayScore: number; status: "FINISHED" };
};

/** Ligne de classement d'un groupe. */
export type StandingTeam = {
  team: string;
  flag: string;
  j: number;
  g: number;
  n: number;
  p: number;
  bp: number;
  bc: number;
  pts: number;
};

/** Entrée du classement général des joueurs. */
export type LeaderboardEntry = {
  rank: number;
  name: string;
  email: string;
  points: number;
  exactScores: number;
  correctResults: number;
  badges: string[];
};

/** Statistiques agrégées d'un joueur (page profil). */
export type UserStats = {
  points: number;
  exactScores: number;
  correctResults: number;
  jokersUsed: number;
  badges: string[];
};

/** Définition d'un badge (catalogue applicatif). */
export type BadgeDef = {
  key: string;
  label: string;
  emoji: string;
  description: string;
};

/** Pronostic d'un joueur, enrichi du match associé. */
export type UserPrediction = {
  matchId: string;
  homeScore: number;
  awayScore: number;
  joker: boolean;
  comment?: string;
  match: Match;
};

/** Message du tchat. */
export type ChatMessage = {
  id: string;
  user: string;
  text: string;
  pinned: boolean;
  timestamp: string;
  reactions: { emoji: string; count: number; reacted: boolean }[];
};
