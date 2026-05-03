"use strict";

// =============================================================
// state.js — constants + game state + player factory + log
// =============================================================

const NUM_PLAYERS = 4;
const PYR_ROWS = 4;          // pyramid depth
const PYR_COLS = 6;          // columns
const PICKS_PER_QUARTER = (PYR_ROWS * PYR_COLS) / NUM_PLAYERS;  // 6
const NUM_QUARTERS = 3;
const TOTAL_PICKS = PYR_ROWS * PYR_COLS;  // 24
const AI_NAMES = ["Marco (Eng VP)", "Alessia (CMO)", "Karim (CDO)"];
const QUARTER_LABELS = [
  { name: "Q1 Discovery", icon: "🔍", milestone: "Kick-off" },
  { name: "Q2 Build",     icon: "🔨", milestone: "Beta" },
  { name: "Q3 Launch",    icon: "🚀", milestone: "GA" },
];

// Mutable game state — populated by startGame()
let state = null;

function newPlayer(name, isHuman) {
  const init = BALANCE.PLAYER_INIT;
  return {
    name, isHuman,
    // S10: multiplayer slot metadata. Default values per single-player
    // semantics (slot 0 = human-host, 1-3 = ai). Overridden by multiplayer
    // setup when game starts via mp.startMultiplayerGame().
    slotType: isHuman ? "human-host" : "ai",  // "human-host" | "human-remote" | "ai"
    peerId: null,                              // PeerJS id for "human-remote" only
    budget:   init.budget,
    tempo:    0,                  // set by startQuarter
    talento:  init.talento,
    talentoUsed: 0,               // S1.2: talento è capacità fisica per Q
    dati:     init.dati,
    morale:   init.morale,
    techDebt: init.techDebt,
    vp:       init.vp,            // 1 vp = 1K MAU
    played: [],
    permanents: {},
    okrs: [],                     // OKR(s) chosen for current Q
    okrOptions: [],               // S2.1: draft pool of 3 from which `okrs` is chosen
    okrCompleted: [],
    _quarterPlays: [],
    _quarterStartMorale: 0,       // S2.1: snapshot for morale_boost OKR check
    _chainsTriggeredThisQ: 0,     // S9.3: per-Q counter per OKR synergy_chaser
    _quarterDiscards: 0,          // S9.3: per-Q counter per OKR lean_quarter
    vision: null,                 // S2.3: chosen Vision Card (game-wide identity)
    visionOptions: [],            // S2.3: 3 options drafted at game start
    blockUsedThisQ: false,        // S3.2: 1 block per quarter limit
    archetype: null,              // S16: AI archetype assigned at game start (null for humans)
  };
}

function log(msg, cls = "") {
  state.log.unshift({ msg, cls });
  if (state.log.length > 40) state.log.pop();
}

function snapshotResources(p) {
  return { budget: p.budget, tempo: p.tempo, talento: p.talento,
           dati: p.dati, morale: p.morale, techDebt: p.techDebt, vp: p.vp };
}
