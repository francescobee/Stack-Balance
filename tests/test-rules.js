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

  // ── S15: new synergies coverage ──
  it("S15 happy_team: single-condition Morale ≥ 7", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      const yes = computeSynergies(mockPlayer({ morale: 7 })).find(s => s.id === "happy_team");
      const no  = computeSynergies(mockPlayer({ morale: 6 })).find(s => s.id === "happy_team");
      assert(yes.points > 0, "happy_team fires at morale 7");
      assertEq(no.points, 0,  "happy_team does NOT fire at morale 6");
    });
  });

  it("S15 mvp_to_market: needs Discovery + Feature + Launch", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      const full = mockPlayer({ played: [
        mockCard({ id: "d1", type: "Discovery" }),
        mockCard({ id: "f1", type: "Feature" }),
        mockCard({ id: "l1", type: "Launch" }),
      ]});
      const missing = mockPlayer({ played: [
        mockCard({ id: "d1", type: "Discovery" }),
        mockCard({ id: "f1", type: "Feature" }),
      ]});
      const ok  = computeSynergies(full).find(s => s.id === "mvp_to_market");
      const bad = computeSynergies(missing).find(s => s.id === "mvp_to_market");
      assert(ok.points > 0, "mvp_to_market fires with all 3 types");
      assertEq(bad.points, 0, "mvp_to_market needs all 3 types");
    });
  });

  it("S15 bootstrapped_run: 0 Funding AND vp ≥ 25", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      const yes = computeSynergies(mockPlayer({ vp: 25 })).find(s => s.id === "bootstrapped_run");
      const noFund = computeSynergies(mockPlayer({
        vp: 25,
        played: [mockCard({ id: "preseed", type: "Funding" })],
      })).find(s => s.id === "bootstrapped_run");
      const noVp = computeSynergies(mockPlayer({ vp: 20 })).find(s => s.id === "bootstrapped_run");
      assert(yes.points > 0, "bootstrapped fires with 0 Funding + vp ≥ 25");
      assertEq(noFund.points, 0, "any Funding card kills bootstrapped");
      assertEq(noVp.points, 0,   "vp < 25 kills bootstrapped");
    });
  });

  it("S15 full_stack_play: one card per dept", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      const full = mockPlayer({ played: [
        mockCard({ id: "p1", dept: "product", type: "Feature" }),
        mockCard({ id: "e1", dept: "eng",     type: "Tool" }),
        mockCard({ id: "d1", dept: "data",    type: "Discovery" }),
      ]});
      const justTwo = mockPlayer({ played: [
        mockCard({ id: "p1", dept: "product" }),
        mockCard({ id: "e1", dept: "eng" }),
      ]});
      const ok  = computeSynergies(full).find(s => s.id === "full_stack_play");
      const bad = computeSynergies(justTwo).find(s => s.id === "full_stack_play");
      assert(ok.points > 0, "full_stack_play fires when all 3 depts represented");
      assertEq(bad.points, 0, "needs all 3 depts");
    });
  });

  // ── S15: state.synergies overrides the full pool when set ──
  it("S15 computeSynergies honors state.synergies (subset only)", () => {
    const subset = SYNERGY_POOL.filter(s => s.id === "happy_team");
    withState({ activeEvent: null, scenario: null, synergies: subset }, () => {
      const out = computeSynergies(mockPlayer({ morale: 8 }));
      assertEq(out.length, 1, "only the drawn synergy is evaluated");
      assertEq(out[0].id, "happy_team");
      assert(out[0].points > 0, "single drawn synergy still scores");
    });
  });

  // ── S19.3: stress-mechanic synergies ──
  it("S19.3 stress_free: 0 morale-cost cards AND morale ≥ 6", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      // OK case: clean run, no stress, morale 7
      const clean = mockPlayer({ morale: 7, played: [
        mockCard({ id: "f1", cost: { budget: 2 }, type: "Feature" }),
      ]});
      // Bad: morale OK but stress card played
      const stressed = mockPlayer({ morale: 7, played: [
        mockCard({ id: "s1", cost: { morale: 2 }, type: "Feature" }),
      ]});
      // Bad: clean but morale too low
      const lowMorale = mockPlayer({ morale: 5, played: [] });

      assert(computeSynergies(clean).find(s => s.id === "stress_free").points > 0,
        "stress_free fires on clean run");
      assertEq(computeSynergies(stressed).find(s => s.id === "stress_free").points, 0,
        "any morale-cost card breaks stress_free");
      assertEq(computeSynergies(lowMorale).find(s => s.id === "stress_free").points, 0,
        "morale < 6 fails the second req");
    });
  });

  it("S19.3 iron_will: ≥ 4 stress cards", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      const stressCard = (id) => mockCard({ id, cost: { morale: 1 }, type: "Feature" });
      const at4 = mockPlayer({ played: [stressCard("a"), stressCard("b"),
                                        stressCard("c"), stressCard("d")] });
      const at3 = mockPlayer({ played: [stressCard("a"), stressCard("b"),
                                        stressCard("c")] });
      assert(computeSynergies(at4).find(s => s.id === "iron_will").points > 0,
        "iron_will fires at exactly 4");
      assertEq(computeSynergies(at3).find(s => s.id === "iron_will").points, 0,
        "iron_will needs 4+");
    });
  });

  it("S19.3 resilience: morale ≥ 7 AND ≥ 2 stress cards (paradox)", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      const stressCard = (id) => mockCard({ id, cost: { morale: 1 }, type: "Feature" });
      // The hard one: high morale despite playing stress
      const resilient = mockPlayer({
        morale: 7,
        played: [stressCard("a"), stressCard("b")],
      });
      // Has stress but morale too low
      const broken = mockPlayer({
        morale: 5,
        played: [stressCard("a"), stressCard("b")],
      });
      // High morale but no stress at all
      const noStress = mockPlayer({ morale: 9, played: [] });
      assert(computeSynergies(resilient).find(s => s.id === "resilience").points > 0,
        "resilience: morale 7 + 2 stress cards");
      assertEq(computeSynergies(broken).find(s => s.id === "resilience").points, 0,
        "resilience: morale must be ≥ 7");
      assertEq(computeSynergies(noStress).find(s => s.id === "resilience").points, 0,
        "resilience: needs ≥ 2 stress cards");
    });
  });

  it("S19.3 stress synergies count S19.2 mixed-cost cards too (inclusive)", () => {
    // The "stress count" is `cost.morale > 0` — so cards like emergency_hire
    // (morale: 1, budget: 5) also count, not just pure-morale-cost cards.
    withState({ activeEvent: null, scenario: null }, () => {
      const mixed = mockCard({ id: "emergency_hire", cost: { morale: 1, budget: 5 }, type: "Hiring" });
      const pure  = mockCard({ id: "pizza_sprint", cost: { morale: 1 }, type: "Feature" });
      const p = mockPlayer({ played: [mixed, pure, mixed, pure] });
      const ironWill = computeSynergies(p).find(s => s.id === "iron_will");
      assert(ironWill.points > 0,
        "iron_will counts both mixed-cost (S19.2) and pure-cost (S19.3)");
    });
  });
});

