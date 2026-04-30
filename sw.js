"use strict";

// =============================================================
// sw.js — service worker minimale per PWA (Phase 12 / S12.6)
//
// Strategy: cache-first per asset same-origin (HTML, CSS, JS, icone).
// Bypass per cross-origin (Google Fonts, PeerJS CDN, signaling) — quei
// fetch passano dritti alla rete e fanno il loro fallback come prima.
//
// Cache versioning: bump CACHE_VERSION ad ogni deploy che cambia asset
// critici. L'activate handler pulisce le cache vecchie.
//
// Offline UX: single-player + Hot Seat funzionano interamente da cache
// (la game logic è pure-JS, gli asset stanno tutti qui sotto). P2P MP
// richiede ovviamente la rete (PeerJS signaling); fa fallback grazioso
// se offline (mostra toast esistente "Servizio non disponibile").
// =============================================================

const CACHE_VERSION = "sb-v1";  // bump on each deploy
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon.svg",
  "./styles/main.css",
  "./styles/board.css",
  "./styles/player.css",
  // Game logic (loaded in deterministic order from index.html)
  "./js/data.js",
  "./js/visions.js",
  "./js/scenarios.js",
  "./js/util.js",
  "./js/user.js",
  "./js/audio.js",
  "./js/achievements.js",
  "./js/balance.js",
  "./js/state.js",
  "./js/rules.js",
  "./js/ai.js",
  "./js/game.js",
  "./js/multiplayer.js",
  "./js/hotseat.js",
  // Render layer
  "./js/render-pyramid.js",
  "./js/render-tableau.js",
  "./js/render-sidebar.js",
  "./js/render-masthead.js",
  "./js/render-modals.js",
  "./js/render-profile.js",
  "./js/render-multiplayer.js",
  "./js/render-hotseat.js",
  "./js/render-card-detail.js",
  "./js/render.js",
  "./js/main.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache =>
        // addAll è atomico: se UN asset fallisce, l'intera cache fail.
        // Cattura per non bloccare l'install in dev (file://, asset
        // mancante temporaneamente, etc.). Per i siti deployed va liscio.
        cache.addAll(ASSETS).catch(err => {
          console.warn("[sw] cache.addAll failed (non-blocking):", err);
        })
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(keys
          .filter(k => k !== CACHE_VERSION)
          .map(k => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // Skip non-GET (POST/PUT etc — non cacheable)
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Skip cross-origin: Google Fonts, PeerJS CDN, signaling. They go
  // straight to network — when offline they fail, and the existing
  // CDN-down fallbacks take over (system fonts, MP toast).
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(resp => {
        // Cache successful 200s for next visit
        if (!resp || resp.status !== 200 || resp.type === "opaque") return resp;
        const copy = resp.clone();
        caches.open(CACHE_VERSION).then(c => c.put(event.request, copy));
        return resp;
      }).catch(() =>
        // Offline + asset not in cache: fallback to index for SPA-style
        // navigation (only relevant if user hits a URL we never visited)
        caches.match("./index.html")
      );
    })
  );
});
