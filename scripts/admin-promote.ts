/**
 * Promotion d'un compte au rôle ADMIN, en direct dans la base.
 *
 *   npm run admin:promote                      # état des lieux : qui est admin ?
 *   npm run admin:promote -- chris@exemple.fr  # promeut ce compte
 *   npm run admin:promote -- --bootstrap       # (re)crée le compte ADMIN_EMAIL
 *
 * Pourquoi un script : la promotion via l'app (`POST /api/admin/users`) exige
 * déjà d'être admin. Si plus personne ne l'est — base amorcée sans
 * ADMIN_EMAIL, rétrogradation par un autre admin, amorçage échoué faute de
 * base joignable — l'app se verrouille toute seule. Ce script est la porte de
 * secours : il ne passe pas par l'auth HTTP, seulement par `DATABASE_URL`.
 *
 * Le rôle est relu en base au plus une fois par minute (cf. lib/auth.ts), donc
 * la console d'administration réapparaît sans avoir à se reconnecter.
 */
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

/** Affiche les comptes et leur rôle, admins d'abord. */
async function listAccounts(): Promise<void> {
  const users = await prisma.user.findMany({
    select: { email: true, name: true, role: true, banned: true },
    orderBy: [{ role: "desc" }, { email: "asc" }],
  });

  if (users.length === 0) {
    console.log("Aucun compte en base. Lance l'app une fois, ou `--bootstrap`.");
    return;
  }

  const admins = users.filter((u) => u.role === "ADMIN");
  console.log(`${users.length} compte(s), dont ${admins.length} admin(s) :\n`);
  for (const u of users) {
    const badge = u.role === "ADMIN" ? "🛡️  ADMIN" : "   user ";
    const banned = u.banned ? " (banni)" : "";
    console.log(`${badge}  ${(u.email ?? "—").padEnd(34)} ${u.name ?? ""}${banned}`);
  }

  if (admins.length === 0) {
    console.log(
      "\n⚠️  Personne n'est admin : la console d'administration est inaccessible." +
        "\n   → npm run admin:promote -- <email>"
    );
  }
}

/**
 * (Re)crée le compte défini par ADMIN_EMAIL + ADMIN_PASSWORD — le même travail
 * que `bootstrapAdmin()` au démarrage de l'app, mais déclenché à la main.
 */
async function bootstrap(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "ADMIN_EMAIL et ADMIN_PASSWORD doivent être définis dans l'environnement."
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN", passwordHash, banned: false },
    create: {
      email,
      name: "Admin",
      passwordHash,
      role: "ADMIN",
      score: { create: {} },
    },
  });
  console.log(`✅ Compte admin prêt : ${user.email} (mot de passe = ADMIN_PASSWORD).`);
}

/** Promeut un compte existant, désigné par son email. */
async function promote(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true, banned: true },
  });

  if (!user) {
    const known = await prisma.user.count();
    throw new Error(
      `Aucun compte avec l'email « ${email} » (${known} compte(s) en base).` +
        "\n   Lance `npm run admin:promote` sans argument pour voir la liste."
    );
  }

  if (user.role === "ADMIN" && !user.banned) {
    console.log(`ℹ️  ${user.email} est déjà admin — rien à faire.`);
    return;
  }

  // On débannit au passage : un admin banni ne peut pas se connecter, donc la
  // promotion seule ne le sortirait pas de l'impasse.
  await prisma.user.update({
    where: { id: user.id },
    data: { role: "ADMIN", banned: false },
  });
  console.log(
    `✅ ${user.email} est maintenant ADMIN${user.banned ? " (et débanni)" : ""}.` +
      "\n   La console apparaît dans l'onglet Profil sous une minute, sans reconnexion."
  );
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--bootstrap")) {
    await bootstrap();
    return;
  }

  const email = args.find((a) => !a.startsWith("--"));
  if (!email) {
    await listAccounts();
    return;
  }
  await promote(email);
}

main()
  .then(() => prisma.$disconnect())
  .then(() => process.exit(0))
  .catch(async (e) => {
    console.error("❌", e instanceof Error ? e.message : e);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  });
