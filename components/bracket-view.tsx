"use client";

import { useState } from "react";
import { Flag } from "@/components/flag";
import { cn } from "@/lib/utils";
import type { Match } from "@/lib/data/matches";

// Issue d'un match terminé : qui a gagné (au score ou aux tirs au but).
// `decided` reste faux sur un nul sans vainqueur tranché → lignes neutres.
function outcomeFor(match: Match) {
  const r = match.result;
  const isDraw = r ? r.homeScore === r.awayScore : false;
  const homeWon = r ? (!isDraw ? r.homeScore > r.awayScore : r.penaltyWinner === "home") : false;
  const awayWon = r ? (!isDraw ? r.awayScore > r.homeScore : r.penaltyWinner === "away") : false;
  return { r, isDraw, homeWon, awayWon, decided: homeWon || awayWon };
}

// ══════════════════════════════════════════════════════════════════════════════
// VUE 1 — Onglets par tour (par défaut, lisible sur mobile)
// ══════════════════════════════════════════════════════════════════════════════

// Tours à élimination directe, dans l'ordre. Chaque tour = un sous-onglet,
// TOUJOURS affiché (« prévu ») même vide : ils se remplissent automatiquement
// via le sync au fur et à mesure des qualifications.
const ROUNDS = [
  { stage: "ROUND_OF_32", tab: "16es", title: "16èmes de finale" },
  { stage: "ROUND_OF_16", tab: "8es", title: "8èmes de finale" },
  { stage: "QUARTER", tab: "1/4", title: "Quarts de finale" },
  { stage: "SEMI", tab: "1/2", title: "Demi-finales" },
  { stage: "FINAL", tab: "Finale", title: "Finale" },
] as const;

function TeamRow({
  flag, team, score, outcome, penalty,
}: {
  flag: string;
  team: string;
  score?: number;
  outcome?: "win" | "lose";
  penalty?: boolean;
}) {
  const win = outcome === "win";
  const lose = outcome === "lose";
  return (
    <div
      className={cn(
        "flex items-center gap-2",
        win && "font-bold text-[#22c55e]",
        lose && "text-[var(--color-danger)] opacity-80",
      )}
    >
      <Flag
        code={flag}
        className={cn("h-3 w-[22px] shrink-0 rounded-[2px]", lose && "opacity-50 grayscale")}
      />
      <span className="flex-1 min-w-0 truncate text-[13px] leading-tight">{team}</span>
      {score !== undefined && (
        <span className="shrink-0 font-mono text-sm font-bold">
          {score}
          {penalty && <span className="align-top text-[10px] text-[var(--color-gold)]">p</span>}
        </span>
      )}
    </div>
  );
}

