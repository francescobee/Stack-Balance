"use strict";

// =============================================================
// visions.js — Strategic Vision Cards (S2.3)
//
// Each Vision is an immutable identity chosen at game start.
// It mutates the rules of the game for that specific player
// throughout the entire run.
//
// Modifier shape (all optional):
//   awardMultipliers: { id: factor }
//     Multiplies award.points by factor (e.g. 1.5 = +50%).
//     id matches: morale / talent / data / clean / stack / funding /
//     bugcrush / lean_op / eng_exc / data_empire / full_funding
//
//   costModifiersByType: { TypeName: { resource: delta } }
//     Delta added to cost (negative = discount). Min clamped at 0.
//
//   costModifiersByCardId: { cardId: { resource: delta } }
//     Per-card override (e.g. Series A −1⏱).
//
//   effectMultipliersByType: { TypeName: { resource: factor } }
//     Multiplies effect by factor (rounded). Applied at play time.
//
//   effectBonusByType: { TypeName: { resource: amount } }
//     Additive bonus on effect at play time.
//
//   excludeCardTypes: [TypeName]    // HUMAN ONLY — filters pyramid pool
//   excludeCardIds:  [cardId]       // HUMAN ONLY — filters pyramid pool
//
//   startingBudget:    number   // delta on initial
//   startingTalento:   number
//   startingMorale:    number
//   startingPermanents: [permKey]
//
//   debtPenaltyOffset:    number   // shifts BALANCE.DEBT.Q_PENALTY_*
//   debtTempoLossOffset:  number   // shifts BALANCE.DEBT.TEMPO_LOSS_OFFSET
// =============================================================

const VISION_POOL = [
  {
    id: "founder_mode",
    icon: "🎯",
    name: "Founder Mode",
    description: "Lo show del fondatore. Squadra unita, finanze trascurate.",
    bonus: "+30% award Morale & Talent",
    malus: "−50% award Funding Diversity",
    modifiers: {
      // S9.1.d: 1.5 → 1.3 (era dominante con +50% su 12+12pt = +12pt netti)
      awardMultipliers: { morale: 1.3, talent: 1.3, funding: 0.5 },
    },
  },
  {
    id: "lean_startup",
    icon: "🌱",
    name: "Lean Startup",
    description: "Tolleranza al debt più alta, ma assumere costa di più.",
    bonus: "Tech Debt non penalizza fino a 3 (+1 soglia)",
    malus: "Hiring costa +1💰",
    modifiers: {
      debtPenaltyOffset: 1,    // threshold 3→4, offset 2→3
      debtTempoLossOffset: 1,  // tempo loss formula offset 2→3
      costModifiersByType: { Hiring: { budget: 1 } },
    },
  },
  {
    id: "growth_hacker",
    icon: "🚀",
    name: "Growth Hacker",
    description: "Marketing first, validazione dopo.",
    bonus: "Launch cards: +1K MAU bonus",
    malus: "Discovery cards costano +1⏱",
    modifiers: {
      effectBonusByType: { Launch: { vp: 1 } },
      costModifiersByType: { Discovery: { tempo: 1 } },
    },
  },
  {
    id: "tech_first",
    icon: "⚙️",
    name: "Tech First",
    description: "Foundation tooling > everything else.",
    bonus: "Tool cards costano −1💰",
    malus: "Funding cards: +1⏱ · Funding award −50%",
    modifiers: {
      costModifiersByType: {
        Tool: { budget: -1 },
        Funding: { tempo: 1 },
      },
      // S9.2: aggiunto malus secondario `awardMultipliers: funding 0.5`.
      // Math analysis: Tool −1💰 × 4 perms = −4💰 + facilita Tech Stack gold
      // (8pt). Senza counter-malus, era stimato +6-8K MAU advantage. Con
      // funding award halved (-2 to -4pt), net torna a ~+2-4K, allineato
      // alle altre Vision balanced.
      awardMultipliers: { funding: 0.5 },
    },
  },
  {
    id: "bootstrapped",
    icon: "💪",
    name: "Bootstrapped",
    description: "No VC. Network e team-building al posto dei round.",
    bonus: "Inizi +6💰 +1🧠 · Hiring −1💰 · Talent Pool award +30%",
    malus: "Nessuna carta Funding nel pool",
    modifiers: {
      // S9.2 full rework: era severely under-tier.
      // Math analysis pre-rework: -11 to -21K MAU vs +1-2K bonus = nettissimamente perdente.
      // Cambiata da "+4💰+1🧠" a archetipo "build the team, can't fundraise" coerente:
      //   - startingBudget 4→6 (+8💰 invece di -23💰 da Funding lost)
      //   - costModifiersByType Hiring -1💰 (alternative path: hire instead of fundraise)
      //   - awardMultipliers talent ×1.3 (premia il commitment al team)
      // Stima post-rework: +6-10K MAU bonus vs ~10-15K loss = ~-2 to +0 (borderline OK).
      startingBudget: 6,
      startingTalento: 1,
      costModifiersByType: { Hiring: { budget: -1 } },
      awardMultipliers: { talent: 1.3 },
      excludeCardTypes: ["Funding"],
    },
  },
  {
    id: "data_empire",
    icon: "📈",
    name: "Data Empire",
    description: "Decisioni guidate dai dati. Cultura analitica intensa.",
    bonus: "Inizi con Data Lake permanente",
    malus: "Morale base −3",
    modifiers: {
      startingPermanents: ["data_lake"],
      // S9.1.d: -2 → -3 (era recuperabile con 1 carta morale; ora richiede
      // commitment vero per non perdere bronze tier morale 5+)
      startingMorale: -3,
    },
  },
  {
    id: "b2b_veteran",
    icon: "💼",
    name: "B2B Veteran",
    description: "Enterprise sales. No mercato consumer.",
    bonus: "Series A & Ent. Deal −1⏱ · Funding +1K MAU · Funding award +30%",
    malus: "Niente Mobile App",
    modifiers: {
      costModifiersByCardId: {
        series_a: { tempo: -1 },
        ent_deal: { tempo: -1 },
      },
      effectBonusByType: { Funding: { vp: 1 } },
      // S9.2: il buff S9.1.d (+1 vp Funding) era insufficiente — math analysis
      // post-S9.1 stimava ancora -2 to -3K MAU vs perdita Mobile App (-6K).
      // Aggiunto award boost: Funding gold 8→10pt, Full Funding synergy 10→13pt.
      // Stima post-rework: +1 to +4K MAU (positivo, allineato alle altre).
      awardMultipliers: { funding: 1.3, full_funding: 1.3 },
      excludeCardIds: ["mobile_app"],
    },
  },
  {
    id: "viral_native",
    icon: "📣",
    name: "Viral Native",
    description: "Crescita virale a basso costo. Tooling minimo.",
    bonus: "Launch cards: +50% MAU",
    malus: "Tool cards costano +1⏱",
    modifiers: {
      effectMultipliersByType: { Launch: { vp: 1.5 } },
      costModifiersByType: { Tool: { tempo: 1 } },
    },
  },
];

function getVisionById(id) {
  return VISION_POOL.find(v => v.id === id) || null;
}

// AI subset: visions that don't filter the pool (those work only for human).
// The pool is shared, so AI visions with excludeCard* would yield bonus
// without the corresponding malus. Filter them out for AI selection.
function visionsForAI() {
  return VISION_POOL.filter(v =>
    !v.modifiers.excludeCardTypes && !v.modifiers.excludeCardIds
  );
}
