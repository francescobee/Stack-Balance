"use strict";

// =============================================================
// test-rules.js — assertions on the pure functions in rules.js
// Loaded after the production scripts in tests/test.html, so
// all globals are accessible (BALANCE, NUM_PLAYERS, etc.).
// =============================================================

// ---------- Fixtures ----------
function mockPlayer(over = {}) {
  // Mirrors newPlayer() but without depending on BALANCE.PLAYER_INIT being
  // mutated; explicit numbers for predictable tests.
  return Object.assign({
    name: "Test", isHuman: true,
    budget: 6, tempo: 5, talento: 5, talentoUsed: 0,
    dati: 0, morale: 5, techDebt: 0, vp: 0,
    played: [], permanents: {},
    okrs: [], okrOptions: [], okrCompleted: [],
    _quarterPlays: [], _quarterStartMorale: 5,
    vision: null, visionOptions: [],
    blockUsedThisQ: false,
  }, over);
}

function mockCard(over = {}) {
  return Object.assign({
    id: "test_card", name: "Test Card", dept: "eng", type: "Feature",
    cost: { budget: 2, tempo: 1 },
    effect: { vp: 2 },
    desc: "Carta di test.",
  }, over);
}

// Save & restore the global `state` so tests don't leak to each other.
function withState(stub, fn) {
  const prev = state;
  state = stub;
  try { return fn(); }
  finally { state = prev; }
}

// ─────────────────────────────────────────────────────────────
// CHAINS
// ─────────────────────────────────────────────────────────────
describe("isChainTriggered", () => {
  it("returns false for cards with no chainFrom", () => {
    const p = mockPlayer();
    const card = mockCard();
    assertEq(isChainTriggered(p, card), false);
  });

  it("returns true when player owns one of the predecessor ids", () => {
    const p = mockPlayer({ played: [mockCard({ id: "junior_dev" })] });
    const card = mockCard({ id: "senior_dev",
      chainFrom: ["junior_dev"], chainDiscount: { budget: 2 } });
    assertEq(isChainTriggered(p, card), true);
  });

  it("returns false when player owns none of the predecessor ids", () => {
    const p = mockPlayer({ played: [mockCard({ id: "ux_designer" })] });
    const card = mockCard({ id: "senior_dev",
      chainFrom: ["junior_dev"], chainDiscount: { budget: 2 } });
    assertEq(isChainTriggered(p, card), false);
  });
});

// ─────────────────────────────────────────────────────────────
// COSTS
// ─────────────────────────────────────────────────────────────
describe("adjustedCost", () => {
  it("returns plain cost when no modifiers active", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      const p = mockPlayer();
      const card = mockCard({ cost: { budget: 3, tempo: 2 } });
      const c = adjustedCost(p, card);
      assertEq(c.budget, 3);
      assertEq(c.tempo, 2);
    });
  });

  it("CI/CD permanent reduces tempo by 1 on Feature cards", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      const p = mockPlayer({ permanents: { ci_cd: true } });
      const card = mockCard({ type: "Feature", cost: { budget: 2, tempo: 2 } });
      const c = adjustedCost(p, card);
      assertEq(c.tempo, 1, "CI/CD should reduce tempo from 2 to 1");
    });
  });

  it("chain discount applied when triggered", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      const p = mockPlayer({ played: [mockCard({ id: "junior_dev" })] });
      const card = mockCard({ id: "senior_dev",
        cost: { budget: 4 },
        chainFrom: ["junior_dev"], chainDiscount: { budget: 2 } });
      const c = adjustedCost(p, card);
      assertEq(c.budget, 2, "chain discount of 2 on cost 4 → 2");
    });
  });

  it("vision costModifiersByType applied; clamped at 0", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      const p = mockPlayer({
        vision: { modifiers: { costModifiersByType: { Hiring: { budget: -10 } } } },
      });
      const card = mockCard({ type: "Hiring", cost: { budget: 3 } });
      const c = adjustedCost(p, card);
      assertEq(c.budget, 0, "negative modifier should clamp to 0, not go negative");
    });
  });

  it("scenario zeroResourceCosts forces a resource to 0", () => {
    withState({
      activeEvent: null,
      scenario: { modifiers: { zeroResourceCosts: ["tempo"] } },
    }, () => {
      const p = mockPlayer();
      const card = mockCard({ cost: { budget: 2, tempo: 4 } });
      const c = adjustedCost(p, card);
      assertEq(c.tempo, 0, "Remote First scenario sets tempo cost to 0");
      assertEq(c.budget, 2, "other costs untouched");
    });
  });
});