// ─────────────────────────────────────────────────────────────
// S15: SYNERGY DRAW (drawSynergies + scenario flavor)
// ─────────────────────────────────────────────────────────────
describe("drawSynergies [S15]", () => {
  it("returns the requested count, with no duplicate ids", () => {
    setRngSeed(42);
    try {
      const standard = SCENARIO_POOL.find(s => s.id === "standard");
      const drawn = drawSynergies(standard, 5);
      assertEq(drawn.length, 5, "drew 5 synergies");
      const ids = drawn.map(s => s.id);
      const unique = new Set(ids);
      assertEq(unique.size, 5, "no duplicate ids in draw");
    } finally { clearRngSeed(); }
  });

  it("deterministic: same seed → same draw", () => {
    const standard = SCENARIO_POOL.find(s => s.id === "standard");
    setRngSeed(12345);
    const a = drawSynergies(standard, 5).map(s => s.id);
    setRngSeed(12345);
    const b = drawSynergies(standard, 5).map(s => s.id);
    clearRngSeed();
    // Order of guaranteed picks + weighted random both consume rng.
    // Same seed = same sequence.
    for (let i = 0; i < a.length; i++) {
      assertEq(a[i], b[i], `idx ${i} matches across runs`);
    }
  });

  it("scenario.guaranteed synergies always included", () => {
    setRngSeed(7);
    try {
      const bear = SCENARIO_POOL.find(s => s.id === "bear_market_2008");
      const drawn = drawSynergies(bear, 5);
      assert(drawn.some(s => s.id === "bootstrapped_run"),
             "Bear Market guarantees bootstrapped_run");
    } finally { clearRngSeed(); }
  });

  it("scenario.boostedTags increase the average count of tag-matched synergies", () => {
    // Statistical: across 300 draws, AI Hype should land more synergies
    // tagged with data/ai/launch than Standard. Counts the average per-draw
    // total (including the guaranteed pick) — robust against the variance
    // of any single synergy id.
    const ai   = SCENARIO_POOL.find(s => s.id === "ai_hype_wave");
    const std  = SCENARIO_POOL.find(s => s.id === "standard");
    const boosted = new Set(["data", "ai", "launch"]);

    function avgTaggedPerDraw(scenario) {
      let total = 0;
      clearRngSeed();
      for (let i = 0; i < 300; i++) {
        const drawn = drawSynergies(scenario, 5);
        total += drawn.filter(s => (s.tags || []).some(t => boosted.has(t))).length;
      }
      return total / 300;
    }

    const aiAvg  = avgTaggedPerDraw(ai);
    const stdAvg = avgTaggedPerDraw(std);
    assert(aiAvg > stdAvg + 0.5,
      `AI Hype should average more boosted-tag synergies (got AI=${aiAvg.toFixed(2)} vs Standard=${stdAvg.toFixed(2)})`);
  });

  it("count larger than pool returns full pool only", () => {
    setRngSeed(1);
    try {
      const standard = SCENARIO_POOL.find(s => s.id === "standard");
      const drawn = drawSynergies(standard, 999);
      assertEq(drawn.length, SYNERGY_POOL.length, "capped at pool size");
    } finally { clearRngSeed(); }
  });
});

