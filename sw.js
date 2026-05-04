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

const CACHE_VERSION = "sb-v16";  // bump on each deploy
// v2 (2026-04-30): post-S12.6 hotfix — pyramid spacing/aspect ratio
//                  rebalanced (board.css).
// v3 (2026-04-30): user feedback iter 3 — full #app padding breakout
//                  + show eff-line on thumbs + aspect 0.72 to match
//                  desktop.
// v4 (2026-04-30): mobile UX iter 4 — compact resources strip above
//                  the pyramid (renderMobileResourcesStrip), byline
//                  hidden on phone.
// v5 (2026-04-30): Phase 13.1 — touch feedback + glanceability fixes:
//                  :active on card-detail buttons + close X, type-label
//                  visible on thumb, resources strip reordered, tap
//                  targets 48→52 / 32→40.
// v6 (2026-04-30): Phase 13.2 — discoverability: persistent
//                  renderMobileTurnBar above resources strip, sparkle ✨
//                  on face-down pickable d0 (blind-pick cue), 320px
//                  fallback documented.
// v7 (2026-04-30): Phase 13.3 — Hot Seat phone pacing: reveal-delay
//                  veil (paper overlay 700ms before new board reveals),
//                  "Up next: [name]" indicator in pass-screen modal,
//                  sndPassConfirm chime on acknowledge.
// v8 (2026-04-30): Phase 14 — replayability content expansion. Pool
//                  46 → 76 cards (consumption ratio 156% → 95%). 30
//                  new cards across Q1/Q2/Q3. Game logic untouched.
//                  data.js only.
// v9 (2026-04-30): S15 — synergy pool drawn at game start. New
//                  js/synergies.js (24 synergies, scenario flavour),
//                  refactored rules.js, new showcase modal. Existing
//                  PWAs get the new file + cleared old cache.
// v10 (2026-05-03): S16 — AI archetype layer. New js/archetypes.js
//                   (5 archetypes layered on top of dept-bias personas).
//                   ai.js scoring updated to apply archetype multipliers
//                   + cardTypeBias + blockModifier + riskMultiplier.
// v11 (2026-05-03): S17 — scenario-locked win conditions. New
//                   js/win-conditions.js (mau / survival / acquisition /
//                   efficiency). Scenarios pin one each. End-game banner +
//                   masthead badge use the active win condition.
// v12 (2026-05-03): S18.1 — Founder Level (XP / levels). recordGameResult
//                   now accrues XP and computes a derived level (cap 20).
//                   Profile UI shows level chip + progress bar. Level-up
//                   toast on threshold cross. Per-vision stats tracked
//                   for the upcoming S18.2 vision-variant unlock.
// v13 (2026-05-03): S18.2 — Vision variants (earn-by-mastery). 8 base
//                   visions + 8 v2 variants in VISION_POOL. Each variant
//                   unlocks after 3 wins with its base. Profile shows
//                   Vision Mastery panel; draft modal flags v2 cards.
// v14 (2026-05-03): S18.3 — Weekly Challenge mode. New js/weekly-challenges.js
//                   (6 challenges rotated by ISO week). Splash button +
//                   intro modal + masthead badge. Mutators applied via the
//                   existing modifier engine (4th pass after Scenario).
// v15 (2026-05-04): S19.1 — Morale as cost. payCost defensive clamp at 0,
//                   burnout debt scaling at end-of-Q (slope 4-morale, +0 at ≥4,
//                   +4 at morale 0), block disabled at morale ≤ 3 (single-player).
//                   Schema-only change; no carte morale-cost ancora (S19.2).
// v16 (2026-05-04): S19.2 — Content per la mechanic morale. +5 crunch cards
//                   (Pivot Sprint Q1, All-Nighter+Emergency Hire Q2, Weekend
//                   Push+Ship at Any Cost Q3) + 3 recovery (Sabbatical Day Q1,
//                   Mental Health Workshop Q2, Culture Day Q3). +2 synergies
//                   (Burnout Survivor, Workplace Utopia). +1 OKR (Healthy
//                   Sprint, anti-crunch). +1 base Vision (Crunch Culture, 9th
//                   slot — i v2 erano tutti già occupati). New modifier
//                   effectBonusByCondition.cardHasCost (rules.js).
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
  "./js/synergies.js",
  "./js/archetypes.js",
  "./js/win-conditions.js",
  "./js/weekly-challenges.js",
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
