"use strict";

// =============================================================
// game.js — game flow: start, turn loop, picks, end-of-quarter,
//            end-game (modal HTML lives here for cohesion)
// =============================================================

function startGame(scenarioId = "standard", isDaily = false) {
  // S6.3: Daily mode uses a deterministic seed derived from today's date
  if (isDaily) setRngSeed(dailySeed());
  else clearRngSeed();
  const profile = getProfile() || newProfile("Tu");
  state = {
    quarter: 1,
    pickIndex: 0,
    pickOrder: [],
    pyramid: [],            // 2D array [row][col] -> { card, faceUp, taken }
    players: [newPlayer(profile.name, true)].concat(AI_NAMES.map(n => newPlayer(n, false))),
    log: [],
    phase: "human",
    aiHighlight: null,      // { row, col }
    activePicker: 0,
    justPlayedCardId: null,
    aiJustPlayed: null,
    prevResources: null,
    seenTutorial: false,
    gameOver: false,
    counterMarketingPending: [],   // S3.1: queue of players who played Counter-Marketing
    deferredReveals: [],           // S3.2: blocked reveals to fire later
    activeEvent: null,             // S4.1: market event active for current Q (null in Q1)
    difficulty: getDifficulty(),   // S5.2: junior | senior | director, from profile.prefs
    scenario: getScenarioById(scenarioId), // S6.1: game-wide ruleset
    isDaily,                       // S6.3: true if Daily Run mode
    dominanceSweepsByPlayer: {},   // S6.2: tracker for "Dominator" achievement
    localSlotIdx: 0,               // S10: which slot is this client (0 in single-player)
  };
  // S2.3: Vision draft happens BEFORE the first quarter (game-start identity).
  // After the human picks (and AI auto-pick), starting modifiers apply,
  // then we proceed to Q1 setup and OKR draft.
  draftVisionsFlow(() => {
    applyStartingModifiers();
    startQuarter();
    showOKRDraftModal(() => {
      render();
      processNextPick();
    });
  });
}

// ============================================================
// S10: MULTIPLAYER GAME START
// ============================================================
// Called by mpStartMultiplayerGame (host only). Sets up state with
// the resolved slot config (humans + AI fillers), then runs draft for
// all human slots in parallel via mpDraftVisionsForAll/mpDraftOkrsForAll.
function startGameMultiplayer(scenarioId, slotConfig, localSlotIdx) {
  clearRngSeed();  // S10: random seed per multiplayer game (no daily coupling)
  // Build players array from slotConfig
  const players = slotConfig.map((slot, idx) => {
    const isHuman = slot.type !== "ai";
    const p = newPlayer(slot.name, isHuman);
    p.slotType = slot.type;
    p.peerId = slot.peerId;
    return p;
  });
  state = {
    quarter: 1,
    pickIndex: 0,
    pickOrder: [],
    pyramid: [],
    players,
    log: [],
    phase: "human",
    aiHighlight: null,
    activePicker: 0,
    justPlayedCardId: null,
    aiJustPlayed: null,
    prevResources: null,
    seenTutorial: false,
    gameOver: false,
    counterMarketingPending: [],
    deferredReveals: [],
    activeEvent: null,
    difficulty: mp.difficulty || "senior",
    scenario: getScenarioById(scenarioId),
    isDaily: false,
    dominanceSweepsByPlayer: {},
    localSlotIdx,
    isMultiplayer: true,           // S10 flag
  };
  // Vision draft: all humans in parallel + AI auto-pick.
  // S10 fix: wrap the chain in explicit error handlers — silent promise
  // rejections were causing "stuck after Vision pick" hangs (no visible error,
  // just a frozen UI). Now any throw surfaces as a console error + toast.
  console.log("[mp] startGameMultiplayer: drafting visions for", state.players.length, "players");
  mpDraftVisionsForAll()
    .then(() => {
      console.log("[mp] visions complete. Applying starting modifiers + startQuarter.");
      applyStartingModifiers();
      startQuarter();  // resets phase to "draft"
      // S10 host fix: render NOW so the host sees the game UI under the
      // upcoming OKR modal. Without this, the host stays on splash background.
      // Defensive cleanup of leftover modal-bg.
      document.querySelectorAll(".modal-bg").forEach(m => {
        const id = m.id || "";
        if (id === "mpLobbyBg" || id === "mpEntryBg") {
          console.warn("[mp] removing stale modal:", id);
          m.remove();
        }
      });
      render();
      mpBroadcastState();
      console.log("[mp] Drafting OKRs.");
      return mpDraftOkrsForAll();
    })
    .then(() => {
      console.log("[mp] OKRs complete. Calling processNextPick (will set phase + broadcast).");
      // S10 fix: chain processNextPick into the promise so errors propagate
      // to .catch instead of being silent. processNextPick is async; if any
      // step throws (e.g. malformed state.players), we want to know.
      return processNextPick();
    })
    .then(() => {
      console.log("[mp] startGameMultiplayer chain fully complete (or first pick is awaiting human input)");
    })
    .catch((err) => {
      console.error("[mp] startGameMultiplayer chain failed:", err);
      console.error("[mp] state at failure:", JSON.stringify({
        phase: state?.phase,
        activePicker: state?.activePicker,
        pickIndex: state?.pickIndex,
        pickOrderLength: state?.pickOrder?.length,
        playersCount: state?.players?.length,
        playersSlotTypes: state?.players?.map(p => p.slotType),
      }, null, 2));
      if (typeof showToast === "function") {
        showToast({
          who: "ERRORE PARTITA",
          what: "Setup fallito: " + (err?.message || err),
          kind: "discard",
        });
      }
    });
}

// S2.3 + S5.1: orchestrate the Vision draft for all players
function draftVisionsFlow(onComplete) {
  // AI auto-pick from filtered pool — Senior+ uses persona alignment
  state.players.forEach((p, idx) => {
    if (!p.isHuman) {
      const aiPool = visionsForAI();
      p.visionOptions = pickRandom(aiPool, Math.min(3, aiPool.length));
      p.vision = chooseAIVision(idx, p.visionOptions);
    }
  });
  // Human draft via modal (any 3 from full pool)
  const human = state.players[0];
  human.visionOptions = pickRandom(VISION_POOL, 3);
  showVisionDraftModal({
    options: human.visionOptions,
    onPick: (vision) => {
      human.vision = vision;
      onComplete();
    },
  });
}

