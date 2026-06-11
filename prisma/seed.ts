import { PrismaClient } from "../lib/generated/prisma";

const prisma = new PrismaClient();

// Catalogue des badges — configuration applicative (pas des données de démo).
const BADGES = [
  {
    key: "nostradamus",
    label: "Nostradamus",
    emoji: "🔮",
    description: "3 scores exacts consécutifs.",
  },
  {
    key: "daronissime",
    label: "Le Daronissime",
    emoji: "👑",
    description: "1ʳᵉ place en fin de tournoi.",
  },
  {
    key: "meme_pas_mal",
    label: "Même pas mal",
    emoji: "💀",
    description: "0 pt sur une journée complète.",
  },
  {
    key: "sniper",
    label: "Sniper",
    emoji: "🎯",
    description: "10 scores exacts au total.",
  },
];

async function main() {
  console.log("🌱 Seed DaronsFC (catalogue badges)…");

  for (const b of BADGES) {
    await prisma.badge.upsert({
      where: { key: b.key },
      update: b,
      create: b,
    });
  }
  console.log(`  ✓ ${BADGES.length} badges`);

  console.log(
    "✅ Seed terminé. Les matchs se synchronisent via POST /api/sync (API-Football)."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
