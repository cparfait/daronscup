// ─────────────────────────────────────────────
// Thèmes « jour de match » par club.
//
// Pendant de `theme-france` (Coupe du Monde), transposé aux compétitions de
// clubs : les jours où le CLUB DE CŒUR d'un joueur joue, son app passe aux
// couleurs de ce club. C'est donc personnel — un supporter du PSG et un
// supporter de l'OM ne voient pas la même chose le même soir.
//
// Chaque club ne définit que TROIS couleurs ; les surfaces, bordures et
// dégradés en sont dérivés en CSS via `color-mix()` (cf. `.theme-club` dans
// app/globals.css). Ajouter un club = ajouter une ligne ici, aucun CSS à
// écrire.
//
// ⚠️ Les clés doivent être EXACTEMENT celles que renvoie `clubKey` — donc les
// clés de `CLUB_ALIASES` (lib/teams.ts), qui sont à TIRETS : "real-madrid",
// "man-city", "atletico-madrid"… Une clé à espaces ("real madrid") ne
// matcherait jamais : la palette serait silencieusement morte, sans erreur ni
// avertissement. `npm run themes:check` vérifie que chaque entrée est
// atteignable et que les contrastes tiennent.
// ─────────────────────────────────────────────

import { clubKey } from "./teams";

export type ClubTheme = {
  /** Teinte de fond, très sombre — c'est elle qui donne l'ambiance. */
  dark: string;
  /** Couleur dominante du club : boutons, accents, liens. */
  primary: string;
  /** Seconde couleur du club, pour le liseré et les touches de contraste. */
  accent: string;
};

/**
 * Palettes par club. Couvre toutes les clés canoniques connues de
 * `CLUB_ALIASES`, plus quelques clubs de Ligue 1 hors C1 : le club de cœur peut
 * être choisi parmi les équipes de la compétition, et la liste des 36 qualifiés
 * change chaque saison — mieux vaut couvrir large.
 *
 * Un club sans entrée n'a simplement pas de thème : pas de couleurs inventées.
 */