// S2.3: apply Vision starting-state modifiers (after draft, before Q1)
function applyStartingModifiers() {
  state.players.forEach(p => {
    const m = p.vision?.modifiers;
    if (!m) return;
    if (m.startingBudget)  p.budget  += m.startingBudget;
    if (m.startingTalento) p.talento += m.startingTalento;
    if (m.startingMorale)  p.morale  = clamp((p.morale || 0) + m.startingMorale, 0, 10);
    if (m.startingPermanents) {
      m.startingPermanents.forEach(perm => { p.permanents[perm] = true; });
    }
  });
}

function startQuarter() {
  const Q = BALANCE.QUARTER;
  const D = BALANCE.DEBT;
  // S10 fix: explicitly reset phase. Without this, state.phase trails the
  // previous Q's final value ("between" set by processNextPick before
  // endOfQuarter), so renders during draft setup show "..." indicator.
  // processNextPick will set phase to "human" or "ai" once a picker is chosen.
  state.phase = "draft";
  state.activePicker = null;
  state.players.forEach((p, idx) => {
    // S2.3: Vision can shift the debt-tempo-loss formula offset
    const visionTempoOff = p.vision?.modifiers?.debtTempoLossOffset || 0;
    // S1.1.1: Tech Debt slows down development (bugs eat your time)
    const debtTempoLoss = Math.max(0,
      Math.floor((p.techDebt - (D.TEMPO_LOSS_OFFSET + visionTempoOff)) / D.TEMPO_LOSS_DIVISOR));
    const ciCdBonus = p.permanents.ci_cd ? Q.CI_CD_TEMPO_BONUS : 0;
    p.tempo = Math.max(Q.MIN_TEMPO, Q.BASE_TEMPO + ciCdBonus - debtTempoLoss);
    p._tempoDebtLoss = debtTempoLoss;
    p.talentoUsed = 0; // S1.2: reset talent capacity for new Q
    p._quarterPlays = [];
    p._quarterStartMorale = p.morale; // S2.1: snapshot for morale_boost OKR
    p._chainsTriggeredThisQ = 0; // S9.3: reset for synergy_chaser OKR
    p._quarterDiscards = 0;      // S9.3: reset for lean_quarter OKR
    p.blockUsedThisQ = false; // S3.2: 1 block / Q limit

    // S2.1: each player drafts an OKR from N random options
    p.okrOptions = pickRandom(OKR_POOL, Q.OKR_DRAFT_SIZE);
    if (p.isHuman) {
      // Human picks via modal (showOKRDraftModal called after startQuarter)
      p.okrs = [];
    } else {
      // AI auto-picks based on persona/dept profile
      p.okrs = [chooseAIOKR(idx, p.okrOptions)];
    }

    if (debtTempoLoss > 0) {
      log(`${p.name}: debt ${p.techDebt} → -${debtTempoLoss}⏱ persi a bug-fixing`,
          p.isHuman ? "you" : "");
    }
  });

  // Toast for the human player when bugs eat hours
  const human = state.players[0];
  if (human._tempoDebtLoss > 0) {
    showToast({
      who: "BUG INTERRUPT",
      what: `Tech Debt ${human.techDebt} → <em>-${human._tempoDebtLoss}⏱</em> persi questo quarter`,
      kind: "discard"
    });
  }

  // Build pyramid: 4 rows × 6 cols. Rows alternate face-up/down.
  // row 0 (top, deepest): face-down
  // row 1: face-up
  // row 2: face-down
  // row 3 (front, pickable): face-up
  // S2.3: pool filtered by HUMAN's vision (excludeCardTypes / excludeCardIds)
  // AI visions don't filter — pool is shared, asymmetric filtering would break draft
  let pool = [...getCatalog(state.quarter)];
  const humanVision = state.players[0]?.vision?.modifiers || {};
  if (humanVision.excludeCardTypes) {
    pool = pool.filter(c => !humanVision.excludeCardTypes.includes(c.type));
  }
  if (humanVision.excludeCardIds) {
    pool = pool.filter(c => !humanVision.excludeCardIds.includes(c.id));
  }
  pool = shuffle(pool);
  // S9.1.e: dedup di "precious cards" — permanent OR vp ≥ 5 OR budget ≥ 5.
  // Q3 ha 16 carte uniche per 24 slot piramide → senza dedup, Series B (+10💰)
  // o Mobile App (+6 vp) potrebbero comparire 2 volte = doppia ricompensa.
  // Strategia: pass 1 = include ogni carta del pool una volta (max length cap);
  // pass 2 = riempi i restanti slot SOLO con carte non-precious.
  function isPrecious(c) {
    if (c.permanent) return true;
    const e = c.effect || {};
    if ((e.vp ?? 0) >= 5) return true;
    if ((e.budget ?? 0) >= 5) return true;
    return false;
  }
  const cards = [];
  for (let i = 0; i < pool.length && cards.length < TOTAL_PICKS; i++) {
    cards.push(instCard(pool[i]));
  }
  const fillers = pool.filter(c => !isPrecious(c));
  if (fillers.length === 0) {
    // edge case (mai succede coi cataloghi attuali) — fall back to any card
    while (cards.length < TOTAL_PICKS) cards.push(instCard(pool[cards.length % pool.length]));
  } else {
    let fi = 0;
    while (cards.length < TOTAL_PICKS) {
      cards.push(instCard(fillers[fi % fillers.length]));
      fi++;
    }
  }
  shuffle(cards);

  state.pyramid = [];
  for (let row = 0; row < PYR_ROWS; row++) {
    const rowCards = [];
    for (let col = 0; col < PYR_COLS; col++) {
      const idx = row * PYR_COLS + col;
      const faceUp = (row % 2 === 1);
      rowCards.push({ card: cards[idx], faceUp, taken: false });
    }
    state.pyramid.push(rowCards);
  }

  // Snake-draft pick order. Q1/Q2: rotation by quarter index. Q3: last-place
  // player parte primo (S9.1.c) — catch-up mechanic per evitare che chi è
  // dietro dopo Q2 sia automaticamente terzo nel Q dello scoring più alto.
  // Tie-break: tra player con stesso vp, vince l'index più basso (deterministico).
  let startingPlayer;
  if (state.quarter === NUM_QUARTERS) {
    const ranked = state.players
      .map((p, i) => ({ i, vp: p.vp }))
      .sort((a, b) => a.vp - b.vp || a.i - b.i);
    startingPlayer = ranked[0].i;
    log(`Q3: ${state.players[startingPlayer].name} parte primo (last-place).`,
        startingPlayer === 0 ? "you" : "");
  } else {
    startingPlayer = (state.quarter - 1) % NUM_PLAYERS;
  }
  state.pickOrder = [];
  for (let r = 0; r < PICKS_PER_QUARTER; r++) {
    const round = [];
    for (let i = 0; i < NUM_PLAYERS; i++) {
      round.push((startingPlayer + i) % NUM_PLAYERS);
    }
    if (r % 2 === 1) round.reverse();
    state.pickOrder.push(...round);
  }

  state.pickIndex = 0;
  state.aiHighlight = null;
  state.aiJustPlayed = null;
  state.justPlayedCardId = null;
  state.prevResources = null;
  // S3.1/S3.2: queues are per-Q (carry-over across Q would be confusing)
  state.counterMarketingPending = [];
  state.deferredReveals = [];

  log(`— ${QUARTER_LABELS[state.quarter - 1].name} —`, "event");
  log(`Piramide pronta: ${TOTAL_PICKS} carte (${PYR_ROWS}×${PYR_COLS}). Front face-up, retro coperto.`);

  // S6.1: scenario per-Q hook (e.g. Remote First applies -1 morale every Q)
  const sc = state.scenario;
  if (sc?.modifiers?.onQuarterStart) {
    try { sc.modifiers.onQuarterStart(state); }
    catch (e) { console.error("scenario.onQuarterStart failed", e); }
  }
}

