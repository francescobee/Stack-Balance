"use strict";

// =============================================================
// scenarios.js — Game-wide ruleset variations (S6.1)
//
// A Scenario applies to ALL players equally (vs. Vision which is
// per-player). Reuses the modifier engine from rules.js with a few
// new keys for scenario-specific transformations.
//
// Modifier keys used by scenarios:
//   - All Vision/Event keys (costModifiersByType, effectBonusByType, etc.)
//   - effectMultipliersByDept: { dept: { res: factor } }    (NEW)
//   - zeroResourceCosts: [resourceNames]                     (NEW)
//   - statCaps: { stat: max }                                (NEW)
//   - onQuarterStart(state)  callback                        (NEW)
// =============================================================

const SCENARIO_POOL = [
  {
    id: "standard",
    icon: "🎯",
    name: "Standard",
    description: "Il gioco base. Niente regole alterate.",
    bonus: "Bilanciato",
    malus: "Nessuna sorpresa",
    locked: false,
    minWinsToUnlock: 0,
    modifiers: {},
  },
  {
    id: "bear_market_2008",
    icon: "🐻",
    name: "Bear Market 2008",
    description: "Crisi finanziaria. Tutti i Funding costano di più, ma raccogliere capitali vale doppio.",
    bonus: "Funding award ×2 (Funding Diversity raddoppiato)",
    malus: "Funding cards: +2💰 costo",
    locked: true,
    minWinsToUnlock: 1,
    modifiers: {
      costModifiersByType: { Funding: { budget: 2 } },
      awardMultipliers: { funding: 2, full_funding: 1.5 },
    },
  },
  {
    id: "ai_hype_wave",
    icon: "🤖",
    name: "AI Hype Wave",
    description: "Tutti vogliono prodotti AI. Carte Data potenziate, tool scontati.",
    bonus: "Data dept: ×1.5 effetto · Tool cards −1💰",
    malus: "(nessuno significativo)",
    locked: true,
    minWinsToUnlock: 2,
    modifiers: {
      effectMultipliersByDept: { data: { vp: 1.5, dati: 1.5 } },
      costModifiersByType: { Tool: { budget: -1 } },
    },
  },
  {
    id: "remote_first",
    icon: "🏠",
    name: "Remote First",
    description: "Lavoro distribuito globale. Tempo gratis ma team più piccolo, e morale più fragile.",
    bonus: "Tutte le carte: 0⏱ costo",
    malus: "Max Talento 3 · −1 Morale a inizio Q",
    locked: true,
    minWinsToUnlock: 3,
    modifiers: {
      zeroResourceCosts: ["tempo"],
      statCaps: { talento: 3 },
      onQuarterStart: (s) => {
        s.players.forEach(p => {
          p.morale = Math.max(0, p.morale - 1);
        });
      },
    },
  },
];

function getScenarioById(id) {
  return SCENARIO_POOL.find(s => s.id === id) || SCENARIO_POOL[0];
}

// Returns scenario list with current locked state computed from profile
function getAvailableScenarios(profile) {
  const wins = profile?.stats?.wins || 0;
  return SCENARIO_POOL.map(s => ({
    ...s,
    isLocked: s.locked && wins < s.minWinsToUnlock,
    winsNeeded: Math.max(0, s.minWinsToUnlock - wins),
  }));
}
