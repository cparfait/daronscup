"use client";

import { Flag } from "@/components/flag";
import { cn } from "@/lib/utils";
import type { Match } from "@/lib/data/matches";

const CARD_H = 68;
const CARD_W = 140;
const ROW_GAP = 8;
const UNIT = CARD_H + ROW_GAP; // 76px per slot
const CONN_W = 20; // connector SVG width between columns

const BRACKET_ROUNDS = [
  { stage: "ROUND_OF_32", short: "32ÈMES", maxPerSide: 8 },
  { stage: "ROUND_OF_16", short: "8ÈMES", maxPerSide: 4 },
  { stage: "QUARTER", short: "QUARTS", maxPerSide: 2 },
  { stage: "SEMI", short: "DEMI-FINALES", maxPerSide: 1 },
] as const;

/** Top position of a card in slot `slotIdx` for round `roundIdx` (0=outermost). */
function cardTop(slotIdx: number, roundIdx: number): number {
  const slotH = Math.pow(2, roundIdx) * UNIT;
  return slotIdx * slotH + (slotH - CARD_H) / 2;
}

function cardCenter(slotIdx: number, roundIdx: number): number {
  return cardTop(slotIdx, roundIdx) + CARD_H / 2;
}

// ─── Match card ──────────────────────────────────────────────────────────────

