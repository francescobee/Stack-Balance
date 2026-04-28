"use strict";

// =============================================================
// multiplayer.js — P2P multiplayer via PeerJS (Phase 10)
//
// Architecture: AUTHORITATIVE HOST
//   - One human player is "host". Runs all rules.js / game.js / ai.js
//     locally. Broadcasts state to all clients after each change.
//   - Clients receive state, render it, send pick requests to host.
//   - Empty seats auto-filled with AI (host runs them).
//   - Block & React DISABLED in multiplayer (MVP simplification).
//
// Tech:
//   - PeerJS via CDN (https://unpkg.com/peerjs@1.5.4)
//   - PeerJS Cloud free public signaling
//   - DataChannels (no audio/video)
//
// State: single global `mp` object. All multiplayer-specific state
// lives here. `state` (the game state) augmented with localSlotIdx
// (which slot the local client renders as POV).
// =============================================================

// Globally accessible — multiplayer state container
let mp = {
  active: false,         // true during a multiplayer session (lobby + game)
  isHost: false,
  peer: null,            // PeerJS instance
  roomCode: null,        // 4-char shareable id (e.g. "ABCD")
  localPeerId: null,     // this client's PeerJS id
  // Lobby state (filled progressively as players join)
  // Each entry: { peerId, name, slotIdx (0-3, assigned by host) }
  // Slot 0 is always the host.
  lobby: [],
  connections: [],       // host: array; client: [hostConn]
  difficulty: "senior",  // AI difficulty for empty seats (host-controlled)
  // Pending state transitions (host only):
  pendingDrafts: {},     // peerId → callback to invoke when peer responds
  // UI callback hooks
  onLobbyUpdate: null,   // re-render lobby modal when player joins/leaves
  onError: null,         // (msg) => display error toast
  // Defer game start until lobby finalised
  hostName: null,
};

const ROOM_PREFIX = "stackandbalance-";   // namespace to avoid PeerJS collisions
const PEER_OPTIONS = { debug: 1 };
const ROOM_CODE_ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ";  // no I/O for legibility

// ============================================================
// CONNECTION SETUP (S10.1)
// ============================================================

function generateRoomCode() {
  return Array.from({ length: 4 }, () =>
    ROOM_CODE_ALPHA[Math.floor(Math.random() * ROOM_CODE_ALPHA.length)]
  ).join("");
}

// HOST: create a new room. Returns the 4-char room code (also stored in mp.roomCode).
async function mpCreateRoom(hostName) {
  if (typeof Peer === "undefined") {
    throw new Error("PeerJS not loaded");
  }
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const tryCreate = () => {
      const code = generateRoomCode();
      const peerInstance = new Peer(ROOM_PREFIX + code, PEER_OPTIONS);

      const onError = (err) => {
        peerInstance.off("error", onError);
        if (err.type === "unavailable-id" && attempts < 5) {
          attempts++;
          peerInstance.destroy();
          setTimeout(tryCreate, 200);
        } else {
          reject(err);
        }
      };
      peerInstance.on("error", onError);

      peerInstance.on("open", (id) => {
        mp.active = true;
        mp.isHost = true;
        mp.peer = peerInstance;
        mp.roomCode = code;
        mp.localPeerId = id;
        mp.hostName = hostName;
        mp.connections = [];
        // Slot 0 = host
        mp.lobby = [{ peerId: id, name: hostName, slotIdx: 0 }];
        // Listen for incoming connections
        peerInstance.on("connection", (conn) => {
          conn.on("open", () => onClientConnected(conn));
          conn.on("data", (msg) => handlePeerMessage(msg, conn));
          conn.on("close", () => handlePeerClose(conn));
          conn.on("error", (e) => console.warn("[mp] conn error", e));
        });
        // Reset error handler to non-fatal logger
        peerInstance.off("error", onError);
        peerInstance.on("error", (e) => {
          console.warn("[mp] peer error", e);
          mp.onError?.(`Errore di rete: ${e.type || e.message || e}`);
        });
        resolve(code);
      });
    };
    tryCreate();
  });
}

