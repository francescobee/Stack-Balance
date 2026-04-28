"use strict";

// =============================================================
// rules.js — costs, effects, chains, awards, pyramid logic
// =============================================================

// ---------- CHAINS ----------
function isChainTriggered(player, card) {
  if (!card.chainFrom || !card.chainDiscount) return false;
  const owned = new Set(player.played.map(pc => pc.id));
  return card.chainFrom.some(id => owned.has(id));
}

// ---------- COSTS / EFFECTS ----------
// S4.1+S6.1: shared modifier application — used by Vision (player-scoped),
// Market Events (Q-scoped), and Scenarios (game-scoped).
function applyCostModifiers(c, card, modifiers) {
  if (!modifiers) return;
  const typeMod = modifiers.costModifiersByType?.[card.type];
  if (typeMod) {
    Object.keys(typeMod).forEach(k => {
      c[k] = Math.max(0, (c[k] || 0) + typeMod[k]);
    });
  }
  const idMod = modifiers.costModifiersByCardId?.[card.id];
  if (idMod) {
    Object.keys(idMod).forEach(k => {
      c[k] = Math.max(0, (c[k] || 0) + idMod[k]);
    });
  }
  // S6.1: scenario can zero out specific resource costs globally
  if (modifiers.zeroResourceCosts) {
    modifiers.zeroResourceCosts.forEach(k => { c[k] = 0; });
  }
}

function adjustedCost(player, card) {
  const c = { ...(card.cost || {}) };
  // CI/CD permanent: -1 tempo on Feature/Launch
  if (player.permanents.ci_cd && (card.type === "Feature" || card.type === "Launch") && c.tempo) {
    c.tempo = Math.max(0, c.tempo - 1);
  }
  // Chain discount
  if (isChainTriggered(player, card)) {
    Object.keys(card.chainDiscount).forEach(k => {
      c[k] = Math.max(0, (c[k] || 0) - card.chainDiscount[k]);
    });
  }
  // S2.3: Vision cost modifiers (per player)
  applyCostModifiers(c, card, player.vision?.modifiers);
  // S4.1: Market Event cost modifiers (per Q)
  applyCostModifiers(c, card, state?.activeEvent?.modifiers);
  // S6.1: Scenario cost modifiers (whole game)
  applyCostModifiers(c, card, state?.scenario?.modifiers);
  return c;
}

function canAfford(player, card) {
  const c = adjustedCost(player, card);
  // S1.2: talento è capacità fisica per Q — disponibile = totale - usato
  const talentoAvailable = (player.talento || 0) - (player.talentoUsed || 0);
  return (player.budget >= (c.budget || 0))
    && (player.tempo >= (c.tempo || 0))
    && (talentoAvailable >= (c.talento || 0))
    && (player.dati >= (c.dati || 0))
    && (player.morale >= (c.morale || 0));
}

function payCost(player, card) {
  const c = adjustedCost(player, card);
  player.budget -= (c.budget || 0);
  player.tempo  -= (c.tempo  || 0);
  // S1.2: il talento usato si accumula per Q (resettato a inizio Q)
  player.talentoUsed = (player.talentoUsed || 0) + (c.talento || 0);
  player.dati   -= (c.dati   || 0);
  player.morale -= (c.morale || 0);
}

// S4.1+S6.1: shared effect-modifier application. Supports type/cardId/dept keys.
function applyEffectModifiers(e, card, modifiers) {
  if (!modifiers) return;
  const mults = modifiers.effectMultipliersByType?.[card.type];
  if (mults) Object.keys(mults).forEach(k => {
    if (e[k] != null) e[k] = Math.round(e[k] * mults[k]);
  });
  // S6.1: per-dept multiplier (for AI Hype Wave scenario boosting data dept)
  const deptMults = modifiers.effectMultipliersByDept?.[card.dept];
  if (deptMults) Object.keys(deptMults).forEach(k => {
    if (e[k] != null) e[k] = Math.round(e[k] * deptMults[k]);
  });
  const typeBonus = modifiers.effectBonusByType?.[card.type];
  if (typeBonus) Object.keys(typeBonus).forEach(k => {
    e[k] = (e[k] || 0) + typeBonus[k];
  });
  const idBonus = modifiers.effectBonusByCardId?.[card.id];
  if (idBonus) Object.keys(idBonus).forEach(k => {
    e[k] = (e[k] || 0) + idBonus[k];
  });
  const deptBonus = modifiers.effectBonusByDept?.[card.dept];
  if (deptBonus) Object.keys(deptBonus).forEach(k => {
    e[k] = (e[k] || 0) + deptBonus[k];
  });
}