// ---------- S7.1: CELEBRATIONS — detect newly-active awards/synergies/OKRs ----------
// Snapshot before play, compare after, fire toasts + audio for transitions.
function snapshotCelebrationState(player) {
  const awards = computeAwards(player);
  const okrsDone = (player.okrs || []).map(o => {
    try { return !!o.check(player, state.quarter); } catch (e) { return false; }
  });
  return { awards, okrsDone };
}

function celebrateChanges(player, before, opts = {}) {
  const after = snapshotCelebrationState(player);
  // Newly active awards/synergies (was 0, now > 0)
  after.awards.forEach((a, i) => {
    const prevPts = before.awards[i]?.points || 0;
    if (a.points > 0 && prevPts === 0) {
      const isSyn = !!a.isSynergy;
      showToast({
        who: isSyn ? "🤝 SYNERGY UNLOCKED" : "🏆 AWARD UNLOCKED",
        what: `<em>${a.name}</em> +${a.points}K MAU`,
        kind: isSyn ? "synergy" : "celebrate",
      });
      if (typeof (isSyn ? sndSynergy : sndAwardUnlock) === "function") {
        (isSyn ? sndSynergy : sndAwardUnlock)();
      }
    }
  });
  // Newly completed OKRs (was false, now true)
  (player.okrs || []).forEach((o, i) => {
    if (after.okrsDone[i] && !before.okrsDone[i]) {
      showToast({
        who: "✓ OKR COMPLETATO",
        what: `<em>${o.text}</em> +${o.reward}K a fine Q`,
        kind: "celebrate",
      });
      if (typeof sndOkrDone === "function") sndOkrDone();
    }
  });
  // Tech debt increased? (visual shake handled in render via state flag)
  if (opts.debtBefore != null && player.techDebt > opts.debtBefore) {
    state._debtShakeTs = Date.now();
    if (typeof sndDebt === "function") sndDebt();
  }
}

// ---------- TURN LOOP ----------
async function processNextPick() {
  // S3.2: process due deferred reveals at start of each pick
  // S10: in multiplayer, Block & React is disabled — skip the deferred queue
  if (!state.isMultiplayer) flushDueDeferredReveals();

  // S10 diagnostic: log every entry to processNextPick. Critical for tracing
  // multiplayer sync issues where flow stalls between phases.
  if (state.isMultiplayer) {
    console.log("[mp] processNextPick: pickIndex=", state.pickIndex,
                "/ pickOrder.length=", state.pickOrder?.length,
                "phase before=", state.phase);
  }

  if (state.pickIndex >= state.pickOrder.length) {
    state.phase = "between";
    state.activePicker = null;
    render();
    if (state.isMultiplayer) mpBroadcastState();
    await sleep(400);
    endOfQuarter();
    return;
  }
  const playerIdx = state.pickOrder[state.pickIndex];
  state.activePicker = playerIdx;
  const player = state.players[playerIdx];

  if (!player) {
    console.error("[mp] processNextPick: state.players[", playerIdx, "] is undefined!");
    return;
  }

  // S10: any human slot (host or remote) → wait. Only AI runs auto.
  const isAITurn = player.slotType === "ai" || !player.isHuman;
  if (!isAITurn) {
    // S11.2: Hot Seat — show pass-screen between humans before resuming.
    // Only when 2+ humans (single-human degrade has no pass-screen).
    if (typeof shouldShowPassScreen === "function" && shouldShowPassScreen(playerIdx)) {
      state.phase = "passing";
      state.aiHighlight = null;
      render();  // turn indicator shows "🪑 In attesa del prossimo player..."
      showPassScreenModal(playerIdx, () => {
        state.localSlotIdx = playerIdx;  // rotate POV for the new active player
        state.phase = "human";
        render();
      });
      return;
    }
    // Default human-turn flow (single-player, P2P MP, single-human hot-seat)
    state.phase = "human";
    state.aiHighlight = null;
    // S11: in hot-seat, sync localSlotIdx with activePicker on every human turn
    if (state.isSharedScreen) state.localSlotIdx = playerIdx;
    if (state.isMultiplayer) {
      console.log("[mp] processNextPick: human turn for slot", playerIdx,
                  "(", player.slotType, ") — phase=human, broadcasting");
    }
    render();
    // Broadcast so remote clients see whose turn it is
    if (state.isMultiplayer) mpBroadcastState();
    return; // wait for click (local) or pick message (remote)
  }
  if (state.isMultiplayer) {
    console.log("[mp] processNextPick: AI turn for slot", playerIdx,
                "(", player.slotType, ")");
  }

  // AI's turn
  state.phase = "ai";
  state.aiHighlight = null;
  render();
  if (state.isMultiplayer) mpBroadcastState();
  await sleep(450);

  const decision = decideAIPickFromPyramid(playerIdx);
  if (!decision) {
    state.pickIndex++;
    return processNextPick();
  }

  state.aiHighlight = { row: decision.row, col: decision.col };
  state.prevResources = snapshotResources(state.players[0]);
  // S7.1+S7.2: snapshot before AI acts (sabotage may affect human's awards/debt)
  const aiCelebBefore = snapshotCelebrationState(state.players[0]);
  const aiHumanDebtBefore = state.players[0].techDebt;
  render();
  await sleep(900);

  state.aiHighlight = null;
  const { toReveal } = takeFromPyramid(playerIdx, decision.row, decision.col, decision.action);
  state.aiJustPlayed = { playerIdx, count: state.players[playerIdx].played.length };
  showToast({
    who: `${state.players[playerIdx].name} ${decision.action === "play" ? "PESCA" : "SCARTA"}`,
    what: `<em>${decision.card.name}</em>`,
    kind: "steal"
  });

  // S3.2: human can block the AI's reveal (S10: disabled in multiplayer)
  const blockResult = state.isMultiplayer
    ? { blocked: false }
    : await offerBlockOpportunity(playerIdx, toReveal);
  if (toReveal && !blockResult.blocked) {
    toReveal.slot.faceUp = true;
    showToast({
      who: "CARTA RIVELATA",
      what: `Si scopre: <em>${toReveal.card.name}</em>`,
      kind: "reveal"
    });
  }
  render();
  await sleep(550);
  state.aiJustPlayed = null;
  // S10: in multiplayer, celebrations fire on each client via handleStateUpdate.
  // Only run them locally (host POV) if single-player.
  if (!state.isMultiplayer) {
    state.prevResources = snapshotResources(state.players[0]);
    celebrateChanges(state.players[0], aiCelebBefore, { debtBefore: aiHumanDebtBefore });
  } else {
    // Broadcast post-AI state so all clients can compute their own celebrations
    mpBroadcastState();
  }

  state.pickIndex++;
  processNextPick();
}