// CLIENT: join an existing room by code.
async function mpJoinRoom(code, playerName) {
  if (typeof Peer === "undefined") {
    throw new Error("PeerJS not loaded");
  }
  const upperCode = code.toUpperCase();
  return new Promise((resolve, reject) => {
    const peerInstance = new Peer(PEER_OPTIONS);
    let resolved = false;

    peerInstance.on("error", (err) => {
      if (!resolved) reject(err);
      else mp.onError?.(`Errore: ${err.type || err.message}`);
    });

    peerInstance.on("open", () => {
      const conn = peerInstance.connect(ROOM_PREFIX + upperCode, {
        reliable: true,
        metadata: { name: playerName },
      });
      conn.on("open", () => {
        mp.active = true;
        mp.isHost = false;
        mp.peer = peerInstance;
        mp.roomCode = upperCode;
        mp.localPeerId = peerInstance.id;
        mp.connections = [conn];
        mp.hostName = null;
        // Send join announcement
        conn.send({ type: "join", name: playerName });
        conn.on("data", (msg) => handlePeerMessage(msg, conn));
        conn.on("close", () => handleHostDisconnect());
        resolved = true;
        resolve();
      });
      conn.on("error", (err) => {
        if (!resolved) reject(err);
      });
    });
  });
}

function mpDisconnect() {
  if (mp.peer) {
    try { mp.peer.destroy(); } catch (e) { /* ignore */ }
  }
  mp = {
    active: false, isHost: false, peer: null, roomCode: null,
    localPeerId: null, lobby: [], connections: [], difficulty: "senior",
    pendingDrafts: {}, onLobbyUpdate: null, onError: null, hostName: null,
  };
}

function mpSendToHost(msg) {
  if (mp.connections[0]?.open) mp.connections[0].send(msg);
}

function mpSendToPeer(peerId, msg) {
  const conn = mp.connections.find(c => c.peer === peerId);
  if (conn?.open) conn.send(msg);
}

function mpBroadcast(msg) {
  if (!mp.isHost) return;
  mp.connections.forEach(c => { if (c.open) c.send(msg); });
}

// Helper: find lobby entry for a peer
function mpFindLobbyEntry(peerId) {
  return mp.lobby.find(p => p.peerId === peerId);
}

// Helper: is local client at this slot index?
function mpIsLocalSlot(slotIdx) {
  return state && state.localSlotIdx === slotIdx;
}

// ============================================================
// LOBBY MANAGEMENT (S10.1 + S10.4)
// ============================================================

function onClientConnected(conn) {
  if (!mp.isHost) return;
  // Allocate first available slot 1-3 (slot 0 is host)
  const usedSlots = mp.lobby.map(p => p.slotIdx);
  let slot = -1;
  for (let i = 1; i < NUM_PLAYERS; i++) {
    if (!usedSlots.includes(i)) { slot = i; break; }
  }
  if (slot === -1) {
    // Lobby full — reject
    conn.send({ type: "lobbyFull" });
    setTimeout(() => conn.close(), 100);
    return;
  }
  // Provisional name from connection metadata; finalised on "join" message
  const name = conn.metadata?.name || `Player ${slot}`;
  mp.lobby.push({ peerId: conn.peer, name, slotIdx: slot });
  mp.connections.push(conn);
  // Notify all clients of updated lobby
  mpBroadcast({ type: "lobbyUpdate", lobby: mp.lobby, hostName: mp.hostName });
  mp.onLobbyUpdate?.();
}

// HOST: when client sends "join" with their preferred name
function handleClientJoin(msg, conn) {
  const entry = mpFindLobbyEntry(conn.peer);
  if (entry) entry.name = msg.name;
  mpBroadcast({ type: "lobbyUpdate", lobby: mp.lobby, hostName: mp.hostName });
  mp.onLobbyUpdate?.();
}

// HOST: removes peer from lobby, fills slot with AI if game already started
function handlePeerClose(conn) {
  if (!mp.isHost) return;
  const entry = mpFindLobbyEntry(conn.peer);
  if (!entry) return;
  // Remove from lobby + connections
  mp.lobby = mp.lobby.filter(p => p.peerId !== conn.peer);
  mp.connections = mp.connections.filter(c => c !== conn);
  if (state && state.players) {
    // Game in progress: replace with AI (S10.5)
    handleHumanDisconnectInGame(entry.slotIdx);
  } else {
    // Lobby phase: just notify
    mpBroadcast({ type: "lobbyUpdate", lobby: mp.lobby, hostName: mp.hostName });
    mp.onLobbyUpdate?.();
  }
}

