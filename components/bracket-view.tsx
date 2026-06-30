"use client";

import { useState } from "react";
import { Flag } from "@/components/flag";
import { cn } from "@/lib/utils";
import type { Match } from "@/lib/data/matches";

// ══════════════════════════════════════════════════════════════════════════════
// Tableau officiel WC2026 (codé en dur)
// ══════════════════════════════════════════════════════════════════════════════
//
// Les 16 matchs de 16es DANS L'ORDRE DU TABLEAU (pas l'ordre des dates ni des
// externalId, qui ne suivent pas le bracket). Chaque PAIRE consécutive nourrit
// un match du tour suivant : (0,1)→8e n°1, (2,3)→8e n°2, … Ordre repris du
// tableau officiel football-data. Mapping par identité d'équipe (noms FR base).
const R32_ORDER: readonly (readonly [string, string])[] = [
  ["Afrique du Sud", "Canada"],
  ["Pays-Bas", "Maroc"],
  ["Allemagne", "Paraguay"],
  ["France", "Suède"],
  ["Belgique", "Sénégal"],
  ["États-Unis", "Bosnie-Herzégovine"],
  ["Espagne", "Autriche"],
  ["Portugal", "Croatie"],
  ["Brésil", "Japon"],
  ["Côte d'Ivoire", "Norvège"],
  ["Mexique", "Équateur"],
  ["Angleterre", "Congo RD"],
  ["Suisse", "Algérie"],
  ["Colombie", "Ghana"],
  ["Australie", "Égypte"],
  ["Argentine", "Cap-Vert"],
];

type Team = { name: string; flag: string };

// Un côté d'un match :
//  - team  : équipe qualifiée (connue)
//  - cands : match nourricier pas encore joué → les 2 adversaires POSSIBLES
//  - tbd   : indéterminé (plus haut dans l'arbre)
type Side =
  | { kind: "team"; team: Team }
  | { kind: "cands"; teams: Team[] }
  | { kind: "tbd" };

type Slot = {
  id: string;
  stage: Match["stage"];
  home: Side;
  away: Side;
  result?: Match["result"];
  live?: Match["live"];
  kickoffAt: string;
};

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function sideTeam(s: Side): Team | null {
  return s.kind === "team" ? s.team : null;
}

function slotWinner(slot: Slot): Team | null {
  const r = slot.result;
  const h = sideTeam(slot.home);
  const a = sideTeam(slot.away);
  if (!r || !h || !a) return null;
  const draw = r.homeScore === r.awayScore;
  if (draw && !r.penaltyWinner) return null;
  const homeWon = draw ? r.penaltyWinner === "home" : r.homeScore > r.awayScore;
  return homeWon ? h : a;
}

function slotLoser(slot: Slot): Team | null {
  const w = slotWinner(slot);
  const h = sideTeam(slot.home);
  const a = sideTeam(slot.away);
  if (!w || !h || !a) return null;
  return w.name === h.name ? a : h;
}

/** Côté nourrissant le tour suivant : le vainqueur si connu, sinon les 2
 *  candidats (si le match nourricier oppose 2 équipes connues), sinon tbd. */
function feederSide(slot: Slot): Side {
  const w = slotWinner(slot);
  if (w) return { kind: "team", team: w };
  const h = sideTeam(slot.home);
  const a = sideTeam(slot.away);
  if (h && a) return { kind: "cands", teams: [h, a] };
  return { kind: "tbd" };
}

/** Idem pour la petite finale (perdants des demies). */
function loserFeederSide(slot: Slot): Side {
  const l = slotLoser(slot);
  if (l) return { kind: "team", team: l };
  const h = sideTeam(slot.home);
  const a = sideTeam(slot.away);
  if (h && a) return { kind: "cands", teams: [h, a] };
  return { kind: "tbd" };
}

/**
 * Construit le tableau complet : les 16es viennent de la base (ordre officiel),
 * les tours suivants sont projetés depuis les vainqueurs. Tant qu'un match
 * nourricier n'est pas joué, on affiche ses 2 équipes comme adversaires
 * possibles. Dès que l'affiche officielle existe en base, on superpose le score.
 */
