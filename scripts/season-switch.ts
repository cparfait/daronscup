/**
 * Bascule d'une saison à l'autre : archive la saison active, puis ouvre la
 * suivante en recopiant les groupes d'amis.
 *
 *   npm run season:switch                    # archive l'active → ouvre CL-2026-2027
 *   npm run season:switch -- CL-2026-2027    # cible explicite
 *   npm run season:switch -- --clone-groups  # reprend les groupes de la saison passée
 *
 * Ce que fait la bascule :
 *   1. fige le palmarès de la saison active (classement final par groupe,
 *      champions pariés, badges) dans `SeasonArchive` et décerne le 👑 ;
 *   2. active la saison cible ;
 *   3. remet à zéro points, badges et paris champion.
 *
 * La nouvelle saison démarre SANS groupe : chacun recrée sa bande (c'est
 * l'occasion de rebattre les cartes). `--clone-groups` reprend au contraire les
 * groupes et leurs membres de la saison passée, avec un tchat vierge et de
 * NOUVEAUX liens d'invitation.
 *
 * Les matchs, résultats et pronostics des saisons passées ne sont JAMAIS
 * touchés : les archives restent consultables dans l'app.
 * Idempotent : relancer sur une saison déjà active ne fait que ré-archiver.
 */
import { prisma } from "../lib/prisma";
import { getActiveSeason, getSeasonByCode, CL_2026_2027 } from "../lib/season";
import { closeSeason, openSeason } from "../lib/season-archive";

async function main() {
  const args = process.argv.slice(2);
  const targetCode = args.find((a) => !a.startsWith("--")) ?? CL_2026_2027.code;
  const cloneGroups = args.includes("--clone-groups");

  const target = await getSeasonByCode(targetCode);
  if (!target) {
    throw new Error(
      `Saison « ${targetCode} » inconnue. Démarre l'app une fois (amorçage du catalogue) ou vérifie le code.`
    );
  }

  const current = await getActiveSeason();

  if (current && current.id !== target.id) {
    console.log(`📦 Archivage de « ${current.name} »…`);
    const { palmares, champions } = await closeSeason(current.id);
    console.log(
      `  ✓ ${palmares.groups.length} groupe(s), ${palmares.totals.predictions} pronos, ` +
        `${palmares.totals.matches} matchs figés — ${champions} 👑 décerné(s)`
    );
    if (palmares.winner) {
      console.log(`  🏆 Vainqueur : ${palmares.winner.team}`);
    }
    for (const g of palmares.groups) {
      const top = g.players[0];
      if (top) console.log(`  · ${g.name} → ${top.name} (${top.points} pts)`);
    }
  } else if (current) {
    console.log(`ℹ️  « ${target.name} » est déjà la saison active.`);
  }

  console.log(`\n🚀 Ouverture de « ${target.name} »…`);
  const { groups, members } = await openSeason(target.id, {
    cloneGroupsFrom: cloneGroups ? (current?.id ?? null) : null,
  });
  console.log(`  ✓ points, badges et paris champion remis à zéro`);
  if (groups > 0) {
    console.log(`  ✓ ${groups} groupe(s) recopié(s) avec ${members} membre(s)`);
  } else {
    console.log(`  ✓ aucun groupe — chacun recrée sa bande depuis l'onglet Groupes`);
  }

  console.log(
    `\n✅ Saison active : ${target.name}.\n   Lance \`npm run sync\` pour importer le calendrier (` +
      `${target.competition}${target.apiSeason ? ` ${target.apiSeason}` : ""}).`
  );
}

main()
  .catch((e) => {
    console.error("✗ Échec de la bascule :", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