// S4.1+S6.1: compute the effective effect after Vision + Event + Scenario modifiers
function effectiveCardEffect(player, card) {
  const e = { ...(card.effect || {}) };
  applyEffectModifiers(e, card, player.vision?.modifiers);
  applyEffectModifiers(e, card, state?.activeEvent?.modifiers);
  applyEffectModifiers(e, card, state?.scenario?.modifiers);
  return e;
}

// S6.1: clamp player stats according to scenario.statCaps (e.g. Remote First max 3 talento)
function applyScenarioStatCaps(player) {
  const caps = state?.scenario?.modifiers?.statCaps;
  if (!caps) return;
  Object.entries(caps).forEach(([stat, max]) => {
    if (player[stat] != null && player[stat] > max) player[stat] = max;
  });
}

function applyEffect(player, card, allPlayers) {
  // S2.3+S4.1+S6.1: clone effect and apply Vision + Event + Scenario modifiers
  const e = { ...(card.effect || {}) };
  applyEffectModifiers(e, card, player.vision?.modifiers);
  applyEffectModifiers(e, card, state?.activeEvent?.modifiers);
  applyEffectModifiers(e, card, state?.scenario?.modifiers);

  // S3.1: Counter-Marketing reaction — if this is a Launch by an opponent
  // of someone who played Counter-Marketing earlier, neutralise the MAU gain.
  if (card.type === "Launch" && state?.counterMarketingPending?.length > 0) {
    const queue = state.counterMarketingPending;
    const idx = queue.findIndex(p => p !== player);
    if (idx >= 0) {
      const counterer = queue[idx];
      queue.splice(idx, 1);
      e.vp = 0;
      log(`${counterer.name} contro-marketing su ${card.name} (Launch annullato)`,
          counterer.isHuman ? "you" : "");
      if (typeof showToast === "function") {
        showToast({ who: `${counterer.name} BLOCKS`, what: `<em>${card.name}</em> annullato`, kind: "sabotage" });
      }
    }
  }

  player.budget  += (e.budget  || 0);
  player.tempo   += (e.tempo   || 0);
  player.talento += (e.talento || 0);
  let dataGain = (e.dati || 0);
  if (player.permanents.data_lake && (card.type === "Feature" || card.type === "Launch" || card.type === "Discovery")) dataGain += 1;
  player.dati += dataGain;
  let moraleGain = (e.morale || 0);
  if (player.permanents.design_system && card.type === "Hiring") moraleGain += 1;
  player.morale = clamp(player.morale + moraleGain, 0, 10);
  player.techDebt = Math.max(0, player.techDebt + (e.techDebt || 0));
  // S4.1: VP can now decrease via event modifiers (e.g. VC Drought -1) — clamp ≥ 0
  player.vp = Math.max(0, player.vp + (e.vp || 0));
  if (e.opponentsTempo) {
    allPlayers.forEach(o => {
      if (o !== player) o.tempo = Math.max(0, o.tempo + e.opponentsTempo);
    });
  }
  if (card.permanent) player.permanents[card.permanent] = true;

  // ── S3.1: Sabotage card effects (target opponents) ──
  applySabotageEffects(player, e, allPlayers);

  // ── S6.1: Scenario stat caps (e.g. Remote First max 3 talento) ──
  applyScenarioStatCaps(player);

  // ── S6.2: Track chain triggers per player for "Combo Master" achievement ──
  // ── S9.3: anche per-Q (synergy_chaser OKR) ──
  if (isChainTriggered(player, card)) {
    player._chainsTriggered = (player._chainsTriggered || 0) + 1;
    player._chainsTriggeredThisQ = (player._chainsTriggeredThisQ || 0) + 1;
  }
}

