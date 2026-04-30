"use strict";

// =============================================================
// hotseat.js — Hot Seat / pass-and-play local multiplayer (Phase 11)
//
// Architecture: 2-4 human players share ONE PC. Pass the mouse between
// turns via a fullscreen "pass-screen" modal. AI fills empty seats.
// No networking, no state serialization — single browser, single state.
//
// Design constraints (validated with user):
//   • Open table — all info public (Vision, OKR visible to everyone)
//   • Single-human degrade — 1 human + 3 AI = no pass-screen, plays
//     like single-player
//   • Block & React disabled (consistent with P2P MP) — enforced in
//     offerBlockOpportunity by short-circuiting on state.isSharedScreen
//   • Single global AI difficulty selector (not per-slot)
//   • Mini-classifica in pass-screen
//
// State flags:
//   state.isSharedScreen = true  → hot-seat mode active
//   state.isMultiplayer  = false → mutex with P2P
//   state.phase = "passing"      → showing pass-screen (NEW)
// =============================================================

// ---------- Helpers ----------

function isHumanSlot(idx) {
  return state?.players?.[idx]?.slotType === "human-host";
}

function countHumans() {
  if (!state?.players) return 0;
  return state.players.filter(p => p.slotType === "human-host").length;
}

// Returns true if we should show pass-screen before targetSlotIdx's turn.
// Called by processNextPick when the next picker is human.
// Logic: only relevant in shared-screen mode with 2+ humans.
function shouldShowPassScreen(targetSlotIdx) {
  if (!state?.isSharedScreen) return false;
  if (countHumans() <= 1) return false;        // single-human degrade
  if (!isHumanSlot(targetSlotIdx)) return false; // pass-screen only for human turns
  return true;
}

// ---------- Game start ----------

// Called by render-hotseat.js when user clicks "Avvia →" in lobby.
// slotConfig: array of 4 { type: "human"|"ai", name, persona? }
// scenarioId: scenario id (e.g. "standard")
// difficulty: "junior"|"senior"|"director"
function startGameSharedScreen(slotConfig, scenarioId, difficulty) {
  clearRngSeed();  // hot-seat uses random seed (no daily coupling)

  const players = slotConfig.map((slot) => {
    const isHuman = slot.type === "human";
    const p = newPlayer(slot.name, isHuman);
    p.slotType = isHuman ? "human-host" : "ai";
    p.peerId = null;
    return p;
  });

  state = {
    quarter: 1,
    pickIndex: 0,
    pickOrder: [],
    pyramid: [],
    players,
    log: [],
    phase: "draft",
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
    difficulty: difficulty || "senior",
    scenario: getScenarioById(scenarioId || "standard"),
    isDaily: false,
    dominanceSweepsByPlayer: {},
    localSlotIdx: 0,
    isSharedScreen: true,        // S11 flag
    isMultiplayer: false,         // explicit mutex with P2P
  };

  console.log("[hotseat] Starting game with", countHumans(), "humans +",
              4 - countHumans(), "AI · scenario:", scenarioId,
              "· difficulty:", state.difficulty);

  // S11.3: Sequential Vision draft for each human, then proceed
  draftVisionsSequential(() => {
    applyStartingModifiers();
    startQuarter();
    draftOkrsSequential(() => {
      render();
      processNextPick();
    });
  });
}

// ---------- Sequential draft orchestration (S11.3) ----------

// Iterates humans in slot order, opens Vision draft modal for each with
// pass-screen between (if 2+ humans). AI auto-pick at the start.
function draftVisionsSequential(onComplete) {
  // 1) AI Vision auto-pick (parallel, instant)
  state.players.forEach((p, idx) => {
    if (p.slotType === "ai") {
      const aiPool = visionsForAI();
      p.visionOptions = pickRandom(aiPool, Math.min(3, aiPool.length));
      p.vision = chooseAIVision(idx, p.visionOptions);
    }
  });

  // 2) Iterate humans sequentially
  const humanIndices = state.players
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.slotType === "human-host")
    .map(({ i }) => i);

  if (humanIndices.length === 0) {
    if (typeof onComplete === "function") onComplete();
    return;
  }

  const showPassFor = countHumans() > 1;
  let cursor = 0;

  const showNextDraft = () => {
    if (cursor >= humanIndices.length) {
      if (typeof onComplete === "function") onComplete();
      return;
    }
    const idx = humanIndices[cursor++];
    const player = state.players[idx];
    player.visionOptions = pickRandom(VISION_POOL, 3);

    const openModal = () => {
      state.localSlotIdx = idx;
      if (typeof render === "function") render();
      showVisionDraftModal({
        options: player.visionOptions,
        onPick: (vision) => {
          player.vision = vision;
          showNextDraft();
        },
      });
    };

    if (showPassFor) {
      showPassScreenModal(idx, openModal);
    } else {
      openModal();
    }
  };
  showNextDraft();
}

// Iterates humans for OKR draft. AI okrs already set by startQuarter.
// Called by startGameSharedScreen for Q1 and by showQuarterModal hook for Q2/Q3.
function draftOkrsSequential(onComplete) {
  const humanIndices = state.players
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.slotType === "human-host")
    .map(({ i }) => i);

  if (humanIndices.length === 0) {
    if (typeof onComplete === "function") onComplete();
    return;
  }

  const showPassFor = countHumans() > 1;
  let cursor = 0;

  const showNextDraft = () => {
    if (cursor >= humanIndices.length) {
      if (typeof onComplete === "function") onComplete();
      return;
    }
    const idx = humanIndices[cursor++];

    const openModal = () => {
      state.localSlotIdx = idx;
      if (typeof render === "function") render();
      // showOKRDraftModal uses state.localSlotIdx (S10 fix), reads
      // state.players[localSlotIdx].okrOptions (set by startQuarter)
      showOKRDraftModal(showNextDraft);
    };

    if (showPassFor) {
      showPassScreenModal(idx, openModal);
    } else {
      openModal();
    }
  };
  showNextDraft();
}

// (showPassScreenModal lives in js/render-hotseat.js)