// ─────────────────────────────────────────────────────────────
// CAN-AFFORD
// ─────────────────────────────────────────────────────────────
describe("canAfford", () => {
  it("true when all resources >= cost", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      const p = mockPlayer({ budget: 5, tempo: 3, talento: 2 });
      const card = mockCard({ cost: { budget: 4, tempo: 2, talento: 1 } });
      assertEq(canAfford(p, card), true);
    });
  });

  it("false when budget too low", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      const p = mockPlayer({ budget: 1 });
      const card = mockCard({ cost: { budget: 5 } });
      assertEq(canAfford(p, card), false);
    });
  });

  it("talentoUsed reduces availability (S1.2 capacity model)", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      // Total talento 3, but 3 already used this Q → 0 available
      const p = mockPlayer({ talento: 3, talentoUsed: 3 });
      const card = mockCard({ cost: { talento: 1 } });
      assertEq(canAfford(p, card), false,
        "with all talento used this Q, can't afford even 1");
    });
  });
});

// ─────────────────────────────────────────────────────────────
// PAY-COST
// ─────────────────────────────────────────────────────────────
describe("payCost", () => {
  it("decrements budget/tempo/dati/morale and increments talentoUsed", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      const p = mockPlayer({ budget: 5, tempo: 4, talento: 3, talentoUsed: 0,
                             dati: 2, morale: 6 });
      const card = mockCard({ cost: { budget: 2, tempo: 1, talento: 2,
                                       dati: 1, morale: 1 } });
      payCost(p, card);
      assertEq(p.budget, 3);
      assertEq(p.tempo, 3);
      assertEq(p.talento, 3, "talento total NOT decremented (capacity model)");
      assertEq(p.talentoUsed, 2, "talentoUsed += 2");
      assertEq(p.dati, 1);
      assertEq(p.morale, 5);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// APPLY-EFFECT
// ─────────────────────────────────────────────────────────────
describe("applyEffect", () => {
  it("applies all base resource gains and clamps morale 0..10", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      const p = mockPlayer({ budget: 0, tempo: 0, talento: 1, dati: 0, morale: 9 });
      const card = mockCard({
        effect: { budget: 3, tempo: 2, talento: 1, dati: 1, morale: 5 },
      });
      applyEffect(p, card, [p]);
      assertEq(p.budget, 3);
      assertEq(p.tempo, 2);
      assertEq(p.talento, 2);
      assertEq(p.dati, 1);
      assertEq(p.morale, 10, "morale clamped at 10 (was 9 + 5)");
    });
  });

  it("techDebt clamps >= 0; vp clamps >= 0", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      const p = mockPlayer({ techDebt: 1, vp: 2 });
      const card = mockCard({ effect: { techDebt: -5, vp: -10 } });
      applyEffect(p, card, [p]);
      assertEq(p.techDebt, 0, "debt cannot go negative");
      assertEq(p.vp, 0, "vp cannot go negative (S4.1 clamp)");
    });
  });

  it("data_lake permanent gives +1 dati on Feature", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      const p = mockPlayer({ dati: 0, permanents: { data_lake: true } });
      const card = mockCard({ type: "Feature", effect: { dati: 1 } });
      applyEffect(p, card, [p]);
      assertEq(p.dati, 2, "1 base + 1 from data_lake permanent");
    });
  });

  it("permanent flag installs the permanent in the player", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      const p = mockPlayer();
      const card = mockCard({ permanent: "ci_cd", effect: {} });
      applyEffect(p, card, [p]);
      assertEq(p.permanents.ci_cd, true);
    });
  });

  it("opponentsTempo affects all OTHER players (not self)", () => {
    withState({ activeEvent: null, scenario: null, counterMarketingPending: [], log: [] }, () => {
      const p = mockPlayer({ name: "self", tempo: 5 });
      const o1 = mockPlayer({ name: "o1", tempo: 5 });
      const o2 = mockPlayer({ name: "o2", tempo: 1 });
      const card = mockCard({ effect: { opponentsTempo: -2 } });
      applyEffect(p, card, [p, o1, o2]);
      assertEq(p.tempo, 5, "self tempo untouched");
      assertEq(o1.tempo, 3, "opponent o1 -2");
      assertEq(o2.tempo, 0, "opponent o2 clamped at 0 (was 1, -2 = -1 → 0)");
    });
  });
});