// S3.1: Sabotage effects — extracted for clarity. Mutates opponents.
function applySabotageEffects(player, e, allPlayers) {
  const others = allPlayers.filter(p => p !== player);
  if (others.length === 0) return;

  // Helper: leader = opponent with highest VP (ties → first)
  function leader() {
    return others.reduce((best, p) => (p.vp > (best?.vp ?? -1)) ? p : best, null);
  }

  // Talent Poach — steal random Hiring from leader's bacheca
  if (e.stealHiringFromLeader) {
    const target = leader();
    if (target) {
      const hirings = target.played.filter(c => c.type === "Hiring");
      if (hirings.length > 0) {
        const stolen = hirings[Math.floor(Math.random() * hirings.length)];
        target.played = target.played.filter(c => c !== stolen);
        target.talento = Math.max(0, target.talento - 1);
        player.played.push(stolen);
        player.talento += 1;
        log(`${player.name} ruba "${stolen.name}" a ${target.name}`,
            player.isHuman ? "you" : "");
        if (typeof showToast === "function") {
          showToast({
            who: `${player.name} POACHES`,
            what: `<em>${stolen.name}</em> da ${target.name}`,
            kind: "sabotage"
          });
        }
      }
    }
  }

  // Patent Lawsuit — random of top-2 Feature/Launch producers loses MAU
  // S9.4: era "most features" (deterministico → spesso colpiva il leader,
  //       contribuendo al dogpile). Ora pesca random dai top-2 → meno
  //       prevedibile, distribuisce il danno tra leader e #2.
  if (e.targetMostFeatures) {
    const ranked = others
      .map(p => ({ p, count: p.played.filter(c => c.type === "Feature" || c.type === "Launch").length }))
      .filter(x => x.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 2);
    if (ranked.length > 0) {
      const target = pickRandom(ranked, 1)[0].p;
      const oldVp = target.vp;
      target.vp = Math.max(0, target.vp + e.targetMostFeatures);
      const lost = oldVp - target.vp;
      log(`${player.name} cita ${target.name}: -${lost}K utenti`,
          player.isHuman ? "you" : "");
      if (typeof showToast === "function") {
        showToast({
          who: `${player.name} SUES`,
          what: `${target.name} perde <em>${lost}K MAU</em>`,
          kind: "sabotage"
        });
      }
    }
  }

  // Negative Press — leader loses morale
  if (e.targetLeaderMorale) {
    const target = leader();
    if (target) {
      const oldMorale = target.morale;
      target.morale = clamp(target.morale + e.targetLeaderMorale, 0, 10);
      const lost = oldMorale - target.morale;
      log(`${player.name} attacca PR a ${target.name}: -${lost} Morale`,
          player.isHuman ? "you" : "");
      if (typeof showToast === "function") {
        showToast({
          who: `${player.name} TRASHES`,
          what: `${target.name} perde <em>${lost} Morale</em>`,
          kind: "sabotage"
        });
      }
    }
  }

  // Counter-Marketing prepared — queue this player to react to next Launch
  if (e.cancelNextLaunch) {
    state.counterMarketingPending = state.counterMarketingPending || [];
    state.counterMarketingPending.push(player);
    log(`${player.name} prepara Counter-Marketing`, player.isHuman ? "you" : "");
  }

  // S9.4 — Hostile Takeover: target last-place opponent (not leader)
  // Counter-balance al "tutte le sabotage colpiscono il leader" → riduce
  // il dogpile-effect dando un counterweight (chi è già dietro paga ancora).
  // Tematicamente: i "big" che mangiano i "piccoli" — narrativa M&A.
  if (e.stealVpFromLast) {
    const target = others.reduce(
      (worst, p) => (p.vp < (worst?.vp ?? Infinity)) ? p : worst,
      null
    );
    if (target) {
      const lost = Math.min(e.stealVpFromLast, target.vp);
      target.vp = Math.max(0, target.vp - lost);
      log(`${player.name} acquisisce: ${target.name} −${lost}K utenti`,
          player.isHuman ? "you" : "");
      if (typeof showToast === "function") {
        showToast({
          who: `${player.name} ACQUIRES`,
          what: `${target.name} perde <em>${lost}K MAU</em>`,
          kind: "sabotage"
        });
      }
    }
  }

  // S9.4 — Industry Whisper: -1⏱ subito al next picker (kingmaker effect)
  // Originalmente roadmap diceva "next Q" ma sabotage sono in Q3 (no next
  // Q). Cambiata semantica a "subito" per coerenza Q3-only e immediatezza
  // del feedback. Skip se next picker è il player stesso (snake transition).
  if (e.weakenNextPicker && state?.pickOrder) {
    const nextIdx = state.pickOrder[state.pickIndex + 1];
    if (nextIdx != null) {
      const target = state.players[nextIdx];
      if (target && target !== player) {
        const tempoMod = e.weakenNextPicker.tempo || 0;
        const oldTempo = target.tempo;
        target.tempo = Math.max(0, target.tempo + tempoMod);
        const lost = oldTempo - target.tempo;
        log(`${player.name} sussurra: ${target.name} −${lost}⏱`,
            player.isHuman ? "you" : "");
        if (typeof showToast === "function") {
          showToast({
            who: `${player.name} WHISPERS`,
            what: `${target.name} perde <em>${lost}⏱</em>`,
            kind: "sabotage"
          });
        }
      }
    }
  }
}

