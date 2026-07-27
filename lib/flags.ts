// ─────────────────────────────────────────────
// Emblème d'une équipe : drapeau de nation ou écusson de club.
//
// `Match.homeFlag` / `awayFlag` stockent l'un OU l'autre :
//   • sélection nationale → un CODE flagcdn (ex. "fr", "gb-eng"). On stocke un
//     code plutôt qu'un emoji : les emojis drapeaux ne sont pas rendus par
//     Windows. Le code est affiché en image (https://flagcdn.com/{code}.svg).
//   • club (Ligue des Champions) → l'URL de l'écusson fournie par
//     football-data.org (https://crests.football-data.org/{id}.png).
//
// Le composant <Flag> distingue les deux via `isCrestUrl`.
// ─────────────────────────────────────────────

/**
 * Map nom d'équipe (tel que renvoyé par football-data, en anglais) → code
 * flagcdn (ISO-3166-1 alpha-2 en minuscules, ou code spécial pour les nations
 * britanniques).
 */
const NAME_TO_CODE: Record<string, string> = {
  // ── Nations qualifiées / probables Coupe du Monde 2026 ──
  Algeria: "dz",
  Argentina: "ar",
  Australia: "au",
  Austria: "at",
  Belgium: "be",
  "Bosnia-Herzegovina": "ba",
  Brazil: "br",
  Canada: "ca",
  "Cape Verde Islands": "cv",
  "Cape Verde": "cv",
  Colombia: "co",
  "Congo DR": "cd",
  "DR Congo": "cd",
  Croatia: "hr",
  Curaçao: "cw",
  Czechia: "cz",
  "Czech Republic": "cz",
  Ecuador: "ec",
  Egypt: "eg",
  England: "gb-eng",
  France: "fr",
  Germany: "de",
  Ghana: "gh",
  Haiti: "ht",
  Iran: "ir",
  Iraq: "iq",
  "Ivory Coast": "ci",
  Japan: "jp",
  Jordan: "jo",
  Mexico: "mx",
  Morocco: "ma",
  Netherlands: "nl",
  "New Zealand": "nz",
  Norway: "no",
  Panama: "pa",
  Paraguay: "py",
  Portugal: "pt",
  Qatar: "qa",
  "Saudi Arabia": "sa",
  Scotland: "gb-sct",
  Senegal: "sn",
  "South Africa": "za",
  "South Korea": "kr",
  "Korea Republic": "kr",
  Spain: "es",
  Sweden: "se",
  Switzerland: "ch",
  Tunisia: "tn",
  Turkey: "tr",
  Türkiye: "tr",
  "United States": "us",
  USA: "us",
  Uruguay: "uy",
  Uzbekistan: "uz",
  Wales: "gb-wls",
  // ── Autres nations courantes (au cas où) ──
  Italy: "it",
  Poland: "pl",
  Denmark: "dk",
  Serbia: "rs",
  Cameroon: "cm",
  Nigeria: "ng",
  "Costa Rica": "cr",
  Ukraine: "ua",
};

/** Code drapeau (flagcdn) pour un nom d'équipe, ou "" si inconnu. */
export function countryCode(name: string): string {
  return NAME_TO_CODE[name] ?? "";
}

/**
 * L'emblème est-il une URL d'écusson (club) plutôt qu'un code drapeau ?
 * Les écussons sont servis en absolu par football-data.org.
 */
export function isCrestUrl(emblem: string): boolean {
  return /^https?:\/\//.test(emblem);
}

/** Tous les codes drapeaux utilisés (uniques, triés) — pour le pré-téléchargement. */
export const FLAG_CODES: string[] = [
  ...new Set(Object.values(NAME_TO_CODE)),
].sort();