// CLIENT: host disconnected mid-game
function handleHostDisconnect() {
  if (mp.isHost) return;
  mp.onError?.("Host disconnesso. La partita è terminata.");
  // Tear down + return to splash
  mpDisconnect();
  if (typeof renderSplash === "function") {
    setTimeout(() => renderSplash(), 1500);
  }
}

// ============================================================
// MESSAGE DISPATCH
// ============================================================

function handlePeerMessage(msg, conn) {
  switch (msg.type) {
    // ── Lobby ──
    case "join":
      if (mp.isHost) handleClientJoin(msg, conn);
      break;
    case "lobbyUpdate":
      if (!mp.isHost) {
        mp.lobby = msg.lobby;
        mp.hostName = msg.hostName;
        mp.onLobbyUpdate?.();
      }
      break;
    case "lobbyFull":
      mp.onError?.("La partita è già iniziata o piena.");
      mpDisconnect();
      break;

    // ── Game flow ──
    case "gameStarted":
      // host → all: game has started, sync initial state + my slotIdx
      if (mp.isHost) return;
      handleClientGameStart(msg);
      break;
    case "stateUpdate":
      if (mp.isHost) return;
      handleStateUpdate(msg.state);
      break;
    case "gameEnded":
      if (mp.isHost) return;
      mp.onError?.(msg.reason || "Partita terminata");
      mpDisconnect();
      if (typeof renderSplash === "function") setTimeout(renderSplash, 1500);
      break;

    // ── Picks (client → host) ──
    case "pick":
      if (mp.isHost) handleNetworkedPick(msg, conn);
      break;
    case "pickRejected":
      if (!mp.isHost) {
        console.warn("[mp] pick rejected:", msg.reason);
        mp.onError?.(`Mossa rifiutata: ${msg.reason}`);
      }
      break;

    // ── Drafts (host ↔ client) ──
    case "draftRequest":
      if (!mp.isHost) handleDraftRequest(msg);
      break;
    case "draftResponse":
      if (mp.isHost) handleDraftResponse(msg, conn);
      break;
  }
}

// ============================================================
// STATE SERIALIZATION (S10.2)
// ============================================================

// Strip non-serializable fields (functions on OKR / scenario / event).
// Keep IDs so the receiver can lookup the full object from the local pools.
function serializeState(s) {
  if (!s) return null;
  return {
    quarter: s.quarter,
    pickIndex: s.pickIndex,
    pickOrder: [...(s.pickOrder || [])],
    pyramid: (s.pyramid || []).map(row =>
      row.map(slot => ({
        card: slot.card,        // pure data, JSON-safe
        faceUp: slot.faceUp,
        taken: slot.taken,
      }))
    ),
    players: (s.players || []).map(p => ({
      ...p,
      // OKRs: serialize as ID array
      okrs: (p.okrs || []).map(o => o.id),
      okrOptions: (p.okrOptions || []).map(o => o.id),
      // Vision is pure data (modifiers obj has no fns) — passthrough
      // visionOptions same
    })),
    log: (s.log || []).slice(0, 10),  // bandwidth: only last 10 entries
    phase: s.phase,
    activePicker: s.activePicker,
    activeEvent: s.activeEvent ? { id: s.activeEvent.id } : null,
    scenario: s.scenario ? { id: s.scenario.id } : null,
    counterMarketingPending: (s.counterMarketingPending || []).length, // count only
    deferredReveals: [],  // Block & React disabled in MP, ignore
    aiHighlight: s.aiHighlight,
    justPlayedCardId: s.justPlayedCardId,
    aiJustPlayed: s.aiJustPlayed,
    prevResources: s.prevResources,
    isDaily: !!s.isDaily,
    gameOver: !!s.gameOver,
    difficulty: s.difficulty,
    // localSlotIdx is NOT serialized — each client sets its own
  };
}