async function humanPickCard(row, col, cardEl) {
  if (state.gameOver || state.phase !== "human") return;
  if (!isPickable(row, col)) return;

  // S11.4: in hot-seat, double-check that activePicker matches localSlotIdx.
  // Pass-screen modal SHOULD have rotated localSlotIdx before this fires;
  // if mismatched, something is wrong with the flow.
  if (state.isSharedScreen && state.activePicker !== state.localSlotIdx) {
    console.warn("[hotseat] activePicker mismatch:",
                 state.activePicker, "vs localSlotIdx:", state.localSlotIdx);
    return;
  }

  // S10: Multiplayer — non-host clients route their pick through the host
  if (state.isMultiplayer && typeof mp !== "undefined" && mp.active && !mp.isHost) {
    if (state.activePicker !== state.localSlotIdx) return; // not my turn
    const previewSlot = state.pyramid[row][col];
    if (!previewSlot || previewSlot.taken) return;
    // Visual feedback (will be replaced by state update from host)
    if (cardEl) cardEl.classList.add("flying");
    unlockAudio?.();
    if (typeof sndPick === "function") sndPick();
    mpSendToHost({ type: "pick", row, col });
    return;
  }

  // Single-player OR multiplayer host: apply locally
  // S10: use localSlotIdx (= 0 in single-player, = 0 for host in multiplayer)
  const playerIdx = state.localSlotIdx;
  const player = state.players[playerIdx];
  const slot = state.pyramid[row][col];
  if (!slot || slot.taken) return;
  const card = slot.card;

  state.phase = "animating";
  const willPlay = canAfford(player, card);

  // S7.1+S7.2: snapshot for celebration detection + audio
  const celebBefore = snapshotCelebrationState(player);
  const debtBefore = player.techDebt;

  if (cardEl) {
    cardEl.classList.add(willPlay ? "flying" : "stealing");
  }
  // S7.2: soft click on pick
  unlockAudio?.();
  if (typeof sndPick === "function") sndPick();

  // S7.1: detect chain BEFORE applying so we can flag the celebration
  const willChain = willPlay && isChainTriggered(player, card);

  await sleep(560);

  state.prevResources = snapshotResources(player);
  const { toReveal } = takeFromPyramid(playerIdx, row, col, willPlay ? "play" : "discard");

  // S7.1: chain celebration (post-play, the discount has been applied)
  if (willChain) {
    showToast({
      who: "✨ CHAIN TRIGGERED",
      what: `<em>${card.name}</em> sconto applicato`,
      kind: "chain"
    });
    if (typeof sndChain === "function") sndChain();
    state._lastChainPlayIdx = player.played.length - 1;
  }
  if (willPlay) {
    state.justPlayedCardId = player.played[player.played.length - 1].id + "_" + (player.played.length - 1);
    showToast({ who: "TU PESCHI", what: `<em>${card.name}</em>`, kind: "you-pick" });
  } else {
    showToast({ who: "TU SCARTI", what: `<em>${card.name}</em> · +2 💰, +1 🐞`, kind: "discard" });
  }

  // S3.2: AI can react/block the human's reveal (S10: disabled in multiplayer)
  const blockResult = state.isMultiplayer
    ? { blocked: false }
    : await offerBlockOpportunity(playerIdx, toReveal);
  if (toReveal && !blockResult.blocked) {
    toReveal.slot.faceUp = true;
    showToast({
      who: "CARTA RIVELATA",
      what: `Si scopre: <em>${toReveal.card.name}</em>`,
      kind: "reveal"
    });
  }
  render();
  await sleep(550);
  state.justPlayedCardId = null;
  state.prevResources = snapshotResources(player);

  // S7.1+S7.2: detect newly-active awards/synergies/OKRs + debt change
  celebrateChanges(player, celebBefore, { debtBefore });

  state.pickIndex++;
  if (state.isMultiplayer) mpBroadcastState();
  processNextPick();
}