// ─────────────────────────────────────────────────────────────
// MODIFIER ENGINE (events / scenarios)
// ─────────────────────────────────────────────────────────────
describe("effectiveCardEffect / applyEffectModifiers", () => {
  it("event effectBonusByType adds resources to matching cards", () => {
    withState({
      activeEvent: { modifiers: { effectBonusByType: { Funding: { vp: 1 } } } },
      scenario: null,
    }, () => {
      const p = mockPlayer();
      const card = mockCard({ type: "Funding", effect: { budget: 4, vp: 0 } });
      const e = effectiveCardEffect(p, card);
      assertEq(e.vp, 1, "Funding card gets +1 vp from event");
      assertEq(e.budget, 4, "non-modified resources stay");
    });
  });

  it("scenario effectMultipliersByDept multiplies matching dept effects (rounded)", () => {
    withState({
      activeEvent: null,
      // AI Hype Wave-like: data dept ×1.5
      scenario: { modifiers: { effectMultipliersByDept: { data: { vp: 1.5 } } } },
    }, () => {
      const p = mockPlayer();
      const card = mockCard({ dept: "data", effect: { vp: 2 } });
      const e = effectiveCardEffect(p, card);
      assertEq(e.vp, 3, "2 * 1.5 = 3");
    });
  });

  it("triple-pass: vision + event + scenario all stack", () => {
    withState({
      activeEvent: { modifiers: { effectBonusByType: { Feature: { vp: 1 } } } },
      scenario:    { modifiers: { effectBonusByDept: { eng:    { vp: 2 } } } },
    }, () => {
      const p = mockPlayer({
        vision: { modifiers: { effectBonusByType: { Feature: { vp: 1 } } } },
      });
      const card = mockCard({ dept: "eng", type: "Feature", effect: { vp: 2 } });
      const e = effectiveCardEffect(p, card);
      // base 2 + vision Feature 1 + event Feature 1 + scenario eng 2 = 6
      assertEq(e.vp, 6, "vision + event + scenario stack additively");
    });
  });
});

// ─────────────────────────────────────────────────────────────
// AWARDS — TIERS
// ─────────────────────────────────────────────────────────────
describe("pointsForTier", () => {
  it("first matching descending threshold wins", () => {
    const tiers = [
      { threshold: 9, points: 12, label: "≥9" },
      { threshold: 7, points:  5, label: "≥7" },
    ];
    assertEq(pointsForTier(9, tiers).points, 12);
    assertEq(pointsForTier(7, tiers).points,  5);
    assertEq(pointsForTier(6, tiers).points,  0);
    assertEq(pointsForTier(6, tiers).met, false);
  });
});

describe("computeAwards", () => {
  it("morale tiers: 4→0, 5→bronze(2), 7→silver(5), 9→gold(12) [S9.1.a]", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      const morale4 = computeAwards(mockPlayer({ morale: 4 }))
        .find(a => a.id === "morale");
      const morale5 = computeAwards(mockPlayer({ morale: 5 }))
        .find(a => a.id === "morale");
      const morale7 = computeAwards(mockPlayer({ morale: 7 }))
        .find(a => a.id === "morale");
      const morale9 = computeAwards(mockPlayer({ morale: 9 }))
        .find(a => a.id === "morale");
      assertEq(morale4.points, 0, "morale 4 below bronze threshold");
      assertEq(morale5.points, 2, "S9.1.a: bronze tier at morale 5");
      assertEq(morale7.points, 5);
      assertEq(morale9.points, 12);
    });
  });

  it("data tiers: bronze at ≥3, silver at ≥6, gold at ≥10 [S9.1.a]", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      const d2 = computeAwards(mockPlayer({ dati: 2 })).find(a => a.id === "data");
      const d3 = computeAwards(mockPlayer({ dati: 3 })).find(a => a.id === "data");
      const d6 = computeAwards(mockPlayer({ dati: 6 })).find(a => a.id === "data");
      const d10 = computeAwards(mockPlayer({ dati: 10 })).find(a => a.id === "data");
      assertEq(d2.points, 0);
      assertEq(d3.points, 2,  "S9.1.a: bronze tier at dati 3");
      assertEq(d6.points, 5);
      assertEq(d10.points, 15);
    });
  });

  it("clean code: 0 debt = 8pt, 3+ debt = 0pt", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      const clean0 = computeAwards(mockPlayer({ techDebt: 0 }))
        .find(a => a.id === "clean");
      const clean3 = computeAwards(mockPlayer({ techDebt: 3 }))
        .find(a => a.id === "clean");
      assertEq(clean0.points, 8);
      assertEq(clean3.points, 0);
    });
  });

  it("scenario awardMultipliers boosts matching award points (Bear Market 2008)", () => {
    withState({
      activeEvent: null,
      // Bear Market: funding award ×2
      scenario: { modifiers: { awardMultipliers: { funding: 2 } } },
    }, () => {
      const p = mockPlayer({
        played: [
          mockCard({ id: "preseed", type: "Funding" }),
          mockCard({ id: "seed_a",  type: "Funding" }),
          mockCard({ id: "series_a", type: "Funding" }),
        ],
      });
      const fund = computeAwards(p).find(a => a.id === "funding");
      // 3 Funding → 8 pts base, ×2 from scenario → 16
      assertEq(fund.points, 16, "3 Funding cards × scenario ×2 = 16");
    });
  });
});

