"use strict";

// =============================================================
// archetypes.js — AI archetype overlay (S16)
//
// Each AI persona (Marco/Alessia/Karim) keeps its dept-bias and
// base weights; an archetype is drawn per game and layered ON TOP.
// 3 personas × 5 archetypes = 15 distinct opposing styles.
//
// Archetype shape:
//   id, name, icon                       — identity
//   description                          — UX tooltip
//   weightMultipliers: { resKey: factor } — multiplied with persona weights
//   cardTypeBias: { TypeName: number }   — extra score per card.type
//   blockModifier: number                 — DEPRECATED S20.1 (Block & React
//                                           removed). Kept as vestigial field;
//                                           no runtime effect.
//   riskMultiplier: number                — multiplied with crunch penalty
//                                           (>1 = more cautious; <1 = more daring)
//
// The archetypes are drawn at game start via drawArchetypes(count) and
// stored on each AI player as p.archetype. computeAI* functions read it
// directly. SYNERGY_POOL-style fallback (no archetype) keeps Junior +
// pre-S16 saves working unchanged.
// =============================================================

const ARCHETYPE_POOL = [
  {
    id: "aggressor",
    name: "Aggressor",
    icon: "⚔️",
    description: "Punta MAU subito, prende Sabotage senza esitare, blocca spesso.",
    weightMultipliers: { vp: 1.3, morale: 0.8 },
    cardTypeBias: { Sabotage: 1.5, Launch: 1.2 },
    blockModifier: 1.3,
    riskMultiplier: 1.2,    // tollera il debt per spingere VP
  },
  {
    id: "hoarder",
    name: "Hoarder",
    icon: "🪙",
    description: "Accumula budget e dati, evita carte costose, gioca sicuro.",
    weightMultipliers: { budget: 1.3, dati: 1.1, vp: 0.9 },
    cardTypeBias: { Funding: 1.2, Tool: 1.1, Sabotage: -1.5 },
    blockModifier: 1.2,
    riskMultiplier: 0.6,    // pesa molto il debt → evita Crunch
  },
  {
    id: "disruptor",
    name: "Disruptor",
    icon: "💣",
    description: "Sabotage-heavy e block aggressivo. Ama il caos.",
    weightMultipliers: { vp: 1.1, dati: 0.9 },
    cardTypeBias: { Sabotage: 2.0, Tool: 0.7, Funding: 0.8 },
    blockModifier: 1.4,
    riskMultiplier: 1.3,    // accetta il rischio per disturbare
  },
  {
    id: "hype_master",
    name: "Hype Master",
    icon: "🎤",
    description: "Launch-focused e VP-greedy, ignora i fondamentali tecnici.",
    weightMultipliers: { vp: 1.3, talento: 0.8, dati: 0.8 },
    cardTypeBias: { Launch: 1.5, Feature: 1.2, BugFix: -0.8 },
    blockModifier: 0.9,
    riskMultiplier: 1.1,
  },
  {
    id: "bootstrapper",
    name: "Bootstrapper",
    icon: "🥾",
    description: "Rifiuta Funding, +Hiring, frugal: cresce con il proprio team.",
    weightMultipliers: { budget: 0.8, talento: 1.2 },
    cardTypeBias: { Funding: -3.0, Hiring: 1.2, Tool: 1.1 },
    blockModifier: 0.8,     // budget basso → block è caro, lo evita
    riskMultiplier: 0.8,    // frugal = cauteloso
  },
];

// Lookup helper, used by deserializeState() in multiplayer.js
function getArchetypeById(id) {
  return ARCHETYPE_POOL.find(a => a.id === id) || null;
}

// =============================================================
// drawArchetypes(count) — pesca N archetipi distinti per la partita.
// Usa rng() (seedable da Daily). Se count > pool.length, ritorna l'intero
// pool. Niente "guaranteed" o "boostedTags": tutti gli archetipi sono
// ugualmente interessanti — la varietà sta nel cambio per partita.
// =============================================================
function drawArchetypes(count) {
  const pool = [...ARCHETYPE_POOL];
  const target = Math.min(count, pool.length);
  const out = [];
  while (out.length < target && pool.length > 0) {
    const idx = Math.floor(rng() * pool.length);
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return out;
}

// =============================================================
// assignArchetypesToAIs(state) — pesca e assegna archetypes ai 3 AI.
// Chiamata da startGame/startGameMultiplayer dopo l'inizializzazione
// dello state.players. Skipa lo slot 0 (umano) e gli slot human-remote
// in multiplayer (solo gli AI ricevono archetype).
// =============================================================
function assignArchetypesToAIs(state) {
  const aiSlots = state.players.filter(p => !p.isHuman);
  const archetypes = drawArchetypes(aiSlots.length);
  aiSlots.forEach((p, i) => {
    p.archetype = archetypes[i] || null;
  });
}