function TeamRow({
  flag, team, score, winner, penalty,
}: {
  flag: string; team: string; score?: number; winner: boolean; penalty?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-1", winner && "font-bold text-[var(--color-cream)]")}>
      <Flag code={flag} className="h-2.5 w-[18px] shrink-0" />
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

function MatchCard({ match }: { match: Match | null }) {
  if (!match) {
    return (
      <div
        style={{ width: CARD_W, height: CARD_H }}
        className="rounded-lg border border-dashed border-white/10 bg-white/[0.015]"
      />
    );
  }
  const r = match.result;
  const isDraw = r && r.homeScore === r.awayScore;
  const homeWon = r && (!isDraw ? r.homeScore > r.awayScore : r.penaltyWinner === "home");
  const awayWon = r && (!isDraw ? r.awayScore > r.homeScore : r.penaltyWinner === "away");

  return (
    <div
      style={{ width: CARD_W, height: CARD_H }}
      className={cn(
        "rounded-lg border p-1.5 flex flex-col justify-around overflow-hidden",
        r
          ? "border-[var(--color-border-subtle)] bg-[var(--color-surface)]"
          : "border-[var(--color-pitch)]/20 bg-[var(--color-surface-2)]"
      )}
    >
      <TeamRow
        flag={match.homeFlag} team={match.homeTeam} score={r?.homeScore}
        winner={!!homeWon} penalty={!!(isDraw && r?.penaltyWinner === "home")}
      />
      <div className="border-t border-[var(--color-border-subtle)]/30 mx-0.5" />
      <TeamRow
        flag={match.awayFlag} team={match.awayTeam} score={r?.awayScore}
        winner={!!awayWon} penalty={!!(isDraw && r?.penaltyWinner === "away")}
      />
      <div className="text-[8px] text-[var(--color-muted)] leading-none">
        {new Date(match.kickoffAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
      </div>
    </div>
  );
}

// ─── Bracket connector SVG ───────────────────────────────────────────────────
//
// Draws "pairs" bracket shapes.
// For each pair i:
//   prevRoundIdx = the round with 2× matches (outer round)
//   currRoundIdx = the round with 1× match (inner round)
//   topY / botY  = centers of the two "prev" matches
//   midY         = center between them = center of the "curr" match (by math)
//
// side="left"  : lines go  ← → on the left edge, → on the right edge
// side="right" : lines go  → ← on the right edge, ← on the left edge

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
          // Left edge is the outer (prev) side, right edge is the inner (curr) side
          return (
            <g key={i}>
              <line x1={0} y1={topY} x2={midX} y2={topY} stroke={stroke} strokeWidth={1} />
              <line x1={midX} y1={topY} x2={midX} y2={botY} stroke={stroke} strokeWidth={1} />
              <line x1={0} y1={botY} x2={midX} y2={botY} stroke={stroke} strokeWidth={1} />
              <line x1={midX} y1={midY} x2={CONN_W} y2={midY} stroke={stroke} strokeWidth={1} />
            </g>
          );
        } else {
          // Right edge is the outer (prev) side, left edge is the inner (curr) side
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

// ─── Half bracket ────────────────────────────────────────────────────────────

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
  // Left: [R32, R16, QF, SF] (outer → inner, left → right)
  // Right: [SF, QF, R16, R32] (inner → outer, left → right)
  const cols = side === "left" ? activeRounds : [...activeRounds].reverse();

  return (
    <div className="flex items-start">
      {cols.map(({ stage, short, maxPerSide }, colIdx) => {
        const all = matchesByStage[stage] ?? [];

        // Left side uses the first half of matches; right side uses the second half.
        const colMatches: (Match | null)[] =
          side === "left"
            ? all.slice(0, maxPerSide)
            : all.slice(maxPerSide);

        // roundIdx: 0 = outermost (R32 or R32-equivalent)
        // Left: colIdx 0 = R32 (roundIdx 0), colIdx 3 = SF (roundIdx 3)
        // Right: colIdx 0 = SF (roundIdx 3), colIdx 3 = R32 (roundIdx 0)
        const roundIdx =
          side === "left" ? colIdx : activeRounds.length - 1 - colIdx;

        // prevRoundIdx is the OUTER (more numerous) round for this connector.
        // Left: prev = left column (colIdx-1) = roundIdx-1
        // Right: prev = right column (colIdx+1) = activeRounds.length-2-colIdx
        const prevRoundIdx =
          side === "left"
            ? roundIdx - 1
            : activeRounds.length - 2 - colIdx;

        // Left bracket: connector is rendered BEFORE the column (left of it)
        // Right bracket: connector is rendered AFTER the column (right of it)
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
                    <MatchCard match={colMatches[slotIdx] ?? null} />
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

// ─── Main export ─────────────────────────────────────────────────────────────

export function BracketView({ matches }: { matches: Match[] }) {
  if (matches.length === 0) return null;

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

  if (activeRounds.length === 0 && !finalMatch && !thirdMatch) return null;

  // Total height: slots-per-side × UNIT, based on the outermost active round.
  const firstRound = activeRounds[0];
  const slotsPerSide = firstRound
    ? Math.ceil((byStage[firstRound.stage]?.length ?? 0) / 2)
    : 1;
  const totalH = Math.max(slotsPerSide, 1) * UNIT;

  // The innermost bracket round index (SF = activeRounds.length-1 if SF exists,
  // else the last element). Used to align Final card with the SF match center.
  const sfRoundIdx = activeRounds.length > 0 ? activeRounds.length - 1 : 0;

  // Final card top: aligned with the SF match vertical center.
  const finalTop = activeRounds.length > 0 ? cardTop(0, sfRoundIdx) : (totalH - CARD_H) / 2;
  const thirdTop = finalTop + CARD_H + ROW_GAP * 4;

  const showBracket = activeRounds.length > 0;
  const showFinal = finalMatch || thirdMatch;

  return (
    <div className="overflow-x-auto -mx-4 px-4 pb-4">
      <div className="inline-flex items-start gap-0">

        {/* ── Left half ── */}
        {showBracket && (
          <HalfBracket
            side="left"
            matchesByStage={byStage}
            activeRounds={activeRounds}
            totalH={totalH}
          />
        )}

        {/* ── Connector: left SF → Final ── */}
        {showBracket && showFinal && (
          <FinalConnector sfRoundIdx={sfRoundIdx} side="left" totalH={totalH} />
        )}

        {/* ── Center column: Final + 3rd place ── */}
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
                  <MatchCard match={finalMatch} />
                </div>
              )}
              {thirdMatch && (
                <div className="absolute" style={{ top: Math.min(thirdTop, totalH - CARD_H - 14), left: 0 }}>
                  <div className="text-[8px] text-[var(--color-muted)] text-center mb-1 leading-none">
                    3ème place
                  </div>
                  <MatchCard match={thirdMatch} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Connector: Final → right SF ── */}
        {showBracket && showFinal && (
          <FinalConnector sfRoundIdx={sfRoundIdx} side="right" totalH={totalH} />
        )}

        {/* ── Right half ── */}
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
  );
}