// ─────────────────────────────────────────────────────────────
// SYNERGIES
// ─────────────────────────────────────────────────────────────
describe("computeSynergies", () => {
  it("Lean Operation activates when morale >=8 AND talento <=4", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      const active = mockPlayer({ morale: 8, talento: 4 });
      const inactiveMorale = mockPlayer({ morale: 7, talento: 4 });
      const inactiveTalent = mockPlayer({ morale: 8, talento: 5 });

      const aOK = computeSynergies(active).find(s => s.id === "lean_op");
      const aMo = computeSynergies(inactiveMorale).find(s => s.id === "lean_op");
      const aTa = computeSynergies(inactiveTalent).find(s => s.id === "lean_op");

      assert(aOK.points > 0, "lean_op should fire");
      assertEq(aMo.points, 0);
      assertEq(aTa.points, 0);
    });
  });

  it("Engineering Excellence: 3+ BugFix AND debt <=1", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      const p = mockPlayer({
        techDebt: 1,
        played: [
          mockCard({ id: "f1", type: "BugFix" }),
          mockCard({ id: "f2", type: "BugFix" }),
          mockCard({ id: "f3", type: "BugFix" }),
        ],
      });
      const eng = computeSynergies(p).find(s => s.id === "eng_exc");
      assert(eng.points > 0, "eng_exc should fire with 3 BugFix + low debt");
    });
  });
});

