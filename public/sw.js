// Service worker minimal DaronsFC.
// Présence d'un handler `fetch` requise pour que Chrome/Android proposent
// l'installation. Le contenu applicatif (API, pages) reste en passthrough
// réseau pour ne jamais servir de données périmées (appli temps réel).
//
// SEULE EXCEPTION : les assets immuables (drapeaux flagcdn, logos API-Football)
// sont mis en cache (cache-first). Ils ne changent jamais, donc aucun risque de
// périmé — et ça corrige les drapeaux manquants sur iOS quand le réseau mobile
// avorte une requête (avant, un échec laissait un drapeau vide jusqu'à ce qu'on
// change de menu).

const ASSET_CACHE = "daronsfc-assets-v1";
const ASSET_HOSTS = ["flagcdn.com", "media.api-sports.io"];

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      // Purge des anciens caches d'assets (versions précédentes).
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("daronsfc-assets-") && k !== ASSET_CACHE)
            .map((k) => caches.delete(k))
        )
      ),
      self.clients.claim(),
    ])
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  // Assets immuables uniquement → cache-first avec repli réseau.
  if (ASSET_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const res = await fetch(req);
          // On ne met en cache que les réponses exploitables.
          if (res && (res.ok || res.type === "opaque")) {
            cache.put(req, res.clone());
          }
          return res;
        } catch (err) {
          // Hors-ligne / réseau avorté : si on a un cache (même partiel), il a
          // déjà été renvoyé plus haut. Sinon on propage l'échec.
          throw err;
        }
      })
    );
    return;
  }

  // Tout le reste : passthrough réseau (pas de respondWith).
});

// ── Notifications push ──
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "DaronsFC", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "DaronsFC";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/dashboard" },
      vibrate: [80, 40, 80],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