function buildKnockout(matches: Match[]): Record<string, Slot[]> {
  const byStage: Record<string, Match[]> = {};
  for (const m of matches) (byStage[m.stage] ??= []).push(m);

  const pairIndex = (stage: string) => {
    const map = new Map<string, Match>();
    for (const m of byStage[stage] ?? []) map.set(pairKey(m.homeTeam, m.awayTeam), m);
    return map;
  };

  // 16es — ordre officiel
  const r32map = pairIndex("ROUND_OF_32");
  const r32: Slot[] = R32_ORDER.map(([a, b], i) => {
    const real = r32map.get(pairKey(a, b));
    if (real) {
      return {
        id: real.id,
        stage: "ROUND_OF_32",
        home: { kind: "team", team: { name: real.homeTeam, flag: real.homeFlag } },
        away: { kind: "team", team: { name: real.awayTeam, flag: real.awayFlag } },
        result: real.result,
        live: real.live,
        kickoffAt: real.kickoffAt,
      };
    }
    return {
      id: `slot-R32-${i}`,
      stage: "ROUND_OF_32",
      home: { kind: "team", team: { name: a, flag: "" } },
      away: { kind: "team", team: { name: b, flag: "" } },
      kickoffAt: "",
    };
  });

  const nextRound = (prev: Slot[], stage: Match["stage"]): Slot[] => {
    const map = pairIndex(stage);
    const out: Slot[] = [];
    for (let i = 0; i + 1 < prev.length; i += 2) {
      const pa = prev[i];
      const pb = prev[i + 1];
      if (!pa || !pb) continue;
      const home = feederSide(pa);
      const away = feederSide(pb);
      const ht = sideTeam(home);
      const at = sideTeam(away);
      const real = ht && at ? map.get(pairKey(ht.name, at.name)) : undefined;
      out.push({
        id: real?.id ?? `slot-${stage}-${i / 2}`,
        stage,
        home,
        away,
        result: real?.result,
        live: real?.live,
        kickoffAt: real?.kickoffAt ?? "",
      });
    }
    return out;
  };

  const r16 = nextRound(r32, "ROUND_OF_16");
  const qf = nextRound(r16, "QUARTER");
  const sf = nextRound(qf, "SEMI");
  const final = nextRound(sf, "FINAL");

  // Petite finale : perdants des demi-finales.
  const thirdMap = pairIndex("THIRD_PLACE");
  const th: Side = sf[0] ? loserFeederSide(sf[0]) : { kind: "tbd" };
  const ta: Side = sf[1] ? loserFeederSide(sf[1]) : { kind: "tbd" };
  const tht = sideTeam(th);
  const tat = sideTeam(ta);
  const tReal = tht && tat ? thirdMap.get(pairKey(tht.name, tat.name)) : undefined;
  const third: Slot[] = [
    {
      id: tReal?.id ?? "slot-3RD",
      stage: "THIRD_PLACE",
      home: th,
      away: ta,
      result: tReal?.result,
      live: tReal?.live,
      kickoffAt: tReal?.kickoffAt ?? "",
    },
  ];

  return {
    ROUND_OF_32: r32,
    ROUND_OF_16: r16,
    QUARTER: qf,
    SEMI: sf,
    FINAL: final,
    THIRD_PLACE: third,
  };
}

function hasContent(slots: Slot[] | undefined): boolean {
  return !!slots?.some((s) => s.home.kind !== "tbd" || s.away.kind !== "tbd");
}