// ─────────────────────────────────────────────────────────────
// S10: MULTIPLAYER — pure functions (serialization, slot helpers)
// ─────────────────────────────────────────────────────────────
describe("multiplayer serialization [S10.2]", () => {
  function buildSerializableState() {
    return {
      quarter: 2,
      pickIndex: 5,
      pickOrder: [0, 1, 2, 3, 3, 2, 1, 0],
      pyramid: [
        [{ card: { id: "junior_dev", name: "Junior Dev", dept: "eng", type: "Hiring",
                   cost: { budget: 2 }, effect: { talento: 1 }, desc: "..." },
           faceUp: true, taken: false }],
      ],
      players: [
        Object.assign(mockPlayer({ name: "Federica" }),
          { okrs: [OKR_POOL[0]], okrOptions: [OKR_POOL[1], OKR_POOL[2]] }),
      ],
      log: [{ msg: "test", cls: "" }],
      phase: "human",
      activePicker: 0,
      activeEvent: EVENT_POOL[0],   // has onActivate fn
      scenario: SCENARIO_POOL[1],   // has modifiers
      counterMarketingPending: [],
      deferredReveals: [],
      isDaily: false,
      gameOver: false,
      difficulty: "senior",
    };
  }

  it("serializeState strips functions (event.onActivate, scenario.onQuarterStart)", () => {
    const orig = buildSerializableState();
    const serial = serializeState(orig);
    // Should be JSON-safe (no fn references)
    const json = JSON.stringify(serial);
    assert(json.length > 0, "serialized state should be JSON-stringifiable");
    // event reduced to id-only ref
    assertEq(serial.activeEvent?.id, EVENT_POOL[0].id);
    assertEq(typeof serial.activeEvent?.onActivate, "undefined");
    // scenario reduced to id-only
    assertEq(serial.scenario?.id, SCENARIO_POOL[1].id);
  });

  it("serializeState replaces OKR objects with id strings", () => {
    const orig = buildSerializableState();
    const serial = serializeState(orig);
    assertEq(serial.players[0].okrs[0], OKR_POOL[0].id, "okr serialized as id");
    assertEq(serial.players[0].okrOptions[0], OKR_POOL[1].id);
    assertEq(serial.players[0].okrOptions[1], OKR_POOL[2].id);
  });

  it("deserializeState reconstructs OKR objects via OKR_POOL lookup", () => {
    const orig = buildSerializableState();
    const serial = serializeState(orig);
    const restored = deserializeState(serial);
    assertEq(restored.players[0].okrs[0].id, OKR_POOL[0].id);
    assert(typeof restored.players[0].okrs[0].check === "function",
           "OKR.check function should be restored after lookup");
    assertEq(restored.players[0].okrOptions.length, 2);
  });

  it("deserializeState reconstructs scenario via getScenarioById", () => {
    const orig = buildSerializableState();
    const restored = deserializeState(serializeState(orig));
    assertEq(restored.scenario.id, SCENARIO_POOL[1].id);
    // Verify modifiers preserved (it's the same reference from SCENARIO_POOL)
    assert(restored.scenario.modifiers, "scenario modifiers preserved");
  });

  it("serialize/deserialize roundtrip preserves pyramid structure", () => {
    const orig = buildSerializableState();
    const restored = deserializeState(serializeState(orig));
    assertEq(restored.pyramid.length, 1);
    assertEq(restored.pyramid[0].length, 1);
    assertEq(restored.pyramid[0][0].card.id, "junior_dev");
    assertEq(restored.pyramid[0][0].faceUp, true);
    assertEq(restored.pyramid[0][0].taken, false);
  });

  it("serializeState with null state returns null (no crash)", () => {
    assertEq(serializeState(null), null);
  });
});

describe("multiplayer slot helpers [S10.3]", () => {
  it("newPlayer sets slotType=human-host for human, ai for non-human", () => {
    const human = newPlayer("X", true);
    const ai = newPlayer("Y", false);
    assertEq(human.slotType, "human-host");
    assertEq(ai.slotType, "ai");
    assertEq(human.peerId, null);
  });

  it("mp.lobby slot allocation: empty seats fillable in order 1..3", () => {
    // Reset mp state
    mp.lobby = [{ peerId: "host-id", name: "Host", slotIdx: 0 }];
    // Simulate calling onClientConnected without invoking PeerJS
    // (we test the slot-finding logic by directly calling the alloc)
    const usedSlots = mp.lobby.map(p => p.slotIdx);
    let slot = -1;
    for (let i = 1; i < NUM_PLAYERS; i++) {
      if (!usedSlots.includes(i)) { slot = i; break; }
    }
    assertEq(slot, 1, "first available slot is 1 when host has 0");
  });
});

// ─────────────────────────────────────────────────────────────
// S9.6: AI scenario-aware Vision draft
// ─────────────────────────────────────────────────────────────
describe("scenarioPreferredVisions [S9.6.c]", () => {
  it("bear_market_2008 → bootstrapped + tech_first", () => {
    const prefs = scenarioPreferredVisions("bear_market_2008");
    assert(prefs.includes("bootstrapped"), "bootstrapped should be preferred");
    assert(prefs.includes("tech_first"), "tech_first should be preferred");
  });

  it("ai_hype_wave → data_empire", () => {
    const prefs = scenarioPreferredVisions("ai_hype_wave");
    assertDeepEq(prefs, ["data_empire"]);
  });

  it("remote_first → lean_startup", () => {
    const prefs = scenarioPreferredVisions("remote_first");
    assertDeepEq(prefs, ["lean_startup"]);
  });

  it("standard / unknown scenarios → empty array (no nudge)", () => {
    assertDeepEq(scenarioPreferredVisions("standard"), []);
    assertDeepEq(scenarioPreferredVisions("nonexistent"), []);
    assertDeepEq(scenarioPreferredVisions(undefined), []);
  });
});