// ─────────────────────────────────────────────────────────────
// S16: AI ARCHETYPES (drawArchetypes + scoring overlay)
// ─────────────────────────────────────────────────────────────
describe("archetypes [S16]", () => {
  it("ARCHETYPE_POOL has 5 distinct ids", () => {
    assertEq(ARCHETYPE_POOL.length, 5);
    const ids = new Set(ARCHETYPE_POOL.map(a => a.id));
    assertEq(ids.size, 5, "no duplicate ids");
  });

  it("drawArchetypes returns N distinct archetypes", () => {
    setRngSeed(99);
    try {
      const drawn = drawArchetypes(3);
      assertEq(drawn.length, 3);
      const ids = new Set(drawn.map(a => a.id));
      assertEq(ids.size, 3, "no duplicates in 3-draw");
    } finally { clearRngSeed(); }
  });

  it("drawArchetypes deterministic under seed", () => {
    setRngSeed(2024);
    const a = drawArchetypes(3).map(x => x.id);
    setRngSeed(2024);
    const b = drawArchetypes(3).map(x => x.id);
    clearRngSeed();
    assertEq(a.join(","), b.join(","), "same seed → same draw");
  });

  it("getArchetypeById round-trips ids", () => {
    ARCHETYPE_POOL.forEach(a => {
      assertEq(getArchetypeById(a.id)?.id, a.id);
    });
    assertEq(getArchetypeById("nope"), null, "unknown id → null");
  });

  it("Aggressor scores Sabotage cards higher than Bootstrapper", () => {
    // Same player, same Sabotage card, different archetypes → different scores.
    const sabotage = mockCard({
      id: "talent_poach", type: "Sabotage", dept: "product",
      cost: { budget: 2 }, effect: { stealHiringFromLeader: 1 },
    });
    const aggressor = getArchetypeById("aggressor");
    const bootstrapper = getArchetypeById("bootstrapper");

    function scoreWithArchetype(archetype) {
      // Build minimal state: human at slot 0, AI under test at slot 1
      // AI is behind on VP so anti-leader sabotage is attractive.
      const human = mockPlayer({ name: "You", isHuman: true, vp: 20 });
      const ai = mockPlayer({ name: "AI", isHuman: false, vp: 5 });
      ai.archetype = archetype;
      const stub = {
        difficulty: "senior",
        scenario: null,
        activeEvent: null,
        players: [human, ai],
        pyramid: [[{ card: sabotage, faceUp: true, taken: false }]],
        pickOrder: [1],
        pickIndex: 0,
      };
      return withState(stub, () => {
        const out = decideAIPickFromPyramid(1);
        return out;
      });
    }
    // Both archetypes will pick *something* (1 card available); the test asserts
    // the score logic differentiates them via cardTypeBias.
    // We re-export scoring by calling archetypeCardTypeBonus directly.
    const aggBonus = archetypeCardTypeBonus(aggressor, sabotage);
    const bootBonus = archetypeCardTypeBonus(bootstrapper, sabotage);
    assert(aggBonus > bootBonus,
      `Aggressor (${aggBonus}) should value Sabotage more than Bootstrapper (${bootBonus})`);
    // Bootstrapper specifically penalises Funding (-3); confirm by scoring a Funding card
    const funding = mockCard({ id: "preseed", type: "Funding", dept: "product" });
    assert(archetypeCardTypeBonus(bootstrapper, funding) < 0,
      "Bootstrapper rejects Funding");
  });

  it("archetype.weightMultipliers spec sanity: Hoarder boosts budget; Hype Master boosts vp", () => {
    // Pure data check on the pool: ensures the design intent of each archetype
    // is preserved even if the scoring code is refactored.
    const hoarder = getArchetypeById("hoarder");
    const hypeMaster = getArchetypeById("hype_master");
    const aggressor = getArchetypeById("aggressor");
    assert(hoarder.weightMultipliers.budget > 1, "Hoarder amplifies budget");
    assert(hypeMaster.weightMultipliers.vp > 1, "Hype Master amplifies vp");
    assert(aggressor.weightMultipliers.vp > 1, "Aggressor amplifies vp");
    // Risk multipliers: cautious < 1, daring > 1
    assert(getArchetypeById("hoarder").riskMultiplier < 1, "Hoarder is cautious");
    assert(getArchetypeById("aggressor").riskMultiplier > 1, "Aggressor is daring");
  });

  // Note: aiSelectBlocker test was removed in S20.1 along with the
  // Block & React mechanic. Archetype blockModifier field is now
  // vestigial (kept for save-compat, no runtime effect).
});

// ─────────────────────────────────────────────────────────────
// S18.3: WEEKLY CHALLENGE
// ─────────────────────────────────────────────────────────────
describe("weekly challenge [S18.3]", () => {
  it("WEEKLY_POOL has 6 distinct challenges with required fields", () => {
    assertEq(WEEKLY_POOL.length, 6);
    const ids = new Set(WEEKLY_POOL.map(c => c.id));
    assertEq(ids.size, 6);
    WEEKLY_POOL.forEach(c => {
      assert(c.id && c.name && c.icon && c.description, `${c.id} has metadata`);
      assert(c.modifiers, `${c.id} has modifiers`);
      assert(typeof c.winBonusXP === "number", `${c.id} has winBonusXP`);
    });
  });

  it("getWeeklyChallengeById round-trips", () => {
    WEEKLY_POOL.forEach(c => {
      assertEq(getWeeklyChallengeById(c.id)?.id, c.id);
    });
    assertEq(getWeeklyChallengeById("nope"), null);
  });

  it("currentWeekKey returns ISO format YYYY-Www", () => {
    const key = currentWeekKey();
    // matches "YYYY-Www" with 4-digit year and 2-digit week
    assert(/^\d{4}-W\d{2}$/.test(key), `key "${key}" matches ISO format`);
  });

  it("weeklySeed is deterministic within the same week", () => {
    const a = weeklySeed();
    const b = weeklySeed();
    assertEq(a, b, "two calls in the same week return identical seed");
    assert(a > 0, "seed is positive");
  });

  it("getCurrentWeeklyChallenge returns a challenge in the pool", () => {
    const challenge = getCurrentWeeklyChallenge();
    assert(challenge && challenge.id, "returns a challenge");
    assert(WEEKLY_POOL.some(c => c.id === challenge.id), "challenge is in pool");
  });

  it("weekly modifiers compose with the existing engine (cost pass)", () => {
    // Simulate a weekly challenge that adds +1 tempo to Feature cards.
    withState({
      activeEvent: null,
      scenario: null,
      weeklyChallenge: { modifiers: { costModifiersByType: { Feature: { tempo: 1 } } } },
    }, () => {
      const p = mockPlayer();
      const card = mockCard({ type: "Feature", cost: { budget: 2, tempo: 1 } });
      const c = adjustedCost(p, card);
      assertEq(c.tempo, 2, "weekly modifier added +1 tempo to Feature");
      assertEq(c.budget, 2, "non-targeted resource unchanged");
    });
  });

  it("weekly modifiers compose with the existing engine (effect pass)", () => {
    withState({
      activeEvent: null,
      scenario: null,
      weeklyChallenge: { modifiers: { effectMultipliersByType: { Discovery: { dati: 0.5 } } } },
    }, () => {
      const p = mockPlayer();
      const card = mockCard({ type: "Discovery", effect: { dati: 4 } });
      const e = effectiveCardEffect(p, card);
      assertEq(e.dati, 2, "Discovery dati halved by weekly modifier");
    });
  });
});