// Reconstruct full state object from serialized form. Lookups OKR / scenario
// / event references via global pools. Should be called only on clients (the
// host's state is never deserialized).
function deserializeState(serialized) {
  if (!serialized) return null;
  const s = { ...serialized };
  // Restore players' OKR refs
  s.players = (serialized.players || []).map(p => ({
    ...p,
    okrs: (p.okrs || []).map(id =>
      OKR_POOL.find(o => o.id === id)).filter(Boolean),
    okrOptions: (p.okrOptions || []).map(id =>
      OKR_POOL.find(o => o.id === id)).filter(Boolean),
  }));
  s.activeEvent = serialized.activeEvent
    ? (EVENT_POOL.find(e => e.id === serialized.activeEvent.id) || serialized.activeEvent)
    : null;
  s.scenario = serialized.scenario
    ? getScenarioById(serialized.scenario.id)
    : null;
  // counterMarketingPending: re-construct as empty array (client doesn't
  // need the actual queue, host manages it)
  s.counterMarketingPending = [];
  s.deferredReveals = [];
  s.log = serialized.log || [];
  return s;
}

// ============================================================
// GAME START (S10.3 + S10.4)
// ============================================================

// HOST: called when host clicks "Start" in lobby. Sets up player slots,
// fills empty seats with AI, then runs the normal startGame() flow.
function mpStartMultiplayerGame(scenarioId) {
  if (!mp.isHost) return;
  const aiPersonas = [
    { name: "Marco (Eng VP)" },
    { name: "Alessia (CMO)" },
    { name: "Karim (CDO)" },
  ];
  // Build the slot config: lobby entries + AI fillers
  const slotConfig = [];
  for (let i = 0; i < NUM_PLAYERS; i++) {
    const lobbyEntry = mp.lobby.find(p => p.slotIdx === i);
    if (lobbyEntry) {
      slotConfig.push({
        type: lobbyEntry.peerId === mp.localPeerId ? "human-host" : "human-remote",
        peerId: lobbyEntry.peerId,
        name: lobbyEntry.name,
      });
    } else {
      // Empty seat → fill with AI using the next available persona
      const aiIdx = slotConfig.filter(s => s.type === "ai").length;
      const persona = aiPersonas[aiIdx] || { name: `AI ${i}` };
      slotConfig.push({ type: "ai", peerId: null, name: persona.name });
    }
  }
  mp.slotConfig = slotConfig;
  // Notify all clients with their slot assignments + game params
  mp.lobby.filter(p => p.peerId !== mp.localPeerId).forEach(p => {
    mpSendToPeer(p.peerId, {
      type: "gameStarted",
      slotConfig,
      yourSlotIdx: p.slotIdx,
      scenarioId,
      difficulty: mp.difficulty,
    });
  });
  // Start the game on the host with multiplayer-aware setup
  startGameMultiplayer(scenarioId, slotConfig, 0);  // host always slotIdx 0
}

// CLIENT: receives gameStarted, sets up local state mirror
function handleClientGameStart(msg) {
  // We don't run game logic locally — we just need to know our slotIdx
  // and the scenario for the eventual stateUpdate
  state = state || {};
  state.localSlotIdx = msg.yourSlotIdx;
  state.difficulty = msg.difficulty;
  // First state update will arrive shortly via "stateUpdate"
  // For now, render a "Loading..." placeholder
  if (typeof renderMultiplayerLoading === "function") {
    renderMultiplayerLoading();
  }
}

// CLIENT: receives stateUpdate, replaces local state, re-renders.
// Fires celebration toasts/audio for the local POV by comparing pre/post state
// (mirrors the host's celebrateChanges behavior so each client gets feedback).
function handleStateUpdate(serialized) {
  const localSlot = state?.localSlotIdx ?? 0;
  // Snapshot pre-update for local-POV celebration detection
  let celebBefore = null, debtBefore = 0;
  if (state?.players?.[localSlot] && typeof snapshotCelebrationState === "function") {
    try {
      celebBefore = snapshotCelebrationState(state.players[localSlot]);
      debtBefore = state.players[localSlot].techDebt || 0;
    } catch (e) { /* if pre-state was malformed, skip */ }
  }
  // Apply update
  state = deserializeState(serialized);
  state.localSlotIdx = localSlot;  // preserve POV
  // Fire celebrations for the local POV player
  if (celebBefore && state.players?.[localSlot] && typeof celebrateChanges === "function") {
    try {
      celebrateChanges(state.players[localSlot], celebBefore, { debtBefore });
    } catch (e) { console.warn("[mp] celebrateChanges error", e); }
  }
  if (typeof render === "function") render();
}