// ---------- S3.2: BLOCK & REACT ----------

// Defer reveal queue: blocked reveals fire N picks later
function flushDueDeferredReveals() {
  if (!state.deferredReveals || state.deferredReveals.length === 0) return;
  const due = state.deferredReveals.filter(r => state.pickIndex >= r.revealAtPick);
  due.forEach(r => {
    const slot = state.pyramid[r.row][r.col];
    if (slot && !slot.taken && !slot.faceUp) {
      slot.faceUp = true;
      showToast({
        who: "REVEAL DELAYED",
        what: `Si scopre: <em>${r.card?.name || "carta"}</em>`,
        kind: "reveal"
      });
    }
  });
  state.deferredReveals = state.deferredReveals.filter(r => state.pickIndex < r.revealAtPick);
}

// Offer block opportunity to opponents of the picker.
// Returns { blocked, byIdx? }.
function offerBlockOpportunity(actingIdx, toReveal) {
  return new Promise((resolve) => {
    if (!toReveal) return resolve({ blocked: false });
    // S10: Block & React disabled in multiplayer (MVP simplification)
    if (state.isMultiplayer) return resolve({ blocked: false });

    if (actingIdx === 0) {
      // Human picked — AI may react (auto-decide)
      const blockerIdx = aiSelectBlocker(actingIdx, toReveal);
      if (blockerIdx !== null) {
        executeBlock(blockerIdx, toReveal);
        resolve({ blocked: true, byIdx: blockerIdx });
      } else {
        resolve({ blocked: false });
      }
    } else {
      // AI picked — show block button to human (with countdown)
      showBlockOverlay({
        actingIdx,
        toReveal,
        onBlock: () => {
          executeBlock(0, toReveal);
          resolve({ blocked: true, byIdx: 0 });
        },
        onTimeout: () => resolve({ blocked: false }),
      });
    }
  });
}

// Pay block cost, mark used-this-Q, schedule deferred reveal
function executeBlock(blockerIdx, toReveal) {
  const blocker = state.players[blockerIdx];
  blocker.budget = Math.max(0, blocker.budget - BALANCE.BLOCK.COST_BUDGET);
  blocker.tempo  = Math.max(0, blocker.tempo  - BALANCE.BLOCK.COST_TEMPO);
  blocker.blockUsedThisQ = true;
  state.deferredReveals.push({
    row: toReveal.row,
    col: toReveal.col,
    card: toReveal.card,
    revealAtPick: state.pickIndex + BALANCE.BLOCK.REVEAL_DELAY_TURNS,
  });
  log(`${blocker.name} BLOCKS reveal di ${toReveal.card.name}`,
      blocker.isHuman ? "you" : "");
  showToast({
    who: `${blocker.name} BLOCKS`,
    what: `Reveal posticipato di 1 turno`,
    kind: "sabotage"
  });
}

// ---------- END OF QUARTER ----------
function endOfQuarter() {
  log(`— Fine ${QUARTER_LABELS[state.quarter - 1].name} —`, "event");

  const depts = ["product", "eng", "data"];
  const breakdown = {};
  state.players.forEach((p, idx) => {
    breakdown[idx] = { product: 0, eng: 0, data: 0 };
    p._quarterPlays.forEach(c => { breakdown[idx][c.dept] = (breakdown[idx][c.dept] || 0) + 1; });
  });
  // S3.1: Tiered Department Dominance
  // 1° = full bonus, 2° = half (floor), 3° = +DOMINANCE_THIRD_VP, ties = nessuno
  const dominanceBonuses = {};
  depts.forEach(d => {
    const ranked = state.players
      .map((p, idx) => ({ idx, count: breakdown[idx][d] }))
      .filter(x => x.count > 0)
      .sort((a, b) => b.count - a.count);
    if (ranked.length === 0) return;

    // Resolve tiers — skip any tied group, advance pos
    const tiers = []; // [idx_or_null, idx_or_null, idx_or_null]
    let pos = 0;
    for (let tier = 0; tier < 3; tier++) {
      if (pos >= ranked.length) { tiers.push(null); continue; }
      const tiedCount = ranked.filter(x => x.count === ranked[pos].count).length;
      if (tiedCount === 1) {
        tiers.push(ranked[pos].idx);
        pos += 1;
      } else {
        tiers.push(null);
        pos += tiedCount;
      }
    }

    const FULL = BALANCE.DOMINANCE[d];
    // 1° place — full bonus
    if (tiers[0] !== null) {
      const p = state.players[tiers[0]];
      p.vp += FULL.vp;
      p.talento += (FULL.talento || 0);
      p.dati += (FULL.dati || 0);
      dominanceBonuses[tiers[0]] = (dominanceBonuses[tiers[0]] || []).concat([`🥇 ${FULL.label}`]);
    }
    // 2° place — half bonus (floor)
    if (tiers[1] !== null) {
      const p = state.players[tiers[1]];
      p.vp += Math.floor(FULL.vp / 2);
      p.dati += Math.floor((FULL.dati || 0) / 2);
      // half of talento:1 = 0, skip
      dominanceBonuses[tiers[1]] = (dominanceBonuses[tiers[1]] || []).concat([`🥈 ${FULL.label.replace(" Lead", " 2°")}`]);
    }
    // 3° place — bronze prize
    if (tiers[2] !== null) {
      state.players[tiers[2]].vp += BALANCE.DOMINANCE_THIRD_VP;
      dominanceBonuses[tiers[2]] = (dominanceBonuses[tiers[2]] || []).concat([`🥉 ${FULL.label.replace(" Lead", " 3°")}`]);
    }
  });

  // S6.2: track dominance sweep (won 1st in all 3 depts in same Q) — for Dominator achievement
  state.players.forEach((p, idx) => {
    const goldsThisQ = (dominanceBonuses[idx] || []).filter(s => s.startsWith("🥇")).length;
    if (goldsThisQ >= 3) {
      p._dominanceSweeps = (p._dominanceSweeps || 0) + 1;
    }
  });

  const okrResults = state.players.map((p) => {
    const completed = [];
    p.okrs.forEach(o => {
      if (o.check(p, state.quarter)) {
        p.vp += o.reward;
        completed.push(o);
        p.okrCompleted.push(o.id);
      }
    });
    return completed;
  });

  const D = BALANCE.DEBT;
  state.players.forEach(p => {
    if (p.permanents.monitoring && p.techDebt > 0) {
      p.techDebt = Math.max(0, p.techDebt - D.MONITORING_REMOVAL);
    }
    // S2.3: Vision can shift debt penalty thresholds (Lean Startup tolerates +1)
    const off = p.vision?.modifiers?.debtPenaltyOffset || 0;
    const threshold = D.Q_PENALTY_THRESHOLD + off;
    const offset = D.Q_PENALTY_OFFSET + off;
    if (p.techDebt >= threshold) {
      const penalty = Math.max(0, p.techDebt - offset);
      p.vp = Math.max(0, p.vp - penalty);
      log(`${p.name}: Tech Debt elevato (${p.techDebt}) → -${penalty}K utenti`, p.isHuman ? "you" : "");
    }
  });

  // S1.2: Budget pressure — fra Q1/Q2 e Q2/Q3 il budget si dimezza,
  // la metà evaporata si converte in K MAU. Q3→end-game salta (full conversion in endGame).
  const B = BALANCE.BUDGET;
  const budgetEvents = {};
  if (state.quarter < NUM_QUARTERS) {
    state.players.forEach((p, idx) => {
      if (p.budget > 0) {
        const halved = Math.floor(p.budget / B.Q_CARRYOVER_DIVISOR);
        const evaporated = p.budget - halved;
        const converted = Math.floor(evaporated / B.CONVERSION_DIVISOR);
        p.vp += converted;
        budgetEvents[idx] = { before: p.budget, after: halved, evaporated, converted };
        p.budget = halved;
        if (evaporated > 0) {
          log(`${p.name}: ${evaporated}💰 evaporato → +${converted}K utenti convertiti`,
              p.isHuman ? "you" : "");
        }
      }
    });
  }

  // S10: broadcast post-EOQ state so clients see all bonuses applied
  if (state.isMultiplayer) mpBroadcastState();

  // S10 fix: broadcast Q-end modal data to clients so they see the same
  // milestone screen. Without this, only the host saw the summary;
  // clients stared at an empty board until the next state update.
  // okrResults is an array of arrays of OKR objects (with .check fns) —
  // not directly serializable. Clients re-derive completion from
  // state.players[i].okrs[0].check at modal-open time (same data, no fn refs).
  if (state.isMultiplayer && typeof mpBroadcast === "function") {
    mpBroadcast({
      type: "quarterModalShow",
      breakdown,
      dominanceBonuses,
      budgetEvents,
    });
  }

  showQuarterModal(breakdown, dominanceBonuses, okrResults, budgetEvents);
}

