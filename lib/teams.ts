// ─────────────────────────────────────────────
// Noms d'équipes : affichage FR + appariement inter-API.
//
// Deux besoins distincts :
//   1. AFFICHAGE — un nom court et lisible sur mobile. football-data fournit un
//      `shortName` déjà excellent pour les clubs ("PSG", "Bayern", "Man City") ;
//      on n'y ajoute que quelques francisations.
//   2. APPARIEMENT — rapprocher un match de football-data et un évènement de
//      The Odds API, qui nomment les équipes différemment
//      ("FC Bayern München" vs "Bayern Munich", "Sporting Clube de Portugal"
//      vs "Sporting Lisbon"). On réduit chaque nom à une CLÉ canonique.
//
// Pour les sélections nationales, l'appariement passe par le code drapeau
// (cf. lib/flags.ts) — plus fiable qu'une comparaison de chaînes.
// ─────────────────────────────────────────────

/** Francisations d'affichage (appliquées au `shortName` de football-data). */
const CLUB_NAME_FR: Record<string, string> = {
  København: "Copenhague",
  "Slavia Praha": "Slavia Prague",
  Athletic: "Athletic Bilbao",
  "Qarabağ Ağdam": "Qarabağ",
  "FK Kairat": "Kairat",
  "Union SG": "Union Saint-Gilloise",
  "Sporting CP": "Sporting Portugal",
  "SL Benfica": "Benfica",
  Olympiakos: "Olympiakos",
  "Paphos FC": "Paphos",
};

/**
 * Nom d'affichage d'un club : le `shortName` de football-data (déjà court et
 * connu du public), francisé si besoin. Repli sur le nom complet.
 */
export function clubDisplayName(
  name: string,
  shortName?: string | null
): string {
  const short = shortName?.trim() || name;
  return CLUB_NAME_FR[short] ?? short;
}

// ─────────────────────────────────────────────
// Clé canonique (appariement des cotes)
// ─────────────────────────────────────────────

/**
 * Mots à ignorer : uniquement des formes juridiques et des mots de liaison.
 * On NE met pas ici de mots distinctifs ("real", "united", "city"…) : les
 * retirer ferait collisionner des clubs différents (Manchester City / United).
 * Les variantes de ces clubs sont gérées explicitement par `CLUB_ALIASES`.
 */
const NOISE = new Set([
  "fc", "cf", "sc", "ac", "as", "ss", "ssc", "sk", "bk", "if", "kv", "sv",
  "afc", "ffc", "bsc", "cd", "ud", "rc", "rcd", "bc", "fk", "gnk", "pae",
  "sfp", "osc", "losc", "club", "clube", "calcio", "futbol", "football",
  "balompie", "de", "do", "da", "des", "du", "the", "e",
]);

/**
 * Normalise un nom : minuscules, sans accents ni ponctuation, espaces réduits.
 * Conserve tous les mots (utilisé comme base des variantes).
 */
