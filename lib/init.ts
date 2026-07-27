import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { SYSTEM_USER_EMAIL, SYSTEM_USER_NAME } from "./match-recap";
import { SEASON_SEEDS, WC_2026 } from "./season";

const BADGES = [
  { key: "premier_pas", label: "Premier pas", emoji: "👣", description: "Ton tout premier pronostic." },
  { key: "nostradamus", label: "Nostradamus", emoji: "🔮", description: "3 scores exacts consécutifs." },
  { key: "en_feu", label: "En feu", emoji: "🔥", description: "5 bons résultats d'affilée." },
  { key: "perfectionniste", label: "Le Perfectionniste", emoji: "💎", description: "Un score exact avec le Joker." },
  { key: "assidu", label: "L'Assidu", emoji: "📅", description: "Tous les matchs d'une journée pronostiqués." },
  { key: "meme_pas_mal", label: "Même pas mal", emoji: "💀", description: "0 pt sur une journée complète." },
  { key: "sniper", label: "Sniper", emoji: "🎯", description: "10 scores exacts au total." },
  { key: "demi_centurion", label: "Cinquantenaire", emoji: "🎖️", description: "50 points au total." },
  { key: "centurion", label: "Centurion", emoji: "💯", description: "100 points au total." },
  { key: "daronissime", label: "Le Daronissime", emoji: "👑", description: "1ʳᵉ place de son groupe en fin de tournoi." },
];

/**
 * Crée (ou promeut) le compte admin défini par les variables d'environnement
 * ADMIN_EMAIL + ADMIN_PASSWORD. Idempotent : le mot de passe n'est posé qu'à
 * la création, le rôle ADMIN est garanti à chaque démarrage.
 */
async function bootstrapAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log(
      `[init] admin NON configuré — ADMIN_EMAIL=${email ? "ok" : "MANQUANT"}, ADMIN_PASSWORD=${password ? "ok" : "MANQUANT"}`
    );
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Auto-réparation : garantit le rôle ADMIN + mot de passe = ADMIN_PASSWORD.
    await prisma.user.update({
      where: { email },
      data: { role: "ADMIN", passwordHash, banned: false },
    });
    console.log(`[init] compte admin vérifié (${email})`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      name: "Admin",
      passwordHash,
      role: "ADMIN",
      score: { create: {} },
    },
  });
  console.log(`[init] compte admin créé (${email})`);
}

/**
 * Compte « système » DaronsFC — auteur des récaps auto postés dans les tchats.
 * `banned: true` le tient hors des classements et listes de membres (défensif :
 * il n'est de toute façon membre d'aucun groupe).
 */
async function bootstrapSystemUser(): Promise<void> {
  await prisma.user.upsert({
    where: { email: SYSTEM_USER_EMAIL },
    update: { name: SYSTEM_USER_NAME },
    create: {
      email: SYSTEM_USER_EMAIL,
      name: SYSTEM_USER_NAME,
      role: "USER",
      banned: true,
    },
  });
}

/**
 * Amorce le catalogue des saisons et rattache les données héritées.
 *
 * Idempotent et NON destructif : ne crée que ce qui manque, ne désactive jamais
 * une saison, ne remet aucun score à zéro. La bascule d'une saison à l'autre
 * (archivage + remise à zéro) est une action explicite : console admin, ou
 * `npm run season:switch`.
 *
 * Migration des données d'avant les saisons : les matchs et groupes sans
 * `seasonId`, ainsi que l'éventuelle désignation manuelle du champion, sont
 * rattachés à la Coupe du Monde 2026 — la seule compétition qu'a connue l'app
 * jusqu'ici.
 */
async function bootstrapSeasons(): Promise<void> {
  for (const seed of SEASON_SEEDS) {
    const existing = await prisma.season.findUnique({
      where: { code: seed.code },
      select: {
        id: true,
        logo: true,
        oddsSport: true,
        apiSeason: true,
        focusCountries: true,
      },
    });

    if (!existing) {
      await prisma.season.create({ data: seed });
      continue;
    }

    // Saison déjà en base : on NE réécrit PAS ce qui a pu être personnalisé
    // (budgets de jokers, enjeu, bonus champion). En revanche on RENSEIGNE les
    // champs restés à leur valeur par défaut — sinon une saison créée par un
    // déploiement antérieur n'obtiendrait jamais les réglages ajoutés depuis
    // (c'est ce qui laissait `focusCountries` vide, donc la limitation aux
    // clubs français silencieusement inactive).
    const backfill: {
      logo?: string;
      oddsSport?: string;
      apiSeason?: string;
      focusCountries?: string[];
    } = {};
    if (!existing.logo && seed.logo) backfill.logo = seed.logo;
    if (!existing.oddsSport && seed.oddsSport) backfill.oddsSport = seed.oddsSport;
    if (!existing.apiSeason && seed.apiSeason) backfill.apiSeason = seed.apiSeason;
    if (existing.focusCountries.length === 0 && seed.focusCountries.length > 0) {
      backfill.focusCountries = seed.focusCountries;
    }

    if (Object.keys(backfill).length > 0) {
      await prisma.season.update({ where: { id: existing.id }, data: backfill });
      console.log(
        `[init] saison ${seed.code} — champs complétés : ${Object.keys(backfill).join(", ")}`
      );
    }
  }

  const wc = await prisma.season.findUnique({
    where: { code: WC_2026.code },
    select: { id: true },
  });
  if (!wc) return;

  // Rattachement des données héritées (une seule fois : les compteurs tombent
  // à 0 ensuite).
  const [matches, groups] = await Promise.all([
    prisma.match.updateMany({ where: { seasonId: null }, data: { seasonId: wc.id } }),
    prisma.group.updateMany({ where: { seasonId: null }, data: { seasonId: wc.id } }),
  ]);
  await prisma.championOverride.updateMany({
    where: { id: "singleton", seasonId: null },
    data: { seasonId: wc.id },
  });
  if (matches.count > 0 || groups.count > 0) {
    console.log(
      `[init] saisons — ${matches.count} matchs et ${groups.count} groupes rattachés à « ${WC_2026.name} »`
    );
  }

  // Aucune saison active (première installation, ou migration) → on active la
  // Coupe du Monde pour que l'app continue d'afficher ce qu'elle affichait.
  const active = await prisma.season.count({ where: { active: true } });
  if (active === 0) {
    await prisma.season.update({ where: { id: wc.id }, data: { active: true } });
    console.log(`[init] saison active par défaut : « ${WC_2026.name} »`);
  }
}

let done = false;

export async function maybeInit(): Promise<void> {
  if (done) return;
  done = true;
  try {
    for (const badge of BADGES) {
      await prisma.badge.upsert({ where: { key: badge.key }, update: badge, create: badge });
    }
  } catch (e) {
    console.error("[init] échec seed badges:", e instanceof Error ? e.message : e);
  }
  try {
    await bootstrapSeasons();
  } catch (e) {
    console.error("[init] échec bootstrap saisons:", e instanceof Error ? e.message : e);
  }
  try {
    await bootstrapAdmin();
  } catch (e) {
    console.error("[init] échec bootstrap admin:", e instanceof Error ? e.message : e);
  }
  try {
    await bootstrapSystemUser();
  } catch (e) {
    console.error("[init] échec bootstrap bot système:", e instanceof Error ? e.message : e);
  }
}