function showQuarterModal(breakdown, dominanceBonuses, okrResults, budgetEvents) {
  const ql = QUARTER_LABELS[state.quarter - 1];
  budgetEvents = budgetEvents || {};
  const isLastQ = state.quarter >= NUM_QUARTERS;

  // S1.2: budget halving info banner (only between Q)
  const budgetBanner = isLastQ ? "" : `
    <div class="budget-banner">
      <strong>💰 Q-end Burn-down:</strong> il 50% del budget rimanente è evaporato e convertito in K MAU al rate /3.
      <span class="budget-banner-detail">${
        Object.keys(budgetEvents).length === 0
          ? "Nessuno aveva budget residuo."
          : Object.entries(budgetEvents).map(([idx, ev]) =>
              `${state.players[idx].name}: ${ev.before}→${ev.after} (+${ev.converted}K)`
            ).join(" · ")
      }</span>
    </div>`;

  const html = `
    <div class="modal-bg"><div class="modal">
      <h2>Milestone: ${ql.icon} ${ql.milestone}</h2>
      <p style="color:var(--muted)">${ql.name} chiusa. Bonus dipartimentali, OKR e penalità Tech Debt applicate.</p>
      <table class="score-table">
        <thead><tr><th>Manager</th><th class="num">Utenti</th><th class="num">Dati</th><th class="num">Talento</th><th class="num">Morale</th><th class="num">Debt</th><th>Bonus</th></tr></thead>
        <tbody>
          ${state.players.map((p, idx) => `
            <tr>
              <td><strong>${p.name}</strong></td>
              <td class="num">${p.vp}K</td>
              <td class="num">${p.dati}</td>
              <td class="num">${p.talento}</td>
              <td class="num">${p.morale}</td>
              <td class="num">${p.techDebt}</td>
              <td>${(dominanceBonuses[idx] || []).join(", ") || "—"}</td>
            </tr>`).join("")}
        </tbody>
      </table>
      ${budgetBanner}
      <h3 style="color:var(--accent); margin-top:18px">I tuoi OKR</h3>
      ${(() => {
        // S10 fix: use localSlotIdx (host=0, client=1/2/3). Re-derive
        // completion via o.check() instead of okrResults[localIdx].includes(o)
        // — clients receive okrResults via broadcast as IDs only, lookup
        // via OKR_POOL gives same data but DIFFERENT object references,
        // breaking .includes(). Calling o.check() works regardless.
        const localIdx = state.localSlotIdx ?? 0;
        const localPlayer = state.players[localIdx];
        const myOkrs = localPlayer?.okrs || [];
        return myOkrs.map(o => {
          let done = false;
          try { done = o.check(localPlayer, state.quarter); } catch (e) {}
          return `<div class="okr ${done ? 'done' : ''}"><span class="okr-text">${o.text}</span><span class="okr-prog">${done ? `+${o.reward}K` : `—`}</span></div>`;
        }).join("");
      })()}
      <div class="actions">
        ${isLastQ
          ? `<button class="primary" id="endGameBtn">Vedi risultato finale →</button>`
          : `<button class="primary" id="nextQuarterBtn">Avvia ${QUARTER_LABELS[state.quarter].name} →</button>`}
      </div>
    </div></div>`;
  document.getElementById("modalRoot").innerHTML = html;
  // S10: in multiplayer, only host can advance Q. Clients see modal but
  // their button does nothing — host triggers next phase via state broadcast.
  const isMpClient = state.isMultiplayer && typeof mp !== "undefined" && mp.active && !mp.isHost;
  if (isMpClient) {
    // Replace button area with a waiting message
    const actionsArea = document.querySelector("#modalRoot .actions");
    if (actionsArea) actionsArea.innerHTML = `<div class="mp-waiting">⏳ In attesa che l'host avanzi...</div>`;
    return;
  }
  if (state.quarter < NUM_QUARTERS) {
    document.getElementById("nextQuarterBtn").onclick = () => {
      // S10: tell clients to close their Q-end modal
      if (state.isMultiplayer && typeof mpBroadcast === "function") {
        mpBroadcast({ type: "closeMpModal" });
      }
      document.getElementById("modalRoot").innerHTML = "";
      state.quarter++;
      // S4.1: market event picked between Q1→Q2 and Q2→Q3
      pickAndShowMarketEvent(() => {
        startQuarter();
        // S10 host fix: render immediately after startQuarter so the host
        // sees the new Q's board under the upcoming OKR modal.
        render();
        if (state.isMultiplayer) {
          // S10 fix: simplified chain. Only broadcast ONCE here (post-
          // startQuarter); processNextPick broadcasts again with the final
          // phase. Multiple successive broadcasts cause races on the guest.
          // .catch added so errors in the OKR draft don't fail silently.
          mpBroadcastState();
          mpDraftOkrsForAll()
            .then(() => {
              console.log("[mp] Q-transition: OKRs drafted, calling processNextPick");
              return processNextPick();  // chain it so errors propagate
            })
            .then(() => {
              console.log("[mp] Q-transition complete (awaiting first pick)");
            })
            .catch((err) => {
              console.error("[mp] Q-transition failed:", err);
              console.error("[mp] state at failure:", JSON.stringify({
                phase: state?.phase,
                activePicker: state?.activePicker,
                pickIndex: state?.pickIndex,
                pickOrderLength: state?.pickOrder?.length,
                playersCount: state?.players?.length,
                playersSlotTypes: state?.players?.map(p => p.slotType),
              }, null, 2));
              if (typeof showToast === "function") {
                showToast({
                  who: "ERRORE",
                  what: "Avanzamento Q fallito: " + (err?.message || err),
                  kind: "discard",
                });
              }
            });
        } else if (state.isSharedScreen && typeof draftOkrsSequential === "function") {
          // S11.6: hot-seat — sequential OKR draft for each human with pass-screen
          draftOkrsSequential(() => {
            render();
            processNextPick();
          });
        } else {
          showOKRDraftModal(() => {
            render();
            processNextPick();
          });
        }
      });
    };
  } else {
    document.getElementById("endGameBtn").onclick = () => {
      // S10: tell clients to close their Q3-end modal
      if (state.isMultiplayer && typeof mpBroadcast === "function") {
        mpBroadcast({ type: "closeMpModal" });
      }
      document.getElementById("modalRoot").innerHTML = "";
      // S4.2: Investor Pitch sequence before final end-game modal
      showInvestorPitch(() => endGame());
    };
  }
}