// HOST: validate + apply a networked pick
function handleNetworkedPick(msg, conn) {
  const entry = mpFindLobbyEntry(conn.peer);
  if (!entry) {
    conn.send({ type: "pickRejected", reason: "unknown peer" });
    return;
  }
  const senderSlot = entry.slotIdx;
  // 1. Is it really this peer's turn?
  if (state.activePicker !== senderSlot) {
    conn.send({ type: "pickRejected", reason: "non è il tuo turno" });
    return;
  }
  // 2. Is the card pickable?
  if (!isPickable(msg.row, msg.col)) {
    conn.send({ type: "pickRejected", reason: "carta non pescabile" });
    return;
  }
  // 3. Apply via the existing host-side flow (re-uses humanPickCard logic)
  // Set activePicker's "isHuman" path. We call directly into rules.js.
  applyHostSidePick(msg.row, msg.col, senderSlot);
}

// HOST: actually apply a pick (reused for both local host clicks and remote picks)
function applyHostSidePick(row, col, slotIdx) {
  const player = state.players[slotIdx];
  const card = state.pyramid[row][col].card;
  const action = canAfford(player, card) ? "play" : "discard";
  const before = (typeof snapshotCelebrationState === "function")
    ? snapshotCelebrationState(player) : null;
  const result = takeFromPyramid(slotIdx, row, col, action);
  // Auto-reveal in MP (Block & React disabled)
  if (result.toReveal) {
    result.toReveal.slot.faceUp = true;
  }
  // Celebrations / OKR-done / award unlock toasts (host shows for own slot only)
  if (mpIsLocalSlot(slotIdx) && before && typeof celebrateChanges === "function") {
    celebrateChanges(player, before);
  }
  state.pickIndex++;
  state.justPlayedCardId = card.id + "_" + (player.played.length - 1);
  // Broadcast new state to everyone
  mpBroadcastState();
  if (typeof render === "function") render();
  // Continue pick loop
  if (typeof processNextPick === "function") {
    setTimeout(() => processNextPick(), 250);
  }
}

// HOST: broadcast current state to all clients
function mpBroadcastState() {
  if (!mp.isHost || !mp.active) return;
  mpBroadcast({ type: "stateUpdate", state: serializeState(state) });
}

// ============================================================
// DRAFTS — Vision + OKR (S10.3)
// ============================================================

// HOST: orchestrate Vision draft for all human slots in parallel.
// AI slots auto-pick via chooseAIVision. Returns Promise that resolves
// when all drafts complete. S10 fix: try/catch around setup + onPick so a
// throw inside the modal callback doesn't silently freeze the .then() chain.
function mpDraftVisionsForAll() {
  return new Promise((resolve, reject) => {
    let pending = 0;
    const onOnePicked = () => {
      pending--;
      if (pending === 0) resolve();
    };
    try {
      state.players.forEach((p, idx) => {
        if (p.slotType === "ai") {
          const aiPool = visionsForAI();
          p.visionOptions = pickRandom(aiPool, Math.min(3, aiPool.length));
          p.vision = chooseAIVision(idx, p.visionOptions);
          console.log("[mp] vision auto-picked for AI slot", idx, ":", p.vision?.id);
          return;
        }
        pending++;
        p.visionOptions = pickRandom(VISION_POOL, 3);
        if (p.slotType === "human-host") {
          showVisionDraftModal({
            options: p.visionOptions,
            onPick: (vision) => {
              try {
                p.vision = vision;
                console.log("[mp] host picked vision:", vision?.id);
                mpBroadcastState();
                onOnePicked();
              } catch (e) {
                console.error("[mp] vision onPick callback failed:", e);
                reject(e);
              }
            },
          });
        } else {
          // human-remote
          const visionIds = p.visionOptions.map(v => v.id);
          mpSendToPeer(p.peerId, {
            type: "draftRequest",
            kind: "vision",
            visionIds,
          });
          mp.pendingDrafts[p.peerId] = (response) => {
            try {
              p.vision = getVisionById(response.visionId);
              mpBroadcastState();
              onOnePicked();
            } catch (e) {
              console.error("[mp] vision draftResponse failed:", e);
              reject(e);
            }
          };
        }
      });
      if (pending === 0) resolve();
    } catch (e) {
      console.error("[mp] mpDraftVisionsForAll setup failed:", e);
      reject(e);
    }
  });
}

