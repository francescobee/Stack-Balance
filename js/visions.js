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

  // ───────────────────────────────────────────────────────────
  // S18.2: VISION VARIANTS (v2) — earn-by-mastery
  // Each variant unlocks after the player has won 3 times with the base
  // Vision (profile.visionStats[baseId].wins >= 3). Variants are tematic
  // twists, not power inflation: stronger in a niche, harder elsewhere.
  // ───────────────────────────────────────────────────────────
  {
    id: "founder_mode_v2", baseId: "founder_mode",
    unlocksAfter: { visionId: "founder_mode", wins: 3 },
    icon: "🎯", name: "Founder Mode (v2)",
    description: "Il founder che ha già scalato. Inizia con CI/CD, sinergie boost.",
    bonus: "Inizi con CI/CD permanente · Synergy ×1.2",
    malus: "−50% award Funding (come v1)",
    modifiers: {
      awardMultipliers: { morale: 1.3, talent: 1.3, funding: 0.5,
        lean_op: 1.2, eng_exc: 1.2, data_empire: 1.2, full_funding: 1.2 },
      startingPermanents: ["ci_cd"],
    },
  },
  {
    id: "lean_startup_v2", baseId: "lean_startup",
    unlocksAfter: { visionId: "lean_startup", wins: 3 },
    icon: "🌱", name: "Lean Startup (v2)",
    description: "Maturata: BugFix bonus +1 MAU, debt threshold ulteriore.",
    bonus: "Tech Debt non penalizza fino a 4 (+2) · BugFix +1K MAU",
    malus: "Hiring +1💰 (come v1)",
    modifiers: {
      debtPenaltyOffset: 2,
      debtTempoLossOffset: 2,
      costModifiersByType: { Hiring: { budget: 1 } },
      effectBonusByType: { BugFix: { vp: 1 } },
    },
  },
  {
    id: "growth_hacker_v2", baseId: "growth_hacker",
    unlocksAfter: { visionId: "growth_hacker", wins: 3 },
    icon: "🚀", name: "Growth Hacker (v2)",
    description: "Maestro del growth: Launch +2K MAU, ma niente preseed.",
    bonus: "Launch cards: +2K MAU bonus",
    malus: "Discovery +1⏱ · Niente preseed",
    modifiers: {
      effectBonusByType: { Launch: { vp: 2 } },
      costModifiersByType: { Discovery: { tempo: 1 } },
      excludeCardIds: ["preseed"],
    },
  },
  {
    id: "tech_first_v2", baseId: "tech_first",
    unlocksAfter: { visionId: "tech_first", wins: 3 },
    icon: "⚙️", name: "Tech First (v2)",
    description: "Foundation tooling estremo: Tool −2💰 ma debt più aggressivo.",
    bonus: "Tool cards costano −2💰",
    malus: "Funding +1⏱ · Funding award −50% · Debt soglia −1",
    modifiers: {
      costModifiersByType: {
        Tool: { budget: -2 },
        Funding: { tempo: 1 },
      },
      awardMultipliers: { funding: 0.5 },
      debtPenaltyOffset: -1,    // più aggressivo del normale
    },
  },
  {
    id: "bootstrapped_v2", baseId: "bootstrapped",
    unlocksAfter: { visionId: "bootstrapped", wins: 3 },
    icon: "💪", name: "Bootstrapped (v2)",
    description: "Più estremo: niente Funding né Sabotage, ma +2🧠 e Hiring −2💰.",
    bonus: "+6💰 +2🧠 · Hiring −2💰 · Talent ×1.5",
    malus: "Niente Funding né Sabotage nel pool",
    modifiers: {
      startingBudget: 6,
      startingTalento: 2,
      costModifiersByType: { Hiring: { budget: -2 } },
      awardMultipliers: { talent: 1.5 },
      excludeCardTypes: ["Funding", "Sabotage"],
    },
  },
  {
    id: "data_empire_v2", baseId: "data_empire",
    unlocksAfter: { visionId: "data_empire", wins: 3 },
    icon: "📈", name: "Data Empire (v2)",
    description: "Inizi con Data Lake e Monitoring. Data dept ulteriore boost.",
    bonus: "Inizi con Data Lake + Monitoring · Data dept +1 dati per carta",
    malus: "Morale base −3 (come v1)",
    modifiers: {
      startingPermanents: ["data_lake", "monitoring"],
      startingMorale: -3,
      effectBonusByDept: { data: { dati: 1 } },
    },
  },
  {
    id: "b2b_veteran_v2", baseId: "b2b_veteran",
    unlocksAfter: { visionId: "b2b_veteran", wins: 3 },
    icon: "💼", name: "B2B Veteran (v2)",
    description: "Enterprise puro: Funding award doppio, ma più carte consumer escluse.",
    bonus: "Funding award ×2 · Series A/Ent Deal −1⏱ · Funding +2K MAU",
    malus: "Niente Mobile App né Viral Campaign",
    modifiers: {
      costModifiersByCardId: {
        series_a: { tempo: -1 },
        ent_deal: { tempo: -1 },
      },
      effectBonusByType: { Funding: { vp: 2 } },
      awardMultipliers: { funding: 2.0, full_funding: 1.5 },
      excludeCardIds: ["mobile_app", "viral_campaign"],
    },
  },
  {
    id: "viral_native_v2", baseId: "viral_native",
    unlocksAfter: { visionId: "viral_native", wins: 3 },
    icon: "📣", name: "Viral Native (v2)",
    description: "Hyper-viral: Launch ×2 MAU, ma costano più tempo.",
    bonus: "Launch cards: ×2 MAU",
    malus: "Launch +1⏱ · Tool +1⏱ (come v1)",
    modifiers: {
      effectMultipliersByType: { Launch: { vp: 2.0 } },
      costModifiersByType: { Launch: { tempo: 1 }, Tool: { tempo: 1 } },
    },
  },
];

function getVisionById(id) {
  return VISION_POOL.find(v => v.id === id) || null;
}

// AI subset: visions that don't filter the pool (those work only for human).
// The pool is shared, so AI visions with excludeCard* would yield bonus
// without the corresponding malus. Filter them out for AI selection.
// Variants (baseId set) are also excluded — AI sticks to base visions.
function visionsForAI() {
  return VISION_POOL.filter(v =>
    !v.baseId && !v.modifiers.excludeCardTypes && !v.modifiers.excludeCardIds
  );
}

// S18.2: returns the visions available to the human player given a profile.
// Each base vision is always returned. Each variant (v2) is annotated with
// `isLocked: true` and `winsNeeded: N` if not yet unlocked, otherwise marked
// `isUnlocked: true`. The draft modal can choose to filter by isLocked or
// show locked entries with a hint.
function getAvailableVisions(profile) {
  const visionStats = profile?.visionStats || {};
  return VISION_POOL.map(v => {
    if (!v.unlocksAfter) {
      return { ...v, isLocked: false, isUnlocked: true };
    }
    const required = v.unlocksAfter.wins || 1;
    const current = visionStats[v.unlocksAfter.visionId]?.wins || 0;
    const unlocked = current >= required;
    return {
      ...v,
      isLocked: !unlocked,
      isUnlocked: unlocked,
      winsNeeded: Math.max(0, required - current),
    };
  });
}

// Pool used for the human's vision draft. Variants only show up once unlocked.
function visionsForHumanDraft(profile) {
  return getAvailableVisions(profile).filter(v => !v.isLocked);
}
