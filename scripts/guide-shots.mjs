/**
 * Régénère les captures d'écran de la page /guide (`public/guide/*.webp`).
 *
 * À relancer quand l'interface change : sinon le guide illustre une app qui
 * n'existe plus. Les captures sont prises au format téléphone (390×844 @2x),
 * l'usage réel de l'app.
 *
 * Prérequis :
 *   1. la base de dev tourne   → docker compose -f docker-compose.dev.yml up -d
 *   2. le serveur de dev tourne → npm run dev
 *   3. un jeu de données visible : injecte le jeu de test depuis la console
 *      admin, puis active le mode aperçu (les captures d'une base vide ne
 *      montrent rien d'intéressant)
 *   4. puppeteer-core, non versionné car utile à ce seul script :
 *      npm i --no-save puppeteer-core
 *
 * Usage :
 *   GUIDE_EMAIL=… GUIDE_PASSWORD=… node scripts/guide-shots.mjs [port]
 */
import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";

const PORT = process.argv[2] ?? "43698";
const BASE = `http://localhost:${PORT}`;
const OUT = "public/guide";
// Chrome installé sur le poste (pas de Chromium téléchargé). Surchargeable :
//   CHROME_PATH=/usr/bin/google-chrome node scripts/guide-shots.mjs
const CHROME =
  process.env.CHROME_PATH ??
  "C:/Program Files/Google/Chrome/Application/chrome.exe";

// Identifiants du compte de dev utilisé pour les captures. Jamais en dur :
//   GUIDE_EMAIL=… GUIDE_PASSWORD=… node scripts/guide-shots.mjs 3000
const EMAIL = process.env.GUIDE_EMAIL;
const PASSWORD = process.env.GUIDE_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error("GUIDE_EMAIL et GUIDE_PASSWORD sont requis.");
  process.exit(1);
}

/** Ferme les modales d'onboarding qui se posent au premier affichage. */
async function dismissModals(page) {
  for (let i = 0; i < 3; i++) {
    const clicked = await page.evaluate(() => {
      const re = /J'AI COMPRIS|C'EST PARTI|COMPRIS/i;
      for (const b of document.querySelectorAll("button")) {
        if (re.test(b.textContent ?? "")) {
          b.click();
          return true;
        }
      }
      return false;
    });
    if (!clicked) break;
    await new Promise((r) => setTimeout(r, 600));
  }
}

/** Masque l'overlay de dev Next.js et le bandeau « mode aperçu » (admin only). */
async function clean(page) {
  await dismissModals(page);
  await page.evaluate(() => {
    if (!document.getElementById("guide-clean")) {
      const s = document.createElement("style");
      s.id = "guide-clean";
      s.textContent = "nextjs-portal{display:none !important}";
      document.head.appendChild(s);
    }
    // Bandeau d'aperçu admin : invisible pour les joueurs, donc hors guide.
    for (const el of document.querySelectorAll("main > div")) {
      if (/Mode aperçu/.test(el.textContent ?? "")) el.style.display = "none";
    }
  });
  await new Promise((r) => setTimeout(r, 400));
}

/**
 * Capture au format écran de téléphone (390×844), pas en pleine page : la barre
 * de navigation est fixe, une capture pleine page la ferait flotter au milieu.
 * `scroll` fait défiler avant la prise pour cadrer un élément plus bas.
 */
async function shot(page, name, { path: route, scroll = 0, wait = 1200 } = {}) {
  if (route) {
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle2" });
  }
  await new Promise((r) => setTimeout(r, wait));
  await clean(page);
  if (scroll) {
    await page.evaluate((y) => window.scrollTo(0, y), scroll);
    await new Promise((r) => setTimeout(r, 700));
  }
  await page.screenshot({ path: `${OUT}/${name}.webp` });
  console.log(`✓ ${name}.webp`);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--hide-scrollbars", "--force-color-profile=srgb"],
});

try {
  await mkdir(OUT, { recursive: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  // ── Écran de connexion (avant login) ──
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
  await shot(page, "01-connexion");

  // ── Connexion ──
  await page.type('input[name="email"]', EMAIL);
  await page.type('input[name="password"]', PASSWORD);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  await new Promise((r) => setTimeout(r, 2500));

  // ── Mode aperçu : affiche la saison de test (format C1 complet) ──
  await page.setCookie({
    name: "daronsfc_preview",
    value: "1",
    domain: "localhost",
    path: "/",
  });

  await shot(page, "02-hub", { path: "/dashboard" });
  await shot(page, "03-hub-enjeu", { path: "/dashboard", scroll: 820 });
  await shot(page, "04-matchs", { path: "/matches" });
  await shot(page, "05-prono", { path: "/matches", scroll: 320 });
  await shot(page, "06-resultats", { path: "/results" });
  await shot(page, "07-classement", { path: "/leaderboard" });
  await shot(page, "08-tchat", { path: "/chat" });
  await shot(page, "09-profil", { path: "/profile" });
  await shot(page, "10-profil-club", { path: "/profile", scroll: 700 });
} finally {
  await browser.close();
}