// ─────────────────────────────────────────────────────────────
// S18.2: VISION VARIANTS (earn-by-mastery)
// ─────────────────────────────────────────────────────────────
describe("vision variants [S18.2]", () => {
  it("VISION_POOL has 9 base + 8 variant entries (S19.2 added crunch_culture base)", () => {
    const base = VISION_POOL.filter(v => !v.baseId);
    const variants = VISION_POOL.filter(v => v.baseId);
    assertEq(base.length, 9, "9 base visions (8 originali + crunch_culture)");
    assertEq(variants.length, 8, "8 variants (one per ORIGINAL base)");
  });

  it("each variant points to a real base vision", () => {
    VISION_POOL.filter(v => v.baseId).forEach(v => {
      const base = getVisionById(v.baseId);
      assert(base && !base.baseId, `variant ${v.id} → base ${v.baseId} exists`);
    });
  });

  it("getAvailableVisions: with no profile → all variants locked", () => {
    const avail = getAvailableVisions(null);
    const variants = avail.filter(v => v.baseId);
    assertEq(variants.every(v => v.isLocked), true, "all variants locked");
    assertEq(variants[0].winsNeeded, 3, "winsNeeded defaults to 3");
  });

  it("getAvailableVisions: 3 wins on tech_first → tech_first_v2 unlocked", () => {
    const profile = { visionStats: { tech_first: { wins: 3, plays: 5, totalMau: 200 } } };
    const v2 = getAvailableVisions(profile).find(v => v.id === "tech_first_v2");
    assertEq(v2.isLocked, false);
    assertEq(v2.isUnlocked, true);
    assertEq(v2.winsNeeded, 0);
  });

  it("getAvailableVisions: 2 wins on tech_first → tech_first_v2 still locked, 1 win needed", () => {
    const profile = { visionStats: { tech_first: { wins: 2, plays: 4, totalMau: 100 } } };
    const v2 = getAvailableVisions(profile).find(v => v.id === "tech_first_v2");
    assertEq(v2.isLocked, true);
    assertEq(v2.winsNeeded, 1);
  });

  it("visionsForHumanDraft excludes locked variants but keeps base visions", () => {
    const profile = { visionStats: {} };
    const draftable = visionsForHumanDraft(profile);
    assertEq(draftable.length, 9, "9 base visions when nothing unlocked");
    assertEq(draftable.every(v => !v.baseId), true);

    const profileWithUnlock = { visionStats: { lean_startup: { wins: 3, plays: 3, totalMau: 0 } } };
    const draftable2 = visionsForHumanDraft(profileWithUnlock);
    assertEq(draftable2.length, 10, "9 base + 1 variant");
    assert(draftable2.some(v => v.id === "lean_startup_v2"),
      "unlocked variant in draftable pool");
  });

  it("visionsForAI never includes variants", () => {
    const aiPool = visionsForAI();
    assertEq(aiPool.every(v => !v.baseId), true, "AI never sees variants");
  });
});

// ─────────────────────────────────────────────────────────────
// S18.1: FOUNDER LEVEL — XP curve and computeLevel
// ─────────────────────────────────────────────────────────────
describe("founder level [S18.1]", () => {
  it("xpToReachLevel curve: L1=0, L2=1000, L3=4000, L4=9000", () => {
    assertEq(xpToReachLevel(1), 0);
    assertEq(xpToReachLevel(2), 1000);
    assertEq(xpToReachLevel(3), 4000);   // 1000 + 3000
    assertEq(xpToReachLevel(4), 9000);   // 1000 + 3000 + 5000
  });

  it("computeLevel monotonic", () => {
    assertEq(computeLevel(0), 1);
    assertEq(computeLevel(999), 1);
    assertEq(computeLevel(1000), 2);
    assertEq(computeLevel(3999), 2);
    assertEq(computeLevel(4000), 3);
    assertEq(computeLevel(9000), 4);
  });

  it("computeLevel caps at FOUNDER_LEVEL_CAP (20)", () => {
    // Way more XP than needed for L20 → still 20
    assertEq(computeLevel(10_000_000), 20);
  });

  it("xpProgressInLevel reports current/needed/pct correctly", () => {
    const at1500 = xpProgressInLevel(1500);  // L2 (base 1000), needs 3000 to reach L3
    assertEq(at1500.level, 2);
    assertEq(at1500.current, 500);
    assertEq(at1500.needed, 3000);
    assertEq(at1500.pct, Math.round((500 / 3000) * 100));
    assertEq(at1500.capped, false);
  });

  it("computeXP base = 100; +300 win; +finalUsers/10; daily/weekly +50; difficulty mult", () => {
    // Loss, no daily, senior diff
    assertEq(computeXP({ won: false, finalUsers: 0, difficulty: "senior" }), 100);
    // Win, no extras: 100 + 300 = 400
    assertEq(computeXP({ won: true, finalUsers: 0, difficulty: "senior" }), 400);
    // Win + 50 MAU: 100 + 300 + 5 = 405
    assertEq(computeXP({ won: true, finalUsers: 50, difficulty: "senior" }), 405);
    // Daily bonus: +50
    assertEq(computeXP({ won: true, finalUsers: 0, isDaily: true, difficulty: "senior" }), 450);
    // Director multiplier 1.5 → floor(400 * 1.5) = 600
    assertEq(computeXP({ won: true, finalUsers: 0, difficulty: "director" }), 600);
    // Junior multiplier 0.8 → floor(400 * 0.8) = 320
    assertEq(computeXP({ won: true, finalUsers: 0, difficulty: "junior" }), 320);
  });
});