// S4.1: pick a random Market Event, apply onActivate, show modal, then proceed.
function pickAndShowMarketEvent(onComplete) {
  let event = pickRandom(EVENT_POOL, 1)[0];
  // Black Swan: resolve to a random non-Black-Swan event with a flair label
  if (event.isBlackSwan) {
    const others = EVENT_POOL.filter(e => !e.isBlackSwan);
    const inner = pickRandom(others, 1)[0];
    event = { ...inner, name: `Black Swan: ${inner.name}`, icon: "🦢" };
  }
  state.activeEvent = event;

  // Immediate effects (e.g. Recessione: -2 budget, Critical CVE: -3 MAU)
  if (typeof event.onActivate === "function") {
    try { event.onActivate(state); } catch (e) { console.error("event.onActivate failed", e); }
  }
  log(`📰 Market Event: ${event.name}`, "event");

  // S10: broadcast post-onActivate state, then trigger market news modal on clients
  if (state.isMultiplayer) {
    mpBroadcastState();
    if (typeof mpBroadcast === "function") {
      mpBroadcast({
        type: "marketNewsShow",
        event: {
          id: event.id, name: event.name, icon: event.icon,
          description: event.description, bonus: event.bonus, malus: event.malus,
        },
      });
    }
  }

  showMarketNewsModal(event, () => {
    // S10: tell clients to close their market news modal
    if (state.isMultiplayer && typeof mpBroadcast === "function") {
      mpBroadcast({ type: "closeMpModal" });
    }
    if (typeof onComplete === "function") onComplete();
  });
}

// S4.2 + S9.5.b: Final Investor Pitch sequence before end-game.
// Players present in ascending MAU order; the last (= leader) draws a VC
// reaction. Pitch + VC reaction sono ora collassati in un singolo modal
// (showFinalSequenceModal) — il modal applica leader.vp += vc.vpDelta
// internamente quando l'utente clicca "Avanti — VC reaction →" (phase 0)
// oppure "Salta →" (skip path, applica silently).
function showInvestorPitch(onComplete) {
  const sorted = [...state.players].sort((a, b) => a.vp - b.vp);
  const leader = sorted[sorted.length - 1];
  const vc = pickRandom(VC_POOL, 1)[0];
  // S10: broadcast final sequence trigger so clients show the same pitch + VC.
  // Send slot indices (resolved on client to current state.players[i]) and the
  // VC data inline (vc has no fns, fully serializable).
  if (state.isMultiplayer && typeof mpBroadcast === "function") {
    mpBroadcast({
      type: "finalSequenceShow",
      sortedSlotIndices: sorted.map(p => state.players.indexOf(p)),
      leaderSlotIdx: state.players.indexOf(leader),
      vc: { id: vc.id, name: vc.name, icon: vc.icon, reaction: vc.reaction, vpDelta: vc.vpDelta },
    });
  }
  showFinalSequenceModal(sorted, leader, vc, () => {
    // S10: tell clients to close the final sequence modal before endGame
    if (state.isMultiplayer && typeof mpBroadcast === "function") {
      mpBroadcast({ type: "closeMpModal" });
    }
    if (typeof onComplete === "function") onComplete();
  });
}