function fmtDay(iso: string): string | null {
  if (!iso || Number.isNaN(Date.parse(iso))) return null;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/** Décompose un slot pour l'affichage (scores + qui gagne/perd). */
function slotView(slot: Slot) {
  const r = slot.result;
  const live = slot.live;
  const hTeam = sideTeam(slot.home);
  const aTeam = sideTeam(slot.away);
  const isDraw = r ? r.homeScore === r.awayScore : false;
  const homeWon = !!(r && hTeam && (!isDraw ? r.homeScore > r.awayScore : r.penaltyWinner === "home"));
  const awayWon = !!(r && aTeam && (!isDraw ? r.awayScore > r.homeScore : r.penaltyWinner === "away"));
  const decided = homeWon || awayWon;
  return {
    r, live, hTeam, aTeam, isDraw,
    homeScore: r?.homeScore ?? live?.homeScore,
    awayScore: r?.awayScore ?? live?.awayScore,
    homeWin: decided && homeWon,
    homeLose: decided && !!hTeam && !homeWon,
    awayWin: decided && awayWon,
    awayLose: decided && !!aTeam && !awayWon,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// VUE 1 — Onglets par tour (une colonne, par défaut)
// ══════════════════════════════════════════════════════════════════════════════

const ROUNDS = [
  { stage: "ROUND_OF_32", tab: "16es", title: "16èmes de finale" },
  { stage: "ROUND_OF_16", tab: "8es", title: "8èmes de finale" },
  { stage: "QUARTER", tab: "1/4", title: "Quarts de finale" },
  { stage: "SEMI", tab: "1/2", title: "Demi-finales" },
  { stage: "FINAL", tab: "Finale", title: "Finale" },
] as const;

function SideRow({
  side, score, win, lose, penalty,
}: {
  side: Side; score?: number; win?: boolean; lose?: boolean; penalty?: boolean;
}) {
  if (side.kind === "tbd") {
    return (
      <div className="flex h-5 items-center gap-2 italic text-[var(--color-muted)]/45">
        <span className="h-3 w-[22px] shrink-0 rounded-[2px] bg-[var(--color-surface-3)]" />
        <span className="text-[13px]">À définir</span>
      </div>
    );
  }
  if (side.kind === "cands") {
    // Les 2 adversaires possibles, grisés.
    return (
      <div className="flex h-5 items-center gap-1.5 overflow-hidden text-[var(--color-muted)]/60">
        {side.teams.map((t, i) => (
          <span key={i} className="flex min-w-0 items-center gap-1">
            {i > 0 && <span className="shrink-0 opacity-40">·</span>}
            <Flag code={t.flag} className="h-3 w-[18px] shrink-0 rounded-[2px] opacity-70 grayscale" />
            <span className="truncate text-[11px] italic">{t.name}</span>
          </span>
        ))}
      </div>
    );
  }
  const t = side.team;
  return (
    <div
      className={cn(
        "flex h-5 items-center gap-2",
        win && "font-bold text-[#22c55e]",
        lose && "text-[var(--color-danger)] opacity-80",
      )}
    >
      <Flag
        code={t.flag}
        className={cn("h-3 w-[22px] shrink-0 rounded-[2px]", lose && "opacity-50 grayscale")}
      />
      <span className="flex-1 min-w-0 truncate text-[13px] leading-tight">{t.name}</span>
      {score !== undefined && (
        <span className="shrink-0 font-mono text-sm font-bold leading-none">
          {score}
          {penalty && <span className="align-top text-[10px] text-[var(--color-gold)]">p</span>}
        </span>
      )}
    </div>
  );
}

function MatchCard({ slot }: { slot: Slot }) {
  const v = slotView(slot);
  const day = fmtDay(slot.kickoffAt);

  return (
    <div
      className={cn(
        "flex h-[88px] flex-col rounded-xl border p-2.5",
        v.r
          ? "border-[var(--color-border-subtle)] bg-[var(--color-surface)]"
          : "border-[var(--color-border-subtle)]/60 bg-[var(--color-surface-2)]",
      )}
    >
      <SideRow
        side={slot.home}
        score={v.hTeam ? v.homeScore : undefined}
        win={v.homeWin}
        lose={v.homeLose}
        penalty={!!(v.isDraw && v.r?.penaltyWinner === "home")}
      />
      <div className="my-1.5 border-t border-[var(--color-border-subtle)]/40" />
      <SideRow
        side={slot.away}
        score={v.aTeam ? v.awayScore : undefined}
        win={v.awayWin}
        lose={v.awayLose}
        penalty={!!(v.isDraw && v.r?.penaltyWinner === "away")}
      />
      <div className="mt-auto flex items-center justify-between text-[10px] leading-none text-[var(--color-muted)]">
        <span>{day ?? " "}</span>
        {v.live && !v.r && (
          <span className="flex items-center gap-1 text-[var(--color-pitch-bright)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-pitch-bright)] animate-pulse" />
            en direct
          </span>
        )}
      </div>
    </div>
  );
}

function RoundTabsView({ ko }: { ko: Record<string, Slot[]> }) {
  const advanced = [...ROUNDS].reverse().find((r) => hasContent(ko[r.stage])) ?? ROUNDS[0];
  const [active, setActive] = useState<string>(advanced.stage);

  const activeRound = ROUNDS.find((r) => r.stage === active) ?? ROUNDS[0];
  const roundMatches = ko[active] ?? [];
  const thirdPlace = active === "FINAL" ? ko["THIRD_PLACE"] ?? [] : [];

  return (
    <div>
      {/* ── Sous-onglets ── */}
      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {ROUNDS.map(({ stage, tab }) => {
          const isActive = active === stage;
          const ready = hasContent(ko[stage]);
          return (
            <button
              key={stage}
              onClick={() => setActive(stage)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 font-[family-name:var(--font-display)] text-xs font-semibold tracking-wide transition-colors duration-200",
                isActive
                  ? "bg-[var(--color-pitch)] text-white shadow-[0_0_12px_var(--color-pitch)]/25"
                  : ready
                    ? "bg-[var(--color-surface-2)] text-[var(--color-muted)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-cream)]"
                    : "bg-[var(--color-surface-2)] text-[var(--color-muted)]/40 hover:text-[var(--color-muted)]/70",
              )}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* ── Titre ── */}
      <h3 className="mb-3 text-center font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-widest text-[var(--color-pitch-bright)]">
        {activeRound.title}
      </h3>

      {/* ── Contenu (une seule colonne) ── */}
      {active === "FINAL" ? (
        <div className="mx-auto max-w-sm space-y-4">
          {roundMatches.map((s) => (
            <div key={s.id}>
              <p className="mb-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-[var(--color-gold)]">
                🏆 Finale
              </p>
              <MatchCard slot={s} />
            </div>
          ))}
          {thirdPlace.map((s) => (
            <div key={s.id}>
              <p className="mb-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">
                Petite finale
              </p>
              <MatchCard slot={s} />
            </div>
          ))}
        </div>
      ) : (
        <div className="mx-auto max-w-sm space-y-2.5">
          {roundMatches.map((s) => (
            <MatchCard key={s.id} slot={s} />
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VUE 2 — Tableau complet (bracket SVG arborescent)
// ══════════════════════════════════════════════════════════════════════════════

const CARD_H = 68;
const CARD_W = 140;
const ROW_GAP = 8;
const UNIT = CARD_H + ROW_GAP;
const CONN_W = 20;

const BRACKET_ROUNDS = [
  { stage: "ROUND_OF_32", short: "16ÈMES", maxPerSide: 8 },
  { stage: "ROUND_OF_16", short: "8ÈMES", maxPerSide: 4 },
  { stage: "QUARTER", short: "QUARTS", maxPerSide: 2 },
  { stage: "SEMI", short: "DEMI-FINALES", maxPerSide: 1 },
] as const;

function cardTop(slotIdx: number, roundIdx: number): number {
  const slotH = Math.pow(2, roundIdx) * UNIT;
  return slotIdx * slotH + (slotH - CARD_H) / 2;
}
function cardCenter(slotIdx: number, roundIdx: number): number {
  return cardTop(slotIdx, roundIdx) + CARD_H / 2;
}

function SvgSideRow({
  side, score, win, lose, penalty,
}: {
  side: Side; score?: number; win?: boolean; lose?: boolean; penalty?: boolean;
}) {
  if (side.kind === "tbd") {
    return (
      <div className="flex items-center gap-1 italic text-[var(--color-muted)]/45">
        <Flag code="" className="h-2.5 w-[18px] shrink-0" />
        <span className="flex-1 min-w-0 truncate text-[10px] leading-none">À définir</span>
      </div>
    );
  }
  if (side.kind === "cands") {
    return (
      <div className="flex items-center gap-1 italic text-[var(--color-muted)]/55">
        <Flag code="" className="h-2.5 w-[18px] shrink-0" />
        <span className="flex-1 min-w-0 truncate text-[9px] leading-none">
          {side.teams.map((t) => t.name).join(" / ")}
        </span>
      </div>
    );
  }
  const t = side.team;
  return (
    <div
      className={cn(
        "flex items-center gap-1",
        win && "font-bold text-[#22c55e]",
        lose && "text-[var(--color-danger)] opacity-80",
      )}
    >
      <Flag code={t.flag} className={cn("h-2.5 w-[18px] shrink-0", lose && "opacity-50 grayscale")} />
      <span className="flex-1 min-w-0 truncate text-[10px] leading-none">{t.name}</span>
      {score !== undefined && (
        <span className="font-mono text-[11px] font-bold shrink-0">
          {score}
          {penalty && <span className="text-[var(--color-gold)] text-[8px]">p</span>}
        </span>
      )}
    </div>
  );
}

function SvgMatchCard({ slot }: { slot: Slot | null }) {
  if (!slot) {
    return (
      <div
        style={{ width: CARD_W, height: CARD_H }}
        className="rounded-lg border border-dashed border-white/10 bg-white/[0.015]"
      />
    );
  }
  const v = slotView(slot);
  const day = fmtDay(slot.kickoffAt);

  return (
    <div
      style={{ width: CARD_W, height: CARD_H }}
      className={cn(
        "rounded-lg border p-1.5 flex flex-col justify-around overflow-hidden",
        v.r
          ? "border-[var(--color-border-subtle)] bg-[var(--color-surface)]"
          : "border-[var(--color-pitch)]/20 bg-[var(--color-surface-2)]",
      )}
    >
      <SvgSideRow
        side={slot.home} score={v.hTeam ? v.homeScore : undefined}
        win={v.homeWin} lose={v.homeLose}
        penalty={!!(v.isDraw && v.r?.penaltyWinner === "home")}
      />
      <div className="border-t border-[var(--color-border-subtle)]/30 mx-0.5" />
      <SvgSideRow
        side={slot.away} score={v.aTeam ? v.awayScore : undefined}
        win={v.awayWin} lose={v.awayLose}
        penalty={!!(v.isDraw && v.r?.penaltyWinner === "away")}
      />
      <div className="text-[8px] text-[var(--color-muted)] leading-none">{day ?? " "}</div>
    </div>
  );
}

function Connector({
  pairs, prevRoundIdx, totalH, side,
}: {
  pairs: number; prevRoundIdx: number; totalH: number; side: "left" | "right";
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
        }
        return (
          <g key={i}>
            <line x1={CONN_W} y1={topY} x2={midX} y2={topY} stroke={stroke} strokeWidth={1} />
            <line x1={midX} y1={topY} x2={midX} y2={botY} stroke={stroke} strokeWidth={1} />
            <line x1={CONN_W} y1={botY} x2={midX} y2={botY} stroke={stroke} strokeWidth={1} />
            <line x1={midX} y1={midY} x2={0} y2={midY} stroke={stroke} strokeWidth={1} />
          </g>
        );
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
  side, slotsByStage, activeRounds, totalH,
}: {
  side: "left" | "right";
  slotsByStage: Record<string, Slot[]>;
  activeRounds: readonly { stage: string; short: string; maxPerSide: number }[];
  totalH: number;
}) {
  const cols = side === "left" ? activeRounds : [...activeRounds].reverse();
  return (
    <div className="flex items-start">
      {cols.map(({ stage, short, maxPerSide }, colIdx) => {
        const all = slotsByStage[stage] ?? [];
        const colSlots: (Slot | null)[] =
          side === "left" ? all.slice(0, maxPerSide) : all.slice(maxPerSide);
        const roundIdx = side === "left" ? colIdx : activeRounds.length - 1 - colIdx;
        const prevRoundIdx = side === "left" ? roundIdx - 1 : activeRounds.length - 2 - colIdx;
        const showLeftConn = side === "left" && colIdx > 0;
        const showRightConn = side === "right" && colIdx < cols.length - 1;

        return (
          <div key={stage + side} className="flex items-start">
            {showLeftConn && (
              <Connector pairs={maxPerSide} prevRoundIdx={prevRoundIdx} totalH={totalH} side="left" />
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
                    <SvgMatchCard slot={colSlots[slotIdx] ?? null} />
                  </div>
                ))}
              </div>
            </div>
            {showRightConn && (
              <Connector pairs={maxPerSide} prevRoundIdx={prevRoundIdx} totalH={totalH} side="right" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function FullBracketView({ ko }: { ko: Record<string, Slot[]> }) {
  const activeRounds = BRACKET_ROUNDS.filter((r) => ko[r.stage]?.length);
  const finalMatch = ko["FINAL"]?.[0] ?? null;
  const thirdMatch = ko["THIRD_PLACE"]?.[0] ?? null;

  const firstRound = activeRounds[0];
  const slotsPerSide = firstRound ? Math.ceil((ko[firstRound.stage]?.length ?? 0) / 2) : 1;
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
            <HalfBracket side="left" slotsByStage={ko} activeRounds={activeRounds} totalH={totalH} />
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
                    <SvgMatchCard slot={finalMatch} />
                  </div>
                )}
                {thirdMatch && (
                  <div className="absolute" style={{ top: Math.min(thirdTop, totalH - CARD_H - 14), left: 0 }}>
                    <div className="text-[8px] text-[var(--color-muted)] text-center mb-1 leading-none">
                      3ème place
                    </div>
                    <SvgMatchCard slot={thirdMatch} />
                  </div>
                )}
              </div>
            </div>
          )}
          {showBracket && showFinal && (
            <FinalConnector sfRoundIdx={sfRoundIdx} side="right" totalH={totalH} />
          )}
          {showBracket && (
            <HalfBracket side="right" slotsByStage={ko} activeRounds={activeRounds} totalH={totalH} />
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

  const ko = buildKnockout(matches);

  return (
    <div>
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

      {mode === "tabs" ? <RoundTabsView ko={ko} /> : <FullBracketView ko={ko} />}
    </div>
  );
}