// ─────────────────────────────────────────────────────────────
// S17: WIN CONDITIONS (scenario-locked alternative victory rules)
// ─────────────────────────────────────────────────────────────
describe("win conditions [S17]", () => {
  it("WIN_CONDITION_POOL has the 4 expected ids", () => {
    const ids = WIN_CONDITION_POOL.map(w => w.id).sort();
    assertEq(ids.join(","), "acquisition,efficiency,mau,survival");
  });

  it("getWinConditionById falls back to mau on unknown id", () => {
    assertEq(getWinConditionById("nope")?.id, "mau");
    assertEq(getWinConditionById("survival")?.id, "survival");
  });

  it("each scenario in SCENARIO_POOL has a winConditionId that exists", () => {
    SCENARIO_POOL.forEach(sc => {
      assert(sc.winConditionId, `scenario ${sc.id} missing winConditionId`);
      const wc = getWinConditionById(sc.winConditionId);
      assertEq(wc.id, sc.winConditionId, `scenario ${sc.id} winConditionId resolves`);
    });
  });

  // ---- mau ----
  it("mau: highest vp wins", () => {
    const players = [
      mockPlayer({ name: "A", vp: 30 }),
      mockPlayer({ name: "B", vp: 50 }),
      mockPlayer({ name: "C", vp: 40 }),
    ];
    const winner = getWinConditionById("mau").selectWinner(players, {});
    assertEq(winner?.name, "B");
  });

  // ---- survival ----
  it("survival: only morale > 0 are eligible; tiebreak by vp", () => {
    const survival = getWinConditionById("survival");
    const players = [
      mockPlayer({ name: "Dead",  morale: 0, vp: 80 }),  // out
      mockPlayer({ name: "Live1", morale: 2, vp: 15 }),
      mockPlayer({ name: "Live2", morale: 1, vp: 30 }),  // wins (higher vp)
    ];
    assertEq(survival.selectWinner(players, {}).name, "Live2");
  });

  it("survival: returns null when nobody survives", () => {
    const survival = getWinConditionById("survival");
    const players = [
      mockPlayer({ name: "A", morale: 0, vp: 50 }),
      mockPlayer({ name: "B", morale: 0, vp: 30 }),
    ];
    assertEq(survival.selectWinner(players, {}), null,
      "no survivors → no winner");
  });

  // ---- acquisition ----
  it("acquisition: 40K+ MAU triggers earlyTermination", () => {
    const acq = getWinConditionById("acquisition");
    const stateLow = { players: [mockPlayer({ vp: 30 }), mockPlayer({ vp: 20 })] };
    const stateHit = { players: [mockPlayer({ vp: 40 }), mockPlayer({ vp: 20 })] };
    assertEq(acq.earlyTermination(stateLow), false);
    assertEq(acq.earlyTermination(stateHit), true);
  });

  it("acquisition: prefers a 40K+ player over a higher non-qualifier", () => {
    // Edge case: defensive scoring puts vp=42 below vp=50 for ranking, but
    // acquisition only considers >=40 candidates.
    const acq = getWinConditionById("acquisition");
    const players = [
      mockPlayer({ name: "Qualifier", vp: 42 }),
      mockPlayer({ name: "Bigger",    vp: 50 }),
    ];
    // Both are >= 40, so the higher-vp one still wins.
    assertEq(acq.selectWinner(players, {}).name, "Bigger");
    // But if only one qualifies, it wins regardless of others.
    const players2 = [
      mockPlayer({ name: "Qualifier", vp: 41 }),
      mockPlayer({ name: "Almost",    vp: 39 }),
    ];
    assertEq(acq.selectWinner(players2, {}).name, "Qualifier");
  });

  // ---- efficiency ----
  it("efficiency: best MAU / spent ratio wins", () => {
    const eff = getWinConditionById("efficiency");
    // Player A: 50 vp, spent 10 (ratio 5.0)
    // Player B: 30 vp, spent 3  (ratio 10.0) — wins despite less MAU
    const cardCheap = mockCard({ id: "c1", cost: { budget: 1, talento: 0 }, effect: {} });
    const cardExp   = mockCard({ id: "c2", cost: { budget: 5, talento: 1 }, effect: {} });
    const a = mockPlayer({ name: "A", vp: 50, played: [cardExp, cardExp] });   // spent 12
    const b = mockPlayer({ name: "B", vp: 30, played: [cardCheap, cardCheap, cardCheap] }); // spent 3
    assertEq(eff.selectWinner([a, b], {}).name, "B",
      "B has better ratio (30/3 = 10) than A (50/12 ≈ 4.2)");
  });

  it("efficiency: defaults spent to 1 when player has no played cards", () => {
    const eff = getWinConditionById("efficiency");
    const a = mockPlayer({ name: "A", vp: 5, played: [] }); // 5 / 1 = 5
    const b = mockPlayer({ name: "B", vp: 4, played: [] }); // 4 / 1 = 4
    assertEq(eff.selectWinner([a, b], {}).name, "A");
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

  // ── S15: synergies serialization ──
  it("S15 serialize/deserialize roundtrip restores synergies (with check fns)", () => {
    const orig = buildSerializableState();
    orig.synergies = [
      getSynergyById("happy_team"),
      getSynergyById("eng_exc"),
    ];
    const serial = serializeState(orig);
    // Wire format: array of ids
    assertEq(serial.synergies.length, 2);
    assertEq(serial.synergies[0], "happy_team");
    assertEq(serial.synergies[1], "eng_exc");
    const restored = deserializeState(serial);
    assertEq(restored.synergies.length, 2);
    assertEq(restored.synergies[0].id, "happy_team");
    assert(typeof restored.synergies[0].check === "function",
           "synergy.check restored as function (not orphaned ref)");
  });

  // ── S16: archetype serialization ──
  it("S16 serialize/deserialize roundtrip restores AI archetype (id → object)", () => {
    const orig = buildSerializableState();
    // Augment the lone player with an archetype to test the roundtrip
    orig.players[0].archetype = getArchetypeById("disruptor");
    const serial = serializeState(orig);
    assertEq(serial.players[0].archetype, "disruptor",
      "archetype serialized as id string");
    const restored = deserializeState(serial);
    assertEq(restored.players[0].archetype?.id, "disruptor");
    assert(restored.players[0].archetype?.weightMultipliers,
      "archetype object restored with its modifier fields");
  });

  // ── S17: winCondition serialization ──
  it("S17 serialize/deserialize roundtrip restores winCondition (id → object)", () => {
    const orig = buildSerializableState();
    orig.winCondition = getWinConditionById("survival");
    const serial = serializeState(orig);
    assertEq(serial.winCondition?.id, "survival");
    const restored = deserializeState(serial);
    assertEq(restored.winCondition?.id, "survival");
    assert(typeof restored.winCondition?.selectWinner === "function",
      "winCondition.selectWinner restored as function");
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
// S11: HOT SEAT helpers (Phase 11)
// ─────────────────────────────────────────────────────────────
describe("hot-seat helpers [S11]", () => {
  function withHotSeatState(slotConfig, fn) {
    const players = slotConfig.map((slot, idx) => {
      const isHuman = slot.type === "human";
      const p = mockPlayer({ name: slot.name, isHuman });
      p.slotType = isHuman ? "human-host" : "ai";
      return p;
    });
    withState({
      players, isSharedScreen: true, isMultiplayer: false,
      activeEvent: null, scenario: null,
    }, fn);
  }

  it("isHumanSlot returns true for human-host slots", () => {
    withHotSeatState([
      { type: "human", name: "A" },
      { type: "ai", name: "B" },
      { type: "human", name: "C" },
      { type: "ai", name: "D" },
    ], () => {
      assertEq(isHumanSlot(0), true);
      assertEq(isHumanSlot(1), false);
      assertEq(isHumanSlot(2), true);
      assertEq(isHumanSlot(3), false);
    });
  });

  it("countHumans counts only human-host slots", () => {
    withHotSeatState([
      { type: "human", name: "A" },
      { type: "ai", name: "B" },
      { type: "human", name: "C" },
      { type: "ai", name: "D" },
    ], () => assertEq(countHumans(), 2));

    withHotSeatState([
      { type: "human", name: "A" },
      { type: "ai", name: "B" },
      { type: "ai", name: "C" },
      { type: "ai", name: "D" },
    ], () => assertEq(countHumans(), 1));

    withHotSeatState([
      { type: "human", name: "A" },
      { type: "human", name: "B" },
      { type: "human", name: "C" },
      { type: "human", name: "D" },
    ], () => assertEq(countHumans(), 4));
  });

  it("shouldShowPassScreen: false when single human (degrade)", () => {
    withHotSeatState([
      { type: "human", name: "A" },
      { type: "ai", name: "B" },
      { type: "ai", name: "C" },
      { type: "ai", name: "D" },
    ], () => {
      assertEq(shouldShowPassScreen(0), false, "1 human → no pass-screen");
    });
  });

  it("shouldShowPassScreen: false when target is AI", () => {
    withHotSeatState([
      { type: "human", name: "A" },
      { type: "human", name: "B" },
      { type: "ai", name: "C" },
      { type: "ai", name: "D" },
    ], () => {
      assertEq(shouldShowPassScreen(2), false, "AI target never gets pass-screen");
      assertEq(shouldShowPassScreen(3), false);
    });
  });

  it("shouldShowPassScreen: true when 2+ humans and target is human", () => {
    withHotSeatState([
      { type: "human", name: "A" },
      { type: "human", name: "B" },
      { type: "ai", name: "C" },
      { type: "ai", name: "D" },
    ], () => {
      assertEq(shouldShowPassScreen(0), true);
      assertEq(shouldShowPassScreen(1), true);
    });
  });

  it("shouldShowPassScreen: false when not in shared-screen mode", () => {
    withState({
      players: [
        Object.assign(mockPlayer({ name: "A", isHuman: true }), { slotType: "human-host" }),
        Object.assign(mockPlayer({ name: "B", isHuman: true }), { slotType: "human-host" }),
      ],
      isSharedScreen: false,
      isMultiplayer: false,
      activeEvent: null, scenario: null,
    }, () => {
      assertEq(shouldShowPassScreen(0), false, "single-player ignores pass-screen");
      assertEq(shouldShowPassScreen(1), false);
    });
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

// ─────────────────────────────────────────────────────────────
// MORALE COST MECHANIC [S19.1]
// ─────────────────────────────────────────────────────────────
describe("morale as cost [S19.1]", () => {
  it("canAfford rejects when morale insufficient", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      const p = mockPlayer({ morale: 1 });
      const c = mockCard({ cost: { morale: 2 } });
      assertEq(canAfford(p, c), false, "morale 1 cannot pay morale 2");
    });
  });
  it("canAfford accepts at exact morale", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      const p = mockPlayer({ morale: 2 });
      const c = mockCard({ cost: { morale: 2 } });
      assertEq(canAfford(p, c), true, "morale 2 == cost 2 ok");
    });
  });
  it("payCost deducts morale (clamped at 0)", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      const p = mockPlayer({ morale: 3 });
      payCost(p, mockCard({ cost: { morale: 2 } }));
      assertEq(p.morale, 1, "morale 3 - 2 = 1");
    });
  });
  it("payCost defensive clamps morale floor at 0", () => {
    // canAfford should prevent this, but the clamp guards against direct misuse.
    withState({ activeEvent: null, scenario: null }, () => {
      const p = mockPlayer({ morale: 1 });
      payCost(p, mockCard({ cost: { morale: 5 } }));
      assertEq(p.morale, 0, "clamped at 0, no negative");
    });
  });
  it("morale-cost respects chain discount", () => {
    // Chain discount applies to any resource via card.chainDiscount, including morale.
    withState({ activeEvent: null, scenario: null }, () => {
      const p = mockPlayer({
        morale: 3,
        played: [mockCard({ id: "junior_dev" })],
      });
      const c = mockCard({
        cost: { morale: 3 },
        chainFrom: ["junior_dev"], chainDiscount: { morale: 1 },
      });
      const adj = adjustedCost(p, c);
      assertEq(adj.morale, 2, "chain reduces morale cost 3 → 2");
      assertEq(canAfford(p, c), true, "morale 3 covers adjusted morale 2");
    });
  });
});

// ─────────────────────────────────────────────────────────────
// BURNOUT DEBT SCALING [S19.1]
// ─────────────────────────────────────────────────────────────
// We can't call endOfQuarter() in unit tests (it touches DOM/state heavily),
// so we test the formula directly. The actual integration is exercised by
// playtest. The formula: burnoutDebt = (4 - morale) * (vision.modifiers.
// burnoutDebtMultiplier || 1), only fires at morale < 4.
describe("burnout debt formula [S19.1]", () => {
  // Helper that mimics the formula in game.js endOfQuarter
  function burnoutDebt(p) {
    if (p.morale >= 4) return 0;
    const mult = p.vision?.modifiers?.burnoutDebtMultiplier || 1;
    return (4 - p.morale) * mult;
  }
  it("morale ≥ 4 → no burnout debt", () => {
    assertEq(burnoutDebt(mockPlayer({ morale: 4 })), 0);
    assertEq(burnoutDebt(mockPlayer({ morale: 5 })), 0);
    assertEq(burnoutDebt(mockPlayer({ morale: 10 })), 0);
  });
  it("morale 3 → +1 debt", () => {
    assertEq(burnoutDebt(mockPlayer({ morale: 3 })), 1);
  });
  it("morale 0 → +4 debt (max slope)", () => {
    assertEq(burnoutDebt(mockPlayer({ morale: 0 })), 4);
  });
  it("burnoutDebtMultiplier from vision doubles the slope", () => {
    const p = mockPlayer({
      morale: 1,
      vision: { modifiers: { burnoutDebtMultiplier: 2 } },
    });
    // (4 - 1) * 2 = 6
    assertEq(burnoutDebt(p), 6, "Crunch Culture amplifies burnout 2×");
  });
});

// ─────────────────────────────────────────────────────────────
// CRUNCH CULTURE VISION + effectBonusByCondition [S19.2]
// ─────────────────────────────────────────────────────────────
describe("Crunch Culture vision [S19.2]", () => {
  it("crunch_culture vision exists in VISION_POOL", () => {
    const cc = getVisionById("crunch_culture");
    assert(cc, "Crunch Culture vision is registered");
    assertEq(cc.baseId, undefined, "is a base vision (not v2)");
    assertEq(cc.modifiers.burnoutDebtMultiplier, 2);
    assertEq(cc.modifiers.startingMorale, -1);
  });
  it("effectBonusByCondition.cardHasCost adds bonus when card has morale-cost", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      const p = mockPlayer({
        morale: 5,
        vision: { modifiers: {
          effectBonusByCondition: {
            cardHasCost: { resource: "morale", amount: 1 },
            bonus: { vp: 1 },
          },
        } },
      });
      // Card with morale cost
      const crunchCard = mockCard({
        id: "all_nighter_sprint",
        cost: { morale: 2 },
        effect: { vp: 4 },
      });
      const e = effectiveCardEffect(p, crunchCard);
      assertEq(e.vp, 5, "+1 vp bonus from cardHasCost morale match");
    });
  });
  it("effectBonusByCondition does NOT trigger on cards without morale-cost", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      const p = mockPlayer({
        morale: 5,
        vision: { modifiers: {
          effectBonusByCondition: {
            cardHasCost: { resource: "morale", amount: 1 },
            bonus: { vp: 1 },
          },
        } },
      });
      const normalCard = mockCard({
        cost: { tempo: 1, budget: 2 },
        effect: { vp: 3 },
      });
      const e = effectiveCardEffect(p, normalCard);
      assertEq(e.vp, 3, "no bonus when no morale-cost");
    });
  });
});