// ---------- END GAME ----------
// S10 refactor: split into 2 functions:
//   - endGame: host computes scores + broadcasts state + triggers modal on
//     all clients. Only HOST runs this.
//   - showEndGameModal: builds the modal HTML using state.localSlotIdx for
//     POV. Both host AND clients call this to display the same screen with
//     correct local-player data.
function endGame() {
  // Score computation only runs on host (or in single-player). Clients
  // receive computed state via broadcast.
  if (!state.isMultiplayer || (typeof mp !== "undefined" && mp.isHost)) {
    state.gameOver = true;
    state.players.forEach(p => {
      p._preAwardVp = p.vp;
      p._awards = computeAwards(p);
      p._awardsTotal = p._awards.reduce((s, a) => s + a.points, 0);
      p.vp += p._awardsTotal;

      const conv = Math.floor(p.budget / BALANCE.BUDGET.CONVERSION_DIVISOR);
      p._budgetConv = conv;
      p.vp += conv;
      if (conv > 0) log(`${p.name}: ${p.budget} Budget convertiti in ${conv}K utenti`);
      // S1.1: end-game debt penalty (BALANCE.DEBT.ENDGAME_PENALTY_MULT)
      p._debtPenalty = p.techDebt * BALANCE.DEBT.ENDGAME_PENALTY_MULT;
      p.vp = Math.max(0, p.vp - p._debtPenalty);
    });
    // S10: broadcast final state to clients THEN trigger their modal
    if (state.isMultiplayer) {
      mpBroadcastState();
      if (typeof mpBroadcast === "function") {
        mpBroadcast({ type: "endGameShow" });
      }
    }
  }
  showEndGameModal();
}

function showEndGameModal() {
  const ranked = [...state.players].sort((a, b) => b.vp - a.vp);
  const winner = ranked[0];
  // S10: use localSlotIdx (host=0, client=1/2/3) so each player sees their
  // own awards / rank / "did I win?" message.
  const localIdx = state.localSlotIdx ?? 0;
  const you = state.players[localIdx];
  if (!you) {
    console.error("[mp] showEndGameModal: no local player at slot", localIdx);
    return;
  }
  const youRank = ranked.indexOf(you) + 1;

  // Persist career stats on the LOCAL player's profile
  // S6.1+S6.2+S6.3: record game with extended context
  const won = winner === you;  // did MY local player win?
  if (typeof recordGameResult === "function") {
    recordGameResult({
      won,
      finalUsers: you.vp,
      scenarioId: state.scenario?.id || "standard",
      visionId: you.vision?.id || null,
      isDaily: !!state.isDaily,
    });
  }

  // S6.2: check newly unlocked achievements (per-local-player)
  let newlyUnlocked = [];
  if (typeof buildAchievementContext === "function") {
    const ctx = buildAchievementContext(state, won, you);
    newlyUnlocked = checkNewAchievements(ctx);
    if (newlyUnlocked.length > 0) unlockAchievements(newlyUnlocked);
  }
  state._newAchievements = newlyUnlocked;

  // S6.3: clear RNG seed if was Daily
  if (state.isDaily) clearRngSeed();

  const yourAwardsHtml = (you._awards || []).map(a => {
    const tierClass = a.isSynergy
      ? `synergy ${a.points > 0 ? "active" : "inactive"}`
      : `tier-${a.tier || "none"}`;
    const cls = `award-row ${tierClass}${a.points === 0 ? ' empty' : ''}`;
    return `
    <div class="${cls}">
      <span class="a-icon">${a.icon}</span>
      <span class="a-name">${a.name}<span class="a-detail">${a.detail || ''}</span></span>
      <span class="a-points">${a.points > 0 ? '+' + a.points : '0'}</span>
    </div>`;
  }).join("");

  // S10 fix: in MP both humans are isHuman=true. The winner banner needs to
  // reflect "did I win" not "did any human win".
  const iWon = winner === you;
  const html = `
    <div class="modal-bg"><div class="modal">
      <div class="winner-banner">
        <h2>${iWon ? "🎉 Promosso a CTO!" : `🏆 ${winner.name} promosso a CTO`}</h2>
        <div>${iWon ? "La tua app ha conquistato il mercato con più utenti." : `Hai chiuso ${youRank}° su ${NUM_PLAYERS}.`}</div>
      </div>

      <h3 style="color: var(--accent); margin-top: 20px; margin-bottom: 8px;">I tuoi premi finali</h3>
      <div class="awards-grid">${yourAwardsHtml}</div>
      <div class="a-total">Totale Awards: +${you._awardsTotal}K · Budget→Utenti: +${you._budgetConv}K · Tech Debt: −${you._debtPenalty}K</div>

      <h3 style="color: var(--accent); margin-top: 20px;">Classifica finale</h3>
      <table class="score-table">
        <thead><tr><th>#</th><th>Manager</th><th class="num">Utenti base</th><th class="num">Awards</th><th class="num">Budget</th><th class="num">Debt</th><th class="num">Totale</th></tr></thead>
        <tbody>
          ${ranked.map((p, i) => `
            <tr class="${i===0 ? 'winner' : ''}">
              <td>${i+1}</td><td><strong>${p.name}</strong></td>
              <td class="num">${p._preAwardVp}K</td>
              <td class="num">+${p._awardsTotal}K</td>
              <td class="num">+${p._budgetConv}K</td>
              <td class="num">−${p._debtPenalty}K</td>
              <td class="num"><strong>${p.vp}K</strong></td>
            </tr>`).join("")}
        </tbody>
      </table>
      <div class="actions"><button class="primary" id="restartBtn">Nuova partita</button></div>
    </div></div>`;
  // S6.2: show new achievements modal BEFORE the final ranking modal
  const finishEndGame = () => {
    document.getElementById("modalRoot").innerHTML = html;
    document.getElementById("restartBtn").onclick = () => {
      document.getElementById("modalRoot").innerHTML = "";
      // S10: in multiplayer, disconnect cleanly so the next game starts fresh
      if (state.isMultiplayer && typeof mpDisconnect === "function") {
        mpDisconnect();
      }
      // Restart goes back to splash so player can pick scenario again
      renderSplash();
    };
  };
  if (state._newAchievements && state._newAchievements.length > 0) {
    showNewAchievementsModal(state._newAchievements, finishEndGame);
  } else {
    finishEndGame();
  }
}