// ---------- AWARDS (end-game scoring) ----------
// All thresholds live in BALANCE.AWARDS — see balance.js.
// Awards have shape: { icon, id, name, points, detail, tier, [requirements?, isSynergy?] }
// `tier`: "gold" | "silver" | "bronze" | "none" (drives forecast UI styling)

// Helper: given a value and an array of {threshold, points, label} (DESC),
// return the points/label/threshold met (first match wins), else 0/needed.
function pointsForTier(value, tiers) {
  for (const t of tiers) {
    if (value >= t.threshold) return { points: t.points, label: t.label, met: true };
  }
  const lowest = tiers[tiers.length - 1];
  return { points: 0, label: `need ≥${lowest.threshold}`, met: false };
}

function tierClass(points, gold, silver) {
  if (points >= gold) return "gold";
  if (points >= silver) return "silver";
  if (points > 0) return "bronze";
  return "none";
}

function computeAwards(p) {
  const A = BALANCE.AWARDS;
  const awards = [];

  // ── Tier-based stat awards (S2.2: was linear) ──
  const morale = pointsForTier(p.morale, A.MORALE_TIERS);
  awards.push({
    icon: "🚀", id: "morale", name: "Team Motivato",
    points: morale.points,
    detail: morale.met ? `Morale ${p.morale} → ${morale.label}` : `Morale ${p.morale} · ${morale.label}`,
    tier: tierClass(morale.points, 12, 5),
  });

  const talent = pointsForTier(p.talento, A.TALENT_TIERS);
  awards.push({
    icon: "🧠", id: "talent", name: "Talent Pool",
    points: talent.points,
    detail: talent.met ? `Talento ${p.talento} → ${talent.label}` : `Talento ${p.talento} · ${talent.label}`,
    tier: tierClass(talent.points, 12, 5),
  });

  const data = pointsForTier(p.dati, A.DATA_TIERS);
  awards.push({
    icon: "📊", id: "data", name: "Data-Driven",
    points: data.points,
    detail: data.met ? `Dati ${p.dati} → ${data.label}` : `Dati ${p.dati} · ${data.label}`,
    tier: tierClass(data.points, 15, 5),
  });

  // ── Existing threshold awards ──
  const cleanPts = A.CLEAN_CODE[p.techDebt] || 0;
  awards.push({
    icon: "✨", id: "clean", name: "Clean Code",
    points: cleanPts,
    detail: p.techDebt <= 2 ? `${p.techDebt} Tech Debt` : `Tech Debt 3+ · need ≤2`,
    tier: tierClass(cleanPts, 8, 5),
  });

  const tools = Object.keys(p.permanents).length;
  const toolPts = A.TECH_STACK[tools] || (tools > 4 ? A.TECH_STACK[4] : 0);
  awards.push({
    icon: "🛠", id: "stack", name: "Tech Stack",
    points: toolPts,
    detail: tools >= 2 ? `${tools} Tool` : `${tools} Tool · need ≥2`,
    tier: tierClass(toolPts, 8, 4),
  });

  // ── Funding/BugFix tier awards (S2.2: was linear count × 2) ──
  const fundCount = p.played.filter(c => c.type === "Funding").length;
  const fund = pointsForTier(fundCount, A.FUNDING_TIERS);
  awards.push({
    icon: "💼", id: "funding", name: "Funding Diversity",
    points: fund.points,
    detail: fund.met ? `${fundCount} round → ${fund.label}` : `${fundCount} round · ${fund.label}`,
    tier: tierClass(fund.points, 8, 3),
  });

  const bugCount = p.played.filter(c => c.type === "BugFix").length;
  const bug = pointsForTier(bugCount, A.BUGFIX_TIERS);
  awards.push({
    icon: "🐞", id: "bugcrush", name: "Bug Crusher",
    points: bug.points,
    detail: bug.met ? `${bugCount} fix → ${bug.label}` : `${bugCount} fix · ${bug.label}`,
    tier: tierClass(bug.points, 8, 3),
  });

  // ── Synergy awards (S2.2) ──
  awards.push(...computeSynergies(p));

  // ── S2.3: Vision award multipliers (apply last, after all bases computed) ──
  const vm = p.vision?.modifiers?.awardMultipliers;
  if (vm) {
    awards.forEach(a => {
      const mult = vm[a.id];
      if (mult != null && a.points > 0) {
        a.points = Math.round(a.points * mult);
      }
    });
  }

  // ── S6.1: Scenario award multipliers (e.g. Bear Market 2008 doubles funding) ──
  const sm = state?.scenario?.modifiers?.awardMultipliers;
  if (sm) {
    awards.forEach(a => {
      const mult = sm[a.id];
      if (mult != null && a.points > 0) {
        a.points = Math.round(a.points * mult);
      }
    });
  }

  return awards;
}