export const THEMES: Record<string, ClubTheme> = {
  // ── France ──
  psg: { dark: "#080e28", primary: "#004170", accent: "#da291c" },
  marseille: { dark: "#05202f", primary: "#2999c5", accent: "#ffffff" },
  monaco: { dark: "#210a0f", primary: "#ce1126", accent: "#ffffff" },
  lille: { dark: "#0b1430", primary: "#e01e13", accent: "#ffffff" },
  lyon: { dark: "#0a1430", primary: "#1b458f", accent: "#e4002b" },
  brest: { dark: "#1f0910", primary: "#c4122e", accent: "#ffffff" },
  nice: { dark: "#1c0a11", primary: "#c8102e", accent: "#111111" },
  lens: { dark: "#1d1605", primary: "#d40000", accent: "#ffe500" },
  rennes: { dark: "#1e0b0f", primary: "#e23138", accent: "#111111" },
  strasbourg: { dark: "#05202f", primary: "#0b7bae", accent: "#ffffff" },

  // ── Angleterre ──
  arsenal: { dark: "#1e0a0d", primary: "#ef0107", accent: "#ffffff" },
  "aston-villa": { dark: "#1a0a14", primary: "#670e36", accent: "#95bfe5" },
  chelsea: { dark: "#080f2c", primary: "#034694", accent: "#ffffff" },
  liverpool: { dark: "#1c0710", primary: "#c8102e", accent: "#00b2a9" },
  "man-city": { dark: "#06202c", primary: "#5e95c0", accent: "#ffffff" },
  "man-united": { dark: "#1e0a0d", primary: "#da291c", accent: "#fbe122" },
  newcastle: { dark: "#131313", primary: "#5a5a5a", accent: "#ffffff" },
  tottenham: { dark: "#0b0f24", primary: "#132257", accent: "#ffffff" },

  // ── Espagne ──
  "real-madrid": { dark: "#101020", primary: "#00529f", accent: "#febe10" },
  barcelona: { dark: "#0f0a24", primary: "#a50044", accent: "#004d98" },
  "atletico-madrid": { dark: "#1e0a12", primary: "#cb3524", accent: "#272e61" },
  athletic: { dark: "#1e0a0d", primary: "#ee2523", accent: "#ffffff" },
  villarreal: { dark: "#1a1a06", primary: "#a29000", accent: "#ffe667" },
  girona: { dark: "#1e0a0d", primary: "#d31f26", accent: "#ffffff" },

  // ── Allemagne ──
  bayern: { dark: "#210a10", primary: "#dc052d", accent: "#0066b2" },
  dortmund: { dark: "#1a1a06", primary: "#a29000", accent: "#fde100" },
  leverkusen: { dark: "#1c0a10", primary: "#e32219", accent: "#111111" },
  leipzig: { dark: "#0a1330", primary: "#dd0741", accent: "#001f47" },
  "red-bull-leipzig": { dark: "#0a1330", primary: "#dd0741", accent: "#001f47" },
  frankfurt: { dark: "#1a0a0e", primary: "#e1000f", accent: "#ffffff" },
  stuttgart: { dark: "#1e0a0d", primary: "#e32219", accent: "#ffffff" },

  // ── Italie ──
  inter: { dark: "#08132c", primary: "#0068a8", accent: "#111111" },
  milan: { dark: "#1e0a0d", primary: "#fb090b", accent: "#111111" },
  juventus: { dark: "#131313", primary: "#4f4f4f", accent: "#ffffff" },
  napoli: { dark: "#05202f", primary: "#119ace", accent: "#ffffff" },
  atalanta: { dark: "#0a132c", primary: "#1e71b8", accent: "#111111" },
  roma: { dark: "#1c0a0e", primary: "#8e1f2f", accent: "#f0bc42" },
  bologna: { dark: "#1c0a12", primary: "#a71930", accent: "#1a3668" },

  // ── Portugal, Pays-Bas, Belgique ──
  benfica: { dark: "#1e0a0d", primary: "#e00034", accent: "#ffffff" },
  porto: { dark: "#07152c", primary: "#00428c", accent: "#ffffff" },
  "sporting-cp": { dark: "#07200f", primary: "#008057", accent: "#ffffff" },
  ajax: { dark: "#1e0a0d", primary: "#d2122e", accent: "#ffffff" },
  psv: { dark: "#1e1206", primary: "#ed1c24", accent: "#ffffff" },
  feyenoord: { dark: "#1e0a0d", primary: "#c81e28", accent: "#ffffff" },
  "club-brugge": { dark: "#1a1206", primary: "#0d4da1", accent: "#e2001a" },
  "union-sg": { dark: "#1a1a06", primary: "#0b4ea2", accent: "#fde100" },

  // ── Reste de l'Europe ──
  celtic: { dark: "#07200f", primary: "#018749", accent: "#ffffff" },
  galatasaray: { dark: "#1e1206", primary: "#a90432", accent: "#fdb912" },
  salzburg: { dark: "#1e0a0d", primary: "#d30029", accent: "#ffffff" },
  "young-boys": { dark: "#1a1a06", primary: "#a29000", accent: "#fde100" },
  "sturm-graz": { dark: "#131313", primary: "#4f4f4f", accent: "#ffffff" },
  copenhagen: { dark: "#07152c", primary: "#0a4595", accent: "#ffffff" },
  "bodo-glimt": { dark: "#1a1a06", primary: "#a29000", accent: "#fde100" },
  "slavia-praha": { dark: "#1e0a0d", primary: "#d7192d", accent: "#ffffff" },
  "sparta-praha": { dark: "#1c0a0e", primary: "#8b1a2b", accent: "#ffffff" },
  "dinamo-zagreb": { dark: "#07152c", primary: "#1063b0", accent: "#ffffff" },
  "crvena-zvezda": { dark: "#1e0a0d", primary: "#d3122a", accent: "#ffffff" },
  "slovan-bratislava": { dark: "#07152c", primary: "#0b4ea2", accent: "#ffffff" },
  shakhtar: { dark: "#1c1206", primary: "#c25c0c", accent: "#111111" },
  qarabag: { dark: "#131313", primary: "#4f4f4f", accent: "#ffffff" },
  kairat: { dark: "#1a1a06", primary: "#a29000", accent: "#fde100" },
  olympiakos: { dark: "#1e0a0d", primary: "#d81e05", accent: "#ffffff" },
  paphos: { dark: "#07152c", primary: "#1a5fa8", accent: "#ff7a00" },
};

/** Palette du club, ou null s'il n'en a pas — auquel cas : pas de thème. */
export function getClubTheme(team: string | null | undefined): ClubTheme | null {
  if (!team) return null;
  return THEMES[clubKey(team)] ?? null;
}

/**
 * Déclaration CSS des trois couleurs du club, à injecter dans un `<style>`.
 *
 * Posée sur `:root` et non en style inline sur le conteneur : la règle
 * `body:has(.theme-club)` d'app/globals.css doit pouvoir lire `--club-dark`
 * pour teinter aussi les gouttières hors conteneur (l'app est centrée en
 * `max-w-md`). Une variable posée sur le conteneur ne remonterait pas jusqu'au
 * `body`, qui resterait transparent — couture visible sur grand écran.
 */
export function clubThemeCss(theme: ClubTheme): string {
  return `:root{--club-dark:${theme.dark};--club-primary:${theme.primary};--club-accent:${theme.accent}}`;
}