// HOST: orchestrate OKR draft for all human slots in parallel.
// S10 fix: try/catch + reject so a throw doesn't silently freeze the chain.
function mpDraftOkrsForAll() {
  return new Promise((resolve, reject) => {
    let pending = 0;
    const onOnePicked = () => {
      pending--;
      if (pending === 0) resolve();
    };
    try {
      state.players.forEach((p, idx) => {
        if (p.slotType === "ai") {
          // Already handled in startQuarter — okrOptions already drafted
          // and chooseAIOKR called. Just verify p.okrs is set.
          if (!p.okrs.length && p.okrOptions.length) {
            p.okrs = [chooseAIOKR(idx, p.okrOptions)];
          }
          return;
        }
        pending++;
        if (p.slotType === "human-host") {
          console.log("[mp] showing OKR draft modal for host (slot", idx, ")");
          showOKRDraftModal(() => {
            try {
              console.log("[mp] host picked OKR:", p.okrs?.[0]?.id);
              mpBroadcastState();
              onOnePicked();
            } catch (e) {
              console.error("[mp] OKR onComplete callback failed:", e);
              reject(e);
            }
          });
        } else {
          // human-remote
          const okrIds = p.okrOptions.map(o => o.id);
          mpSendToPeer(p.peerId, {
            type: "draftRequest",
            kind: "okr",
            okrIds,
          });
          mp.pendingDrafts[p.peerId] = (response) => {
            try {
              const chosen = OKR_POOL.find(o => o.id === response.okrId);
              if (chosen) p.okrs = [chosen];
              p.okrOptions = [];
              mpBroadcastState();
              onOnePicked();
            } catch (e) {
              console.error("[mp] OKR draftResponse failed:", e);
              reject(e);
            }
          };
        }
      });
      if (pending === 0) resolve();
    } catch (e) {
      console.error("[mp] mpDraftOkrsForAll setup failed:", e);
      reject(e);
    }
  });
}

// CLIENT: receive draftRequest, show modal, send response
function handleDraftRequest(msg) {
  if (msg.kind === "vision") {
    const options = msg.visionIds.map(id => getVisionById(id)).filter(Boolean);
    showVisionDraftModal({
      options,
      onPick: (vision) => {
        mpSendToHost({
          type: "draftResponse",
          kind: "vision",
          visionId: vision.id,
        });
      },
    });
  } else if (msg.kind === "okr") {
    const options = msg.okrIds.map(id =>
      OKR_POOL.find(o => o.id === id)).filter(Boolean);
    if (state && state.players && state.players[state.localSlotIdx]) {
      state.players[state.localSlotIdx].okrOptions = options;
    }
    showOKRDraftModal(() => {
      const me = state.players[state.localSlotIdx];
      const chosen = me.okrs[0];
      if (chosen) {
        mpSendToHost({
          type: "draftResponse",
          kind: "okr",
          okrId: chosen.id,
        });
      }
    });
  }
}

// HOST: receive draftResponse
function handleDraftResponse(msg, conn) {
  const cb = mp.pendingDrafts[conn.peer];
  if (cb) {
    delete mp.pendingDrafts[conn.peer];
    cb(msg);
  }
}

// ============================================================
// DISCONNECT MID-GAME (S10.5)
// ============================================================

function handleHumanDisconnectInGame(slotIdx) {
  if (!mp.isHost) return;
  const player = state.players[slotIdx];
  if (!player) return;
  if (typeof showToast === "function") {
    showToast({
      who: "DISCONNESSO",
      what: `<em>${player.name}</em> ha lasciato la partita. Continuo con AI.`,
      kind: "discard",
    });
  }
  // Convert to AI slot
  player.slotType = "ai";
  player.peerId = null;
  player.isHuman = false;
  // If a draft was pending for this peer, resolve it with auto-pick
  if (mp.pendingDrafts[player.peerId]) {
    delete mp.pendingDrafts[player.peerId];
  }
  // If the disconnected player was active, AI takes the turn
  mpBroadcastState();
  if (state.activePicker === slotIdx && typeof processNextPick === "function") {
    setTimeout(() => processNextPick(), 500);
  }
}

// ============================================================
// EXPORTS (window-globals via classic-script semantics)
// ============================================================
// (No explicit exports — function declarations + `mp` are global)