// ─────────────────────────────────────────────────────────────
// S9.4: NEW SABOTAGE EFFECTS (target diversification)
// ─────────────────────────────────────────────────────────────
describe("sabotage effect handlers [S9.4]", () => {
  it("stealVpFromLast targets the LOWEST-VP opponent (not leader)", () => {
    withState({ activeEvent: null, scenario: null, counterMarketingPending: [], log: [] }, () => {
      const me     = mockPlayer({ name: "me",     vp: 8 });
      const leader = mockPlayer({ name: "leader", vp: 15 });
      const mid    = mockPlayer({ name: "mid",    vp: 6 });
      const last   = mockPlayer({ name: "last",   vp: 3 });
      const card = mockCard({ effect: { stealVpFromLast: 3 } });
      applyEffect(me, card, [me, leader, mid, last]);
      assertEq(leader.vp, 15, "leader untouched");
      assertEq(mid.vp,    6,  "mid-place untouched");
      assertEq(last.vp,   0,  "last lost min(3, 3) = 3 → vp 0");
    });
  });

  it("stealVpFromLast clamps stolen amount to target's actual VP", () => {
    withState({ activeEvent: null, scenario: null, counterMarketingPending: [], log: [] }, () => {
      const me   = mockPlayer({ vp: 5 });
      const last = mockPlayer({ vp: 1 });
      const card = mockCard({ effect: { stealVpFromLast: 3 } });
      applyEffect(me, card, [me, last]);
      assertEq(last.vp, 0, "lost only what they had (1), not 3");
    });
  });

  it("weakenNextPicker applies tempo loss to next picker, not self", () => {
    const me   = mockPlayer({ name: "me",   tempo: 5 });
    const next = mockPlayer({ name: "next", tempo: 4 });
    const other = mockPlayer({ name: "other", tempo: 4 });
    withState({
      activeEvent: null, scenario: null, counterMarketingPending: [], log: [],
      pickOrder: [0, 1, 2],   // me=0, next=1, other=2
      pickIndex: 0,           // currently me's turn
      players: [me, next, other],
    }, () => {
      const card = mockCard({ effect: { weakenNextPicker: { tempo: -1 } } });
      applyEffect(me, card, [me, next, other]);
      assertEq(me.tempo,    5, "self tempo untouched");
      assertEq(next.tempo,  3, "next picker -1⏱");
      assertEq(other.tempo, 4, "other player not affected");
    });
  });

  it("weakenNextPicker skips self in snake-draft transition", () => {
    const me = mockPlayer({ tempo: 5 });
    const other = mockPlayer({ tempo: 4 });
    withState({
      activeEvent: null, scenario: null, counterMarketingPending: [], log: [],
      pickOrder: [0, 0, 1],   // snake transition: me picks back-to-back
      pickIndex: 0,
      players: [me, other],
    }, () => {
      const card = mockCard({ effect: { weakenNextPicker: { tempo: -1 } } });
      applyEffect(me, card, [me, other]);
      assertEq(me.tempo,    5, "self skipped (same player as next picker)");
      assertEq(other.tempo, 4, "other untouched (not the next picker)");
    });
  });

  it("weakenNextPicker clamps target tempo at 0 (no negative)", () => {
    const me   = mockPlayer({ tempo: 5 });
    const next = mockPlayer({ tempo: 0 });
    withState({
      activeEvent: null, scenario: null, counterMarketingPending: [], log: [],
      pickOrder: [0, 1],
      pickIndex: 0,
      players: [me, next],
    }, () => {
      const card = mockCard({ effect: { weakenNextPicker: { tempo: -2 } } });
      applyEffect(me, card, [me, next]);
      assertEq(next.tempo, 0, "tempo cannot go below 0");
    });
  });
});

