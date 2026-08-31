/**
 * Garde-fou des palettes « jour de match » (lib/club-themes.ts).
 *
 *   npm run themes:check
 *
 * Vérifie deux choses qu'aucun test de type ne peut attraper :
 *
 *  1. ATTEIGNABILITÉ — une clé de `THEMES` qui n'est pas exactement celle que
 *     renvoie `clubKey` est morte : `getClubTheme` ne la trouvera jamais, sans
 *     la moindre erreur. C'est arrivé avec "real madrid" (espace) alors que la
 *     clé canonique est "real-madrid" (tiret) : six des plus gros clubs de la
 *     C1 n'avaient silencieusement aucun thème.
 *
 *  2. CONTRASTE — `--color-pitch` sert de fond aux boutons principaux, dont le
 *     texte est blanc en dur ; `--club-dark` sert de fond de page, sous du
 *     texte crème. Une couleur de club trop claire rend l'un ou l'autre
 *     illisible (Juventus en blanc sur blanc, par exemple).
 */
import { THEMES, getClubTheme } from "../lib/club-themes";
import { clubKey, CANONICAL_CLUB_KEYS } from "../lib/teams";

const WHITE = "#ffffff";
const CREAM = "#f5f0e6";
/** Seuil WCAG pour du texte large et gras / composants d'interface. */
const MIN_BUTTON = 3;
/** Le fond de page doit rester franchement sombre. */
const MIN_BACKGROUND = 7;

function luminance(hex: string): number {
  const channels = [1, 3, 5]
    .map((i) => parseInt(hex.substr(i, 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const problems: string[] = [];

for (const [key, theme] of Object.entries(THEMES)) {
  // 1. La clé doit être atteignable : soit une clé canonique déclarée dans
  // CLUB_ALIASES (les clés à tirets, que `clubKey` renvoie pour les vrais noms
  // mais pas pour elles-mêmes), soit son propre point fixe (clubs sans alias,
  // qui passent par l'appariement générique).
  if (!CANONICAL_CLUB_KEYS.has(key) && clubKey(key) !== key) {
    problems.push(
      `${key} — clé inatteignable : clubKey("${key}") = "${clubKey(key)}"`
    );
  }

  // 2. Contrastes.
  const button = contrast(theme.primary, WHITE);
  if (button < MIN_BUTTON) {
    problems.push(
      `${key} — bouton illisible : blanc sur ${theme.primary} = ${button.toFixed(2)} (min ${MIN_BUTTON})`
    );
  }
  const background = contrast(theme.dark, CREAM);
  if (background < MIN_BACKGROUND) {
    problems.push(
      `${key} — fond trop clair : crème sur ${theme.dark} = ${background.toFixed(2)} (min ${MIN_BACKGROUND})`
    );
  }
}

// 3. Quelques noms réels, tels que football-data les fournit, doivent résoudre.
const REAL_NAMES = [
  "PSG",
  "Paris Saint-Germain",
  "Marseille",
  "Monaco",
  "Real Madrid",
  "Man City",
  "Manchester United",
  "Atlético Madrid",
  "Sporting CP",
  "Club Brugge",
  "Barça",
  "Bayern",
  "Inter",
];
for (const name of REAL_NAMES) {
  if (!getClubTheme(name)) {
    problems.push(`"${name}" — aucune palette (clé calculée : "${clubKey(name)}")`);
  }
}

// 4. Couverture : tout club que le code sait nommer doit pouvoir être thémé.
const uncovered = [...CANONICAL_CLUB_KEYS].filter((k) => !(k in THEMES));
if (uncovered.length > 0) {
  problems.push(`clés canoniques sans palette : ${uncovered.join(", ")}`);
}

const count = Object.keys(THEMES).length;
if (problems.length > 0) {
  console.error(`✗ ${problems.length} problème(s) sur ${count} palettes :`);
  for (const p of problems) console.error(`   ${p}`);
  process.exit(1);
}
console.log(`✓ ${count} palettes — toutes atteignables et lisibles.`);