function normalize(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // diacritiques
    .replace(/ø/gi, "o")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Table des clubs canoniques : clé → variantes normalisées rencontrées côté
 * football-data et côté The Odds API. Couvre les habitués de la C1 ; un club
 * absent retombe sur l'appariement générique (cf. `teamKey`).
 */
const CLUB_ALIASES: Record<string, string[]> = {
  ajax: ["afc ajax", "ajax", "ajax amsterdam"],
  arsenal: ["arsenal fc", "arsenal"],
  atalanta: ["atalanta bc", "atalanta", "atalanta bergamo"],
  athletic: ["athletic club", "athletic bilbao", "athletic club bilbao"],
  "atletico-madrid": [
    "club atletico de madrid",
    "atletico madrid",
    "atletico de madrid",
    "atleti",
  ],
  barcelona: ["fc barcelona", "barcelona", "barca"],
  bayern: ["fc bayern munchen", "bayern munich", "bayern munchen", "bayern"],
  benfica: ["sport lisboa e benfica", "benfica", "sl benfica"],
  "bodo-glimt": ["fk bodo glimt", "bodo glimt", "bodoglimt"],
  "club-brugge": ["club brugge kv", "club brugge", "brugge", "club bruges"],
  chelsea: ["chelsea fc", "chelsea"],
  copenhagen: ["fc kobenhavn", "kobenhavn", "fc copenhagen", "copenhagen"],
  dortmund: ["borussia dortmund", "dortmund", "bvb"],
  frankfurt: ["eintracht frankfurt", "frankfurt"],
  galatasaray: ["galatasaray sk", "galatasaray"],
  inter: [
    "fc internazionale milano",
    "inter milan",
    "internazionale",
    "inter",
    "inter milano",
  ],
  juventus: ["juventus fc", "juventus", "juventus turin"],
  kairat: ["fk kairat", "kairat", "kairat almaty"],
  leverkusen: ["bayer 04 leverkusen", "bayer leverkusen", "leverkusen"],
  liverpool: ["liverpool fc", "liverpool"],
  "man-city": ["manchester city fc", "manchester city", "man city"],
  "man-united": ["manchester united fc", "manchester united", "man utd"],
  marseille: ["olympique de marseille", "marseille", "olympique marseille"],
  monaco: ["as monaco fc", "as monaco", "monaco"],
  napoli: ["ssc napoli", "napoli", "naples"],
  newcastle: ["newcastle united fc", "newcastle united", "newcastle"],
  olympiakos: ["pae olympiakos sfp", "olympiakos", "olympiacos", "olympiakos piraeus"],
  paphos: ["paphos fc", "paphos", "pafos"],
  psg: [
    "paris saint germain fc",
    "paris saint germain",
    "paris sg",
    "psg",
    "paris",
  ],
  psv: ["psv", "psv eindhoven"],
  qarabag: ["qarabag agdam fk", "qarabag agdam", "qarabag", "qarabag fk"],
  "real-madrid": ["real madrid cf", "real madrid"],
  "slavia-praha": ["sk slavia praha", "slavia praha", "slavia prague", "slavia"],
  "sporting-cp": [
    "sporting clube de portugal",
    "sporting cp",
    "sporting lisbon",
    "sporting lisboa",
    "sporting",
  ],
  tottenham: ["tottenham hotspur fc", "tottenham hotspur", "tottenham", "spurs"],
  "union-sg": [
    "royale union saint gilloise",
    "union saint gilloise",
    "union sg",
    "union st gilloise",
    "royale union st gilloise",
  ],
  villarreal: ["villarreal cf", "villarreal"],
  // Habitués non qualifiés en 2025/26 mais susceptibles de revenir.
  leipzig: ["rb leipzig", "leipzig"],
  salzburg: ["fc salzburg", "red bull salzburg", "rb salzburg", "salzburg"],
  porto: ["fc porto", "porto"],
  feyenoord: ["feyenoord rotterdam", "feyenoord"],
  celtic: ["celtic fc", "celtic"],
  milan: ["ac milan", "milan"],
  roma: ["as roma", "roma"],
  lille: ["lille osc", "lille", "losc lille"],
  lyon: ["olympique lyonnais", "lyon"],
  stuttgart: ["vfb stuttgart", "stuttgart"],
  "shakhtar": ["fc shakhtar donetsk", "shakhtar donetsk", "shakhtar"],
  "dinamo-zagreb": ["gnk dinamo zagreb", "dinamo zagreb"],
  "sturm-graz": ["sk sturm graz", "sturm graz"],
  "young-boys": ["bsc young boys", "young boys"],
  "crvena-zvezda": ["fk crvena zvezda", "crvena zvezda", "red star belgrade"],
  brest: ["stade brestois 29", "stade brestois", "brest"],
  girona: ["girona fc", "girona"],
  bologna: ["bologna fc 1909", "bologna"],
  "aston-villa": ["aston villa fc", "aston villa"],
  "sparta-praha": ["ac sparta praha", "sparta praha", "sparta prague"],
  "slovan-bratislava": ["sk slovan bratislava", "slovan bratislava"],
  "red-bull-leipzig": ["rasenballsport leipzig"],
};

/** Index inversé variante normalisée → clé canonique (construit une fois). */
const ALIAS_INDEX: Map<string, string> = (() => {
  const index = new Map<string, string>();
  for (const [key, variants] of Object.entries(CLUB_ALIASES)) {
    for (const v of variants) index.set(normalize(v), key);
  }
  return index;
})();

/**
 * Réduction générique : normalise puis retire les mots « bruit » (formes
 * juridiques, mots trop courants). Repli quand le club n'est pas dans la table.
 * "FC Bayern München" → "munchen", "Villarreal CF" → "villarreal".
 */
function genericKey(name: string): string {
  const words = normalize(name)
    .split(" ")
    .filter((w) => w.length > 1 && !NOISE.has(w) && !/^\d+$/.test(w));
  // Tout était du bruit (ex. "Athletic Club") → on garde le nom normalisé brut.
  return (words.length > 0 ? words : normalize(name).split(" ")).join(" ");
}

/**
 * Clé canonique d'un nom de club, comparable entre football-data et The Odds
 * API. Renvoie "" pour un nom vide.
 */
export function clubKey(name: string): string {
  if (!name?.trim()) return "";
  const norm = normalize(name);
  const direct = ALIAS_INDEX.get(norm);
  if (direct) return direct;
  const generic = genericKey(name);
  return ALIAS_INDEX.get(generic) ?? generic;
}