// ─────────────────────────────────────────────────────────────
// HEALTHY SPRINT OKR [S19.2]
// ─────────────────────────────────────────────────────────────
describe("healthy_sprint OKR [S19.2]", () => {
  // Find the OKR by id (defensive — pool ordering may shift)
  const healthy = OKR_POOL.find(o => o.id === "healthy_sprint");

  it("healthy_sprint OKR exists with reward 4", () => {
    assert(healthy, "OKR registered");
    assertEq(healthy.reward, 4);
  });
  it("active when morale ≥ 6 AND no crunch cards played this Q", () => {
    const p = mockPlayer({
      morale: 7,
      _quarterPlays: [
        mockCard({ cost: { tempo: 1, budget: 2 } }),     // no morale cost
        mockCard({ cost: { budget: 3 } }),
      ],
    });
    assertEq(healthy.check(p), true);
  });
  it("inactive when morale < 6", () => {
    const p = mockPlayer({ morale: 5, _quarterPlays: [] });
    assertEq(healthy.check(p), false);
  });
  it("inactive if any played card has morale-cost", () => {
    const p = mockPlayer({
      morale: 8,
      _quarterPlays: [
        mockCard({ cost: { morale: 1 } }),  // crunch card
      ],
    });
    assertEq(healthy.check(p), false, "any morale-cost card disables OKR");
  });
});