function MatchCard({ match }: { match: Match }) {
  const live = match.live;
  const { r, isDraw, homeWon, awayWon, decided } = outcomeFor(match);

  const homeScore = r?.homeScore ?? live?.homeScore;
  const awayScore = r?.awayScore ?? live?.awayScore;

  return (
    <div
      className={cn(
        "rounded-xl border p-2.5",
        r
          ? "border-[var(--color-border-subtle)] bg-[var(--color-surface)]"
          : "border-[var(--color-border-subtle)]/60 bg-[var(--color-surface-2)]",
      )}
    >
      <TeamRow
        flag={match.homeFlag}
        team={match.homeTeam}
        score={homeScore}
        outcome={decided ? (homeWon ? "win" : "lose") : undefined}
        penalty={!!(isDraw && r?.penaltyWinner === "home")}
      />
      <div className="my-1.5 border-t border-[var(--color-border-subtle)]/40" />
      <TeamRow
        flag={match.awayFlag}
        team={match.awayTeam}
        score={awayScore}
        outcome={decided ? (awayWon ? "win" : "lose") : undefined}
        penalty={!!(isDraw && r?.penaltyWinner === "away")}
      />
      <div className="mt-2 flex items-center justify-between text-[10px] leading-none text-[var(--color-muted)]">
        <span>
          {new Date(match.kickoffAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
        </span>
        {live && !r && (
          <span className="flex items-center gap-1 text-[var(--color-pitch-bright)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-pitch-bright)] animate-pulse" />
            en direct
          </span>
        )}
      </div>
    </div>
  );
}

function RoundTabsView({ matches }: { matches: Match[] }) {
  const byStage: Record<string, Match[]> = {};
  for (const m of matches) {
    (byStage[m.stage] ??= []).push(m);
  }
  for (const s of Object.keys(byStage)) {
    byStage[s]!.sort((a, b) => +new Date(a.kickoffAt) - +new Date(b.kickoffAt));
  }

  // Onglet par défaut : le tour le plus avancé qui a déjà des matchs.
  const advanced = [...ROUNDS].reverse().find((r) => byStage[r.stage]?.length) ?? ROUNDS[0];
  const [active, setActive] = useState<string>(advanced.stage);

  const activeRound = ROUNDS.find((r) => r.stage === active) ?? ROUNDS[0];
  const roundMatches = byStage[active] ?? [];
  const thirdPlace = active === "FINAL" ? byStage["THIRD_PLACE"] ?? [] : [];

  // Split bracket : 1re moitié à gauche, 2e moitié à droite.
  const half = Math.ceil(roundMatches.length / 2);
  const leftMatches = roundMatches.slice(0, half);
  const rightMatches = roundMatches.slice(half);

  return (
    <div>
      {/* ── Sous-onglets par tour ── */}
      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {ROUNDS.map(({ stage, tab }) => {
          const count = byStage[stage]?.length ?? 0;
          const isActive = active === stage;
          return (
            <button
              key={stage}
              onClick={() => setActive(stage)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 font-[family-name:var(--font-display)] text-xs font-semibold tracking-wide transition-colors duration-200",
                isActive
                  ? "bg-[var(--color-pitch)] text-white shadow-[0_0_12px_var(--color-pitch)]/25"
                  : count === 0
                    ? "bg-[var(--color-surface-2)] text-[var(--color-muted)]/40 hover:text-[var(--color-muted)]/70"
                    : "bg-[var(--color-surface-2)] text-[var(--color-muted)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-cream)]",
              )}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* ── Titre du tour ── */}
      <h3 className="mb-3 text-center font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-widest text-[var(--color-pitch-bright)]">
        {activeRound.title}
      </h3>

      {/* ── Contenu ── */}
      {roundMatches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-surface-2)]/40 p-8 text-center">
          <p className="text-sm text-[var(--color-muted)]">{activeRound.title} — à venir 🔒</p>
          <p className="mt-1 text-xs text-[var(--color-muted)]/70">
            Les équipes apparaîtront dès qu&apos;elles seront qualifiées.
          </p>
        </div>
      ) : active === "FINAL" ? (
        <div className="mx-auto max-w-xs space-y-4">
          {roundMatches.map((m) => (
            <div key={m.id}>
              <p className="mb-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-[var(--color-gold)]">
                🏆 Finale
              </p>
              <MatchCard match={m} />
            </div>
          ))}
          {thirdPlace.map((m) => (
            <div key={m.id}>
              <p className="mb-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">
                Petite finale
              </p>
              <MatchCard match={m} />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-3 sm:gap-4">
          <div className="flex-1 space-y-2.5">
            {leftMatches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
          <div className="flex-1 space-y-2.5">
            {rightMatches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VUE 2 — Tableau complet (bracket SVG arborescent, scroll horizontal sur mobile)
// ══════════════════════════════════════════════════════════════════════════════

const CARD_H = 68;
const CARD_W = 140;
const ROW_GAP = 8;
const UNIT = CARD_H + ROW_GAP; // 76px par slot
const CONN_W = 20; // largeur SVG des connecteurs entre colonnes

const BRACKET_ROUNDS = [
  { stage: "ROUND_OF_32", short: "16ÈMES", maxPerSide: 8 },
  { stage: "ROUND_OF_16", short: "8ÈMES", maxPerSide: 4 },
  { stage: "QUARTER", short: "QUARTS", maxPerSide: 2 },
  { stage: "SEMI", short: "DEMI-FINALES", maxPerSide: 1 },
] as const;

/** Top d'une carte dans le slot `slotIdx` du tour `roundIdx` (0 = le plus externe). */
function cardTop(slotIdx: number, roundIdx: number): number {
  const slotH = Math.pow(2, roundIdx) * UNIT;
  return slotIdx * slotH + (slotH - CARD_H) / 2;
}

function cardCenter(slotIdx: number, roundIdx: number): number {
  return cardTop(slotIdx, roundIdx) + CARD_H / 2;
}

function SvgTeamRow({
  flag, team, score, outcome, penalty,
}: {
  flag: string; team: string; score?: number; outcome?: "win" | "lose"; penalty?: boolean;
}) {
  const win = outcome === "win";
  const lose = outcome === "lose";
  return (
    <div
      className={cn(
        "flex items-center gap-1",
        win && "font-bold text-[#22c55e]",
        lose && "text-[var(--color-danger)] opacity-80",
      )}
    >
      <Flag code={flag} className={cn("h-2.5 w-[18px] shrink-0", lose && "opacity-50 grayscale")} />
      <span className="flex-1 min-w-0 truncate text-[10px] leading-none">{team}</span>
      {score !== undefined && (
        <span className="font-mono text-[11px] font-bold shrink-0">
          {score}
          {penalty && <span className="text-[var(--color-gold)] text-[8px]">p</span>}
        </span>
      )}
    </div>
  );
}

function SvgMatchCard({ match }: { match: Match | null }) {
  if (!match) {
    return (
      <div
        style={{ width: CARD_W, height: CARD_H }}
        className="rounded-lg border border-dashed border-white/10 bg-white/[0.015]"
      />
    );
  }
  const { r, isDraw, homeWon, awayWon, decided } = outcomeFor(match);

  return (
    <div
      style={{ width: CARD_W, height: CARD_H }}
      className={cn(
        "rounded-lg border p-1.5 flex flex-col justify-around overflow-hidden",
        r
          ? "border-[var(--color-border-subtle)] bg-[var(--color-surface)]"
          : "border-[var(--color-pitch)]/20 bg-[var(--color-surface-2)]",
      )}
    >
      <SvgTeamRow
        flag={match.homeFlag} team={match.homeTeam} score={r?.homeScore}
        outcome={decided ? (homeWon ? "win" : "lose") : undefined}
        penalty={!!(isDraw && r?.penaltyWinner === "home")}
      />
      <div className="border-t border-[var(--color-border-subtle)]/30 mx-0.5" />
      <SvgTeamRow
        flag={match.awayFlag} team={match.awayTeam} score={r?.awayScore}
        outcome={decided ? (awayWon ? "win" : "lose") : undefined}
        penalty={!!(isDraw && r?.penaltyWinner === "away")}
      />
      <div className="text-[8px] text-[var(--color-muted)] leading-none">
        {new Date(match.kickoffAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
      </div>
    </div>
  );
}

function Connector({
  pairs, prevRoundIdx, totalH, side,
}: {
  pairs: number;
  prevRoundIdx: number;
  totalH: number;
  side: "left" | "right";
}) {
  const midX = CONN_W / 2;
  const stroke = "rgba(255,255,255,0.15)";

  return (
    <svg width={CONN_W} height={totalH} className="shrink-0 self-start" style={{ marginTop: 20 }}>
      {Array.from({ length: pairs }).map((_, i) => {
        const topY = cardCenter(i * 2, prevRoundIdx);
        const botY = cardCenter(i * 2 + 1, prevRoundIdx);
        const midY = (topY + botY) / 2;

        if (side === "left") {
          return (
            <g key={i}>
              <line x1={0} y1={topY} x2={midX} y2={topY} stroke={stroke} strokeWidth={1} />
              <line x1={midX} y1={topY} x2={midX} y2={botY} stroke={stroke} strokeWidth={1} />
              <line x1={0} y1={botY} x2={midX} y2={botY} stroke={stroke} strokeWidth={1} />
              <line x1={midX} y1={midY} x2={CONN_W} y2={midY} stroke={stroke} strokeWidth={1} />
            </g>
          );
        } else {
          return (
            <g key={i}>
              <line x1={CONN_W} y1={topY} x2={midX} y2={topY} stroke={stroke} strokeWidth={1} />
              <line x1={midX} y1={topY} x2={midX} y2={botY} stroke={stroke} strokeWidth={1} />
              <line x1={CONN_W} y1={botY} x2={midX} y2={botY} stroke={stroke} strokeWidth={1} />
              <line x1={midX} y1={midY} x2={0} y2={midY} stroke={stroke} strokeWidth={1} />
            </g>
          );
        }
      })}
    </svg>
  );
}

function FinalConnector({ sfRoundIdx, side, totalH }: { sfRoundIdx: number; side: "left" | "right"; totalH: number }) {
  const y = cardCenter(0, sfRoundIdx);
  const stroke = "rgba(255,255,255,0.15)";
  return (
    <svg width={CONN_W} height={totalH} className="shrink-0 self-start" style={{ marginTop: 20 }}>
      <line
        x1={side === "left" ? 0 : CONN_W}
        y1={y}
        x2={side === "left" ? CONN_W : 0}
        y2={y}
        stroke={stroke}
        strokeWidth={1}
      />
    </svg>
  );
}

function HalfBracket({
  side,
  matchesByStage,
  activeRounds,
  totalH,
}: {
  side: "left" | "right";
  matchesByStage: Record<string, Match[]>;
  activeRounds: readonly { stage: string; short: string; maxPerSide: number }[];
  totalH: number;
}) {
  const cols = side === "left" ? activeRounds : [...activeRounds].reverse();

  return (
    <div className="flex items-start">
      {cols.map(({ stage, short, maxPerSide }, colIdx) => {
        const all = matchesByStage[stage] ?? [];

        const colMatches: (Match | null)[] =
          side === "left"
            ? all.slice(0, maxPerSide)
            : all.slice(maxPerSide);

        const roundIdx =
          side === "left" ? colIdx : activeRounds.length - 1 - colIdx;

        const prevRoundIdx =
          side === "left"
            ? roundIdx - 1
            : activeRounds.length - 2 - colIdx;

        const showLeftConn = side === "left" && colIdx > 0;
        const showRightConn = side === "right" && colIdx < cols.length - 1;

        return (
          <div key={stage + side} className="flex items-start">
            {showLeftConn && (
              <Connector
                pairs={maxPerSide}
                prevRoundIdx={prevRoundIdx}
                totalH={totalH}
                side="left"
              />
            )}

            <div className="flex flex-col">
              <div
                className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-muted)] text-center"
                style={{ width: CARD_W, height: 20 }}
              >
                {short}
              </div>
              <div className="relative" style={{ width: CARD_W, height: totalH }}>
                {Array.from({ length: maxPerSide }).map((_, slotIdx) => (
                  <div
                    key={slotIdx}
                    className="absolute"
                    style={{ top: cardTop(slotIdx, roundIdx), left: 0 }}
                  >
                    <SvgMatchCard match={colMatches[slotIdx] ?? null} />
                  </div>
                ))}
              </div>
            </div>

            {showRightConn && (
              <Connector
                pairs={maxPerSide}
                prevRoundIdx={prevRoundIdx}
                totalH={totalH}
                side="right"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function FullBracketView({ matches }: { matches: Match[] }) {
  const byStage: Record<string, Match[]> = {};
  for (const m of matches) {
    (byStage[m.stage] ??= []).push(m);
  }
  for (const s of Object.keys(byStage)) {
    byStage[s]!.sort((a, b) => +new Date(a.kickoffAt) - +new Date(b.kickoffAt));
  }

  const activeRounds = BRACKET_ROUNDS.filter((r) => byStage[r.stage]?.length);
  const finalMatch = byStage["FINAL"]?.[0] ?? null;
  const thirdMatch = byStage["THIRD_PLACE"]?.[0] ?? null;

  if (activeRounds.length === 0 && !finalMatch && !thirdMatch) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-surface-2)]/40 p-8 text-center">
        <p className="text-sm text-[var(--color-muted)]">
          Le tableau se construira dès les 16èmes de finale. 🔒
        </p>
      </div>
    );
  }

  const firstRound = activeRounds[0];
  const slotsPerSide = firstRound
    ? Math.ceil((byStage[firstRound.stage]?.length ?? 0) / 2)
    : 1;
  const totalH = Math.max(slotsPerSide, 1) * UNIT;

  const sfRoundIdx = activeRounds.length > 0 ? activeRounds.length - 1 : 0;

  const finalTop = activeRounds.length > 0 ? cardTop(0, sfRoundIdx) : (totalH - CARD_H) / 2;
  const thirdTop = finalTop + CARD_H + ROW_GAP * 4;

  const showBracket = activeRounds.length > 0;
  const showFinal = finalMatch || thirdMatch;

  return (
    <div>
      <p className="mb-2 text-center text-[10px] text-[var(--color-muted)]/70">
        ← faites défiler pour voir tout le tableau →
      </p>
      <div className="overflow-x-auto -mx-4 px-4 pb-4">
        <div className="inline-flex items-start gap-0">
          {showBracket && (
            <HalfBracket
              side="left"
              matchesByStage={byStage}
              activeRounds={activeRounds}
              totalH={totalH}
            />
          )}

          {showBracket && showFinal && (
            <FinalConnector sfRoundIdx={sfRoundIdx} side="left" totalH={totalH} />
          )}

          {showFinal && (
            <div className="flex flex-col">
              <div
                className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-muted)] text-center"
                style={{ width: CARD_W, height: 20 }}
              >
                FINALE
              </div>
              <div className="relative" style={{ width: CARD_W, height: totalH }}>
                {finalMatch && (
                  <div className="absolute" style={{ top: finalTop, left: 0 }}>
                    <SvgMatchCard match={finalMatch} />
                  </div>
                )}
                {thirdMatch && (
                  <div className="absolute" style={{ top: Math.min(thirdTop, totalH - CARD_H - 14), left: 0 }}>
                    <div className="text-[8px] text-[var(--color-muted)] text-center mb-1 leading-none">
                      3ème place
                    </div>
                    <SvgMatchCard match={thirdMatch} />
                  </div>
                )}
              </div>
            </div>
          )}

          {showBracket && showFinal && (
            <FinalConnector sfRoundIdx={sfRoundIdx} side="right" totalH={totalH} />
          )}

          {showBracket && (
            <HalfBracket
              side="right"
              matchesByStage={byStage}
              activeRounds={activeRounds}
              totalH={totalH}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Conteneur — bascule entre les deux vues
// ══════════════════════════════════════════════════════════════════════════════

export function BracketView({ matches }: { matches: Match[] }) {
  const [mode, setMode] = useState<"tabs" | "full">("tabs");

  if (matches.length === 0) return null;

  return (
    <div>
      {/* ── Bascule Par tour / Tableau ── */}
      <div className="mb-4 flex justify-center">
        <div className="inline-flex rounded-full bg-[var(--color-surface-2)] p-0.5">
          {([
            ["tabs", "Par tour"],
            ["full", "Tableau"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={cn(
                "rounded-full px-4 py-1 text-xs font-semibold transition-colors duration-200",
                mode === key
                  ? "bg-[var(--color-pitch)] text-white"
                  : "text-[var(--color-muted)] hover:text-[var(--color-cream)]",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === "tabs" ? (
        <RoundTabsView matches={matches} />
      ) : (
        <FullBracketView matches={matches} />
      )}
    </div>
  );
}