// S2.2: synergy = multi-condition, all-or-nothing reward. Returns one award
// per synergy with `requirements: [{label, current, target, met}]` for UI.
function computeSynergies(p) {
  const S = BALANCE.AWARDS.SYNERGIES;
  const out = [];

  // 1. Lean Operation: high morale ∧ low talent
  {
    const reqs = [
      { label: `Morale ≥ ${S.LEAN_OP.MORALE_MIN}`,
        current: p.morale,  target: S.LEAN_OP.MORALE_MIN,
        met: p.morale >= S.LEAN_OP.MORALE_MIN },
      { label: `Talento ≤ ${S.LEAN_OP.TALENT_MAX}`,
        current: p.talento, target: S.LEAN_OP.TALENT_MAX,
        met: p.talento <= S.LEAN_OP.TALENT_MAX },
    ];
    const active = reqs.every(r => r.met);
    out.push({
      icon: "🌿", id: "lean_op", name: "Lean Operation",
      points: active ? S.LEAN_OP.points : 0,
      detail: active ? "Squadra snella ad alto morale" : "Sinergia: morale alto + team contenuto",
      isSynergy: true, requirements: reqs,
      tier: active ? "gold" : "none",
    });
  }

  // 2. Engineering Excellence: many BugFix ∧ low Tech Debt
  {
    const bugCount = p.played.filter(c => c.type === "BugFix").length;
    const reqs = [
      { label: `BugFix ≥ ${S.ENG_EXC.BUGFIX_MIN}`,
        current: bugCount,  target: S.ENG_EXC.BUGFIX_MIN,
        met: bugCount >= S.ENG_EXC.BUGFIX_MIN },
      { label: `Tech Debt ≤ ${S.ENG_EXC.DEBT_MAX}`,
        current: p.techDebt, target: S.ENG_EXC.DEBT_MAX,
        met: p.techDebt <= S.ENG_EXC.DEBT_MAX },
    ];
    const active = reqs.every(r => r.met);
    out.push({
      icon: "⚙️", id: "eng_exc", name: "Engineering Excellence",
      points: active ? S.ENG_EXC.points : 0,
      detail: active ? `${bugCount} fix · debt ${p.techDebt}` : "Sinergia: codebase pulito a regola d'arte",
      isSynergy: true, requirements: reqs,
      tier: active ? "gold" : "none",
    });
  }

  // 3. Data Empire: Data Lake ∧ molti dati ∧ molte carte data
  {
    const dataCardsCount = p.played.filter(c => c.dept === "data").length;
    const reqs = [
      { label: "Data Lake (perm.)",
        current: p.permanents.data_lake ? 1 : 0, target: 1,
        met: !!p.permanents.data_lake },
      { label: `Dati ≥ ${S.DATA_EMPIRE.DATA_MIN}`,
        current: p.dati, target: S.DATA_EMPIRE.DATA_MIN,
        met: p.dati >= S.DATA_EMPIRE.DATA_MIN },
      { label: `Carte data ≥ ${S.DATA_EMPIRE.DATA_CARDS_MIN}`,
        current: dataCardsCount, target: S.DATA_EMPIRE.DATA_CARDS_MIN,
        met: dataCardsCount >= S.DATA_EMPIRE.DATA_CARDS_MIN },
    ];
    const active = reqs.every(r => r.met);
    out.push({
      icon: "📈", id: "data_empire", name: "Data Empire",
      points: active ? S.DATA_EMPIRE.points : 0,
      detail: active ? `Lake + ${p.dati}📊 + ${dataCardsCount} carte` : "Sinergia: stack data completo",
      isSynergy: true, requirements: reqs,
      tier: active ? "gold" : "none",
    });
  }

  // 4. Full Funding Round: 3+ Funding cards diversi
  {
    const fundIds = new Set(p.played.filter(c => c.type === "Funding").map(c => c.id));
    const reqs = [
      { label: `Round diversi ≥ ${S.FULL_FUNDING.UNIQUE_MIN}`,
        current: fundIds.size, target: S.FULL_FUNDING.UNIQUE_MIN,
        met: fundIds.size >= S.FULL_FUNDING.UNIQUE_MIN },
    ];
    const active = reqs[0].met;
    out.push({
      icon: "🏦", id: "full_funding", name: "Full Funding Round",
      points: active ? S.FULL_FUNDING.points : 0,
      detail: active ? `${fundIds.size} round diversi` : "Sinergia: capitali da fonti multiple",
      isSynergy: true, requirements: reqs,
      tier: active ? "gold" : "none",
    });
  }

  return out;
}