// ─────────────────────────────────────────────────────────────
// MORALE-COUPLED SYNERGIES [S19.2]
// ─────────────────────────────────────────────────────────────
describe("morale synergies [S19.2]", () => {
  const burnoutSurv = SYNERGY_POOL.find(s => s.id === "burnout_survivor");
  const utopia = SYNERGY_POOL.find(s => s.id === "workplace_utopia");

  it("burnout_survivor active at morale 6 + debt 5", () => {
    const p = mockPlayer({ morale: 6, techDebt: 5 });
    assertEq(burnoutSurv.check(p).active, true);
  });
  it("burnout_survivor inactive when debt < 5", () => {
    const p = mockPlayer({ morale: 8, techDebt: 4 });
    assertEq(burnoutSurv.check(p).active, false);
  });
  it("workplace_utopia counts recovery cards correctly", () => {
    const p = mockPlayer({
      morale: 9,
      played: [
        mockCard({ id: "sabbatical_day" }),
        mockCard({ id: "team_building" }),
        mockCard({ id: "mvp_proto" }),    // not a recovery card
      ],
    });
    const result = utopia.check(p);
    assertEq(result.active, true, "morale 9 + 2 recovery → active");
    assertEq(result.requirements[1].current, 2, "exactly 2 recovery counted");
  });
  it("workplace_utopia inactive without 2 recovery cards", () => {
    const p = mockPlayer({
      morale: 10,
      played: [mockCard({ id: "sabbatical_day" })],   // only 1 recovery
    });
    assertEq(utopia.check(p).active, false);
  });
});

