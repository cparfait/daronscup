import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const BADGES = [
  { key: "nostradamus", label: "Nostradamus", emoji: "🔮", description: "3 scores exacts consécutifs." },
  { key: "daronissime", label: "Le Daronissime", emoji: "👑", description: "1ʳᵉ place en fin de tournoi." },
  { key: "meme_pas_mal", label: "Même pas mal", emoji: "💀", description: "0 pt sur une journée complète." },
  { key: "sniper", label: "Sniper", emoji: "🎯", description: "10 scores exacts au total." },
];

/**
 * Crée (ou promeut) le compte admin défini par les variables d'environnement
 * ADMIN_EMAIL + ADMIN_PASSWORD. Idempotent : le mot de passe n'est posé qu'à
 * la création, le rôle ADMIN est garanti à chaque démarrage.
 */
async function bootstrapAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== "ADMIN") {
      await prisma.user.update({ where: { email }, data: { role: "ADMIN" } });
    }
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
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

let done = false;

export async function maybeInit(): Promise<void> {
  if (done) return;
  done = true;
  try {
    for (const badge of BADGES) {
      await prisma.badge.upsert({ where: { key: badge.key }, update: badge, create: badge });
    }
    await bootstrapAdmin();
  } catch {
    // Silencieux — ne bloque pas le démarrage
  }
}
