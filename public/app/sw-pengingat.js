// Service worker kecil untuk notifikasi pengingat siklus (src/app-web/pengingat.js).
// Sengaja TIDAK menangani fetch / cache, jadi tidak mengubah cara halaman dimuat.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const tujuan = new URL(event.notification.data?.url || "/app/maggot", self.location.origin).href;
  event.waitUntil((async () => {
    const jendela = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const app = jendela.find((c) => new URL(c.url).pathname.startsWith("/app"));
    if (app) {
      await app.focus();
      try { await app.navigate(tujuan); } catch { /* halaman belum dikendalikan SW: biarkan terbuka */ }
      return;
    }
    await self.clients.openWindow(tujuan);
  })());
});