function awardsTotal(p) {
  return computeAwards(p).reduce((s, a) => s + a.points, 0);
}

// ---------- PYRAMID LOGIC ----------
// A slot is pickable when all rows below it in the same column are taken.
function isPickable(row, col) {
  if (state.pyramid[row][col].taken) return false;
  for (let r = row + 1; r < PYR_ROWS; r++) {
    if (!state.pyramid[r][col].taken) return false;
  }
  return true;
}

// Depth = # of cards below in same column NOT yet taken (visual layer)
function getDepth(row, col) {
  let depth = 0;
  for (let r = row + 1; r < PYR_ROWS; r++) {
    if (!state.pyramid[r][col].taken) depth++;
  }
  return depth;
}

function getPickableSlots() {
  const out = [];
  for (let col = 0; col < PYR_COLS; col++) {
    for (let row = PYR_ROWS - 1; row >= 0; row--) {
      const s = state.pyramid[row][col];
      if (!s.taken) {
        if (isPickable(row, col)) out.push({ row, col, slot: s });
        break;
      }
    }
  }
  return out;
}

function takeFromPyramid(playerIdx, row, col, action) {
  const slot = state.pyramid[row][col];
  slot.taken = true;
  // S3.2: identify what WOULD be revealed but DON'T flip yet —
  // caller decides after the block window (offerBlockOpportunity)
  let toReveal = null;
  if (row > 0) {
    const above = state.pyramid[row - 1][col];
    if (!above.faceUp && !above.taken) {
      toReveal = { row: row - 1, col, slot: above, card: above.card };
    }
  }
  const player = state.players[playerIdx];
  const card = slot.card;
  if (action === "play") {
    payCost(player, card);
    applyEffect(player, card, state.players);
    player.played.push(card);
    player._quarterPlays.push(card);
    log(`${player.isHuman ? "Hai pescato e giocato" : `${player.name} pesca`}: ${card.name}`, player.isHuman ? "you" : "");
  } else {
    player.budget += BALANCE.DISCARD.BUDGET_REFUND;
    player.techDebt += BALANCE.DISCARD.DEBT_PENALTY;
    player._quarterDiscards = (player._quarterDiscards || 0) + 1; // S9.3: lean_quarter OKR
    log(`${player.isHuman ? "Hai pescato e scartato" : `${player.name} scarta`}: ${card.name}`, player.isHuman ? "you" : "");
  }
  return { card, toReveal };
}