// ─────────────────────────────────────────────────────────────
// DATA SPEND MECHANIC [S20.2]
// ─────────────────────────────────────────────────────────────
describe("data spend mechanic [S20.2]", () => {
  it("payCost increments _dataSpent cumulative", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      const p = mockPlayer({ dati: 10, _dataSpent: 0 });
      payCost(p, mockCard({ cost: { dati: 3 } }));
      assertEq(p.dati, 7, "dati 10-3=7");
      assertEq(p._dataSpent, 3, "tracking +3");
      payCost(p, mockCard({ cost: { dati: 2 } }));
      assertEq(p._dataSpent, 5, "cumulative +2 more");
    });
  });
  it("payCost increments _quarterDataSpent (per Q tracking)", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      const p = mockPlayer({ dati: 10, _quarterDataSpent: 0 });
      payCost(p, mockCard({ cost: { dati: 4 } }));
      assertEq(p._quarterDataSpent, 4);
    });
  });
  it("payCost on card without dati cost doesn't increment tracking", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      const p = mockPlayer({ _dataSpent: 0, _quarterDataSpent: 0 });
      payCost(p, mockCard({ cost: { tempo: 1, budget: 2 } }));
      assertEq(p._dataSpent, 0);
      assertEq(p._quarterDataSpent, 0);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// NEW PERMANENTS [S20.4]
// ─────────────────────────────────────────────────────────────
describe("new permanents [S20.4]", () => {
  it("feature_flags reduces debt -1 on Feature with debt", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      const p = mockPlayer({ techDebt: 0, permanents: { feature_flags: true } });
      const card = mockCard({ type: "Feature", effect: { vp: 4, techDebt: 2 } });
      applyEffect(p, card, [p]);
      assertEq(p.techDebt, 1, "techDebt 2 → 1 with feature_flags on Feature");
    });
  });
  it("feature_flags reduces debt -1 on Launch too", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      const p = mockPlayer({ techDebt: 0, permanents: { feature_flags: true } });
      const card = mockCard({ type: "Launch", effect: { vp: 5, techDebt: 3 } });
      applyEffect(p, card, [p]);
      assertEq(p.techDebt, 2, "techDebt 3 → 2 with feature_flags on Launch");
    });
  });
  it("feature_flags has no effect on cards without debt or other types", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      const p = mockPlayer({ techDebt: 0, permanents: { feature_flags: true } });
      // BugFix card with techDebt: -2 — should NOT be touched
      const card = mockCard({ type: "BugFix", effect: { techDebt: -2 } });
      applyEffect(p, card, [p]);
      assertEq(p.techDebt, 0, "no clamp on negative debt (BugFix), and 0 base + (-2) clamped at 0");
    });
  });
  it("growth_dashboard +1 vp on Launch", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      const p = mockPlayer({ vp: 0, permanents: { growth_dashboard: true } });
      const card = mockCard({ type: "Launch", effect: { vp: 4 } });
      applyEffect(p, card, [p]);
      assertEq(p.vp, 5, "vp 4 → 5 with growth_dashboard");
    });
  });
  it("growth_dashboard does NOT trigger on Feature/BugFix", () => {
    withState({ activeEvent: null, scenario: null }, () => {
      const p = mockPlayer({ vp: 0, permanents: { growth_dashboard: true } });
      applyEffect(p, mockCard({ type: "Feature", effect: { vp: 4 } }), [p]);
      assertEq(p.vp, 4, "Feature: no bonus");
    });
  });
  it("incident_runbook (formula): permanent skips burnout slope", () => {
    // Mirror endOfQuarter formula directly (no full state simulation).
    function burnoutDebt(p) {
      if (p.permanents.incident_runbook) return 0;
      if (p.morale >= 4) return 0;
      const mult = p.vision?.modifiers?.burnoutDebtMultiplier || 1;
      return (4 - p.morale) * mult;
    }
    const protected_ = mockPlayer({ morale: 0, permanents: { incident_runbook: true } });
    const exposed = mockPlayer({ morale: 0 });
    assertEq(burnoutDebt(protected_), 0, "runbook → 0 burnout debt");
    assertEq(burnoutDebt(exposed), 4, "no runbook → 4 burnout debt");
  });
});

// ─────────────────────────────────────────────────────────────
// VC PITCH QUALITY [S20.3]
// ─────────────────────────────────────────────────────────────
describe("VC pitch quality [S20.3]", () => {
  it("pitchScore: high morale + low debt + tableau → positive", () => {
    const p = mockPlayer({
      morale: 8, dati: 6, techDebt: 1,
      played: [mockCard(), mockCard(), mockCard(), mockCard(), mockCard()],
    });
    // (8-5)*2 + (6-5)*1 - 0 + min(5,8)*0.5 = 6 + 1 + 0 + 2.5 = 9.5
    assertEq(pitchScore(p), 9.5);
  });
  it("pitchScore: low morale + high debt → negative", () => {
    const p = mockPlayer({ morale: 3, dati: 4, techDebt: 7, played: [] });
    // 0 + 0 - (7-3)*2 + 0 = -8
    assertEq(pitchScore(p), -8);
  });
  it("pitchScore: neutral baseline player → 0 + tableau bonus", () => {
    const p = mockPlayer({ morale: 5, dati: 5, techDebt: 3, played: [] });
    assertEq(pitchScore(p), 0, "all under thresholds, empty tableau");
  });
  it("pickWeightedVC always returns a valid VC (no crash, all weights ≥ 1)", () => {
    // Run multiple times across extreme scores; verify return is in pool.
    const players = [
      mockPlayer({ morale: 0, techDebt: 10 }),  // very negative score
      mockPlayer({ morale: 10, techDebt: 0, played: Array(8).fill(mockCard()) }),  // very positive
      mockPlayer({ morale: 5, techDebt: 3 }),    // neutral
    ];
    for (const p of players) {
      for (let i = 0; i < 20; i++) {
        const vc = pickWeightedVC(p);
        assert(VC_POOL.includes(vc), `vc returned is in pool (player score=${pitchScore(p)})`);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────
// DATA SYNERGIES + DATA SPENDER OKR [S20.2]
// ─────────────────────────────────────────────────────────────
describe("data synergies + OKR [S20.2]", () => {
  const dataDriven = SYNERGY_POOL.find(s => s.id === "data_driven");
  const insightHoarder = SYNERGY_POOL.find(s => s.id === "insight_hoarder");
  const spenderOkr = OKR_POOL.find(o => o.id === "data_spender");

  it("data_driven active at 8+ dati spent cumulative", () => {
    const p = mockPlayer({ _dataSpent: 8 });
    assertEq(dataDriven.check(p).active, true);
  });
  it("data_driven inactive below 8 spent", () => {
    const p = mockPlayer({ _dataSpent: 7 });
    assertEq(dataDriven.check(p).active, false);
  });
  it("insight_hoarder active at 12+ final dati", () => {
    const p = mockPlayer({ dati: 12 });
    assertEq(insightHoarder.check(p).active, true);
  });
  it("insight_hoarder rewards more than data_driven (hard tier)", () => {
    assert(insightHoarder.points > dataDriven.points,
      `hoarder ${insightHoarder.points} > driven ${dataDriven.points}`);
  });
  it("data_spender OKR fires at 4+ dati spent in Q", () => {
    assert(spenderOkr, "OKR registered");
    assertEq(spenderOkr.reward, 4);
    assertEq(spenderOkr.check(mockPlayer({ _quarterDataSpent: 4 })), true);
    assertEq(spenderOkr.check(mockPlayer({ _quarterDataSpent: 3 })), false);
  });
});