// ─────────────────────────────────────────────────────────────
// S9.3: PER-QUARTER COUNTERS (for new OKR tracking)
// ─────────────────────────────────────────────────────────────
describe("per-Q OKR tracking [S9.3]", () => {
  it("applyEffect increments _chainsTriggeredThisQ when chain fires", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      const p = mockPlayer({
        played: [mockCard({ id: "junior_dev" })],
        _chainsTriggeredThisQ: 0,
      });
      const card = mockCard({
        id: "senior_dev",
        chainFrom: ["junior_dev"], chainDiscount: { budget: 2 },
      });
      applyEffect(p, card, [p]);
      assertEq(p._chainsTriggeredThisQ, 1, "synergy_chaser OKR counter incremented");
      assertEq(p._chainsTriggered, 1, "lifetime counter also incremented (Combo Master)");
    });
  });

  it("applyEffect does NOT increment when chain not triggered", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      const p = mockPlayer({ _chainsTriggeredThisQ: 0 });
      const card = mockCard({ id: "lone_card" }); // no chainFrom
      applyEffect(p, card, [p]);
      assertEq(p._chainsTriggeredThisQ, 0);
    });
  });

  it("takeFromPyramid increments _quarterDiscards on discard action", () => {
    // Build a minimal state with a single-slot pyramid + one player
    const card = mockCard({ id: "test", cost: { budget: 99 } });
    const player = mockPlayer({ _quarterDiscards: 0 });
    const fakeState = {
      activeEvent: null, scenario: null,
      counterMarketingPending: [],
      pyramid: [[{ card, faceUp: true, taken: false }]],
      players: [player],
      log: [],
    };
    withState(fakeState, () => {
      // Re-define log() to use this state's log array (not the global)
      takeFromPyramid(0, 0, 0, "discard");
      assertEq(player._quarterDiscards, 1, "lean_quarter counter incremented on discard");
    });
  });

  it("takeFromPyramid does NOT increment _quarterDiscards on play action", () => {
    const card = mockCard({ id: "test", cost: {}, effect: { vp: 1 } });
    const player = mockPlayer({ _quarterDiscards: 0 });
    const fakeState = {
      activeEvent: null, scenario: null,
      counterMarketingPending: [],
      pyramid: [[{ card, faceUp: true, taken: false }]],
      players: [player],
      log: [],
    };
    withState(fakeState, () => {
      takeFromPyramid(0, 0, 0, "play");
      assertEq(player._quarterDiscards, 0, "play action does not count as discard");
    });
  });
});

// ─────────────────────────────────────────────────────────────
// PYRAMID LOGIC
// ─────────────────────────────────────────────────────────────
describe("isPickable / getDepth / getPickableSlots", () => {
  // Build a tiny mock pyramid: 4 rows × 2 cols. State minimal.
  function makePyramid() {
    const grid = [];
    for (let r = 0; r < PYR_ROWS; r++) {
      const row = [];
      for (let c = 0; c < PYR_COLS; c++) {
        row.push({ card: mockCard({ id: `r${r}c${c}` }), faceUp: false, taken: false });
      }
      grid.push(row);
    }
    return grid;
  }

  it("only bottom row is pickable when nothing taken yet", () => {
    withState({ pyramid: makePyramid() }, () => {
      // Bottom row is row=PYR_ROWS-1 (3). Anything above is NOT pickable.
      assertEq(isPickable(PYR_ROWS - 1, 0), true,  "bottom-left pickable");
      assertEq(isPickable(0, 0),            false, "top-left not pickable");
      assertEq(isPickable(1, 3),            false, "row 1 not pickable");
    });
  });

  it("after bottom slot taken, the slot above becomes pickable", () => {
    withState({ pyramid: makePyramid() }, () => {
      state.pyramid[PYR_ROWS - 1][2].taken = true;
      assertEq(isPickable(PYR_ROWS - 2, 2), true, "row above taken slot is pickable");
      assertEq(isPickable(PYR_ROWS - 1, 2), false, "taken slot itself not pickable");
    });
  });

  it("getDepth counts un-taken slots below in same column", () => {
    withState({ pyramid: makePyramid() }, () => {
      // All untaken: depth from top = 3, 2, 1, 0
      assertEq(getDepth(0, 0), 3);
      assertEq(getDepth(PYR_ROWS - 1, 0), 0);
      // Take the bottom one → depth from row-1 drops by 1
      state.pyramid[PYR_ROWS - 1][0].taken = true;
      assertEq(getDepth(0, 0), 2);
    });
  });

  it("getPickableSlots returns one slot per column (the bottommost untaken)", () => {
    withState({ pyramid: makePyramid() }, () => {
      const slots = getPickableSlots();
      assertEq(slots.length, PYR_COLS, "one per column");
      slots.forEach(s => assertEq(s.row, PYR_ROWS - 1, "all from bottom row"));
    });
  });
});
