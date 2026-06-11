import { prisma } from "./prisma";

const BADGES = [
  { key: "nostradamus", label: "Nostradamus", emoji: "🔮", description: "3 scores exacts consécutifs." },
  { key: "daronissime", label: "Le Daronissime", emoji: "👑", description: "1ʳᵉ place en fin de tournoi." },
  { key: "meme_pas_mal", label: "Même pas mal", emoji: "💀", description: "0 pt sur une journée complète." },
  { key: "sniper", label: "Sniper", emoji: "🎯", description: "10 scores exacts au total." },
];

let done = false;

export async function maybeInit(): Promise<void> {
  if (done) return;
  done = true;
  try {
    for (const badge of BADGES) {
      await prisma.badge.upsert({ where: { key: badge.key }, update: badge, create: badge });
    }
  } catch {
    // Silencieux — ne bloque pas le démarrage
  }
}
