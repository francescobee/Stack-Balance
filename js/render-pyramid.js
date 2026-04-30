"use strict";

// =============================================================
// render-pyramid.js — board rendering: the 4×6 Mahjong-style
// piramide condivisa. Estratto da render.js in S8.1.
// =============================================================

// ---------- PYRAMID (the board) ----------
function renderPyramidCard(slot, row, col) {
  // S10: localSlotIdx = 0 in single-player, but can be 1-3 for multiplayer clients.
  // Pyramid affordability + chain checks use the LOCAL POV player.
  const localIdx = state.localSlotIdx ?? 0;
  const player = state.players[localIdx];
  const depth = getDepth(row, col);
  const card = slot.card;
  const pickable = isPickable(row, col);
  const isHumanTurn = state.phase === "human";
  // S10: interactive only when it's MY turn (in single-player this is always
  // true when phase=human; in multiplayer requires activePicker === localIdx)
  const isMyTurn = state.activePicker === localIdx;
  const interactive = isHumanTurn && pickable && isMyTurn;
  const affordable = canAfford(player, card);

  const cls = ["pcard", `d${depth}`];
  if (slot.faceUp) cls.push("face-up"); else cls.push("face-down");
  if (pickable) cls.push("pickable");
  if (slot.faceUp) cls.push(card.dept);
  if (depth === 0 && slot.faceUp) {
    cls.push(affordable ? "affordable" : "unaffordable");
  }
  if (state.aiHighlight && state.aiHighlight.row === row && state.aiHighlight.col === col) {
    cls.push("ai-pulsing");
  }

  // S12.3: on phone (≤600px), wrap pick into a tap-to-detail overlay so the
  // user confirms explicitly. On tablet/desktop, click runs the pick directly
  // (existing behavior). On phone we also open the overlay for non-pickable
  // cards (face-down dietro / not-my-turn) in read-only mode for inspection;
  // tablet/desktop leave non-pickable cards inert.
  const onPhone = typeof isMobileViewport === "function" && isMobileViewport();
  let onClick = null;
  if (onPhone && (slot.faceUp || pickable)) {
    onClick = (ev) => {
      const cardEl = ev.currentTarget;
      showCardDetailModal({
        row, col, slot,
        isPickable: interactive,
        canAfford: interactive && affordable,
        onConfirm: () => humanPickCard(row, col, cardEl),
      });
    };
  } else if (interactive) {
    onClick = (ev) => humanPickCard(row, col, ev.currentTarget);
  }

  const c = el("div", {
    class: cls.join(" "),
    "data-name": slot.faceUp ? card.name : "",
    onclick: onClick,
  });

  if (depth === 0 && slot.faceUp) {
    const e = card.effect || {};
    const meta = CARD_META[card.id];

    // Wax-seal MAU stamp (top-right corner) — appended to card root, not inner
    if (e.vp) {
      const seal = el("div", { class: "vp-seal" });
      seal.appendChild(el("span", { class: "num" }, `+${e.vp}`));
      seal.appendChild(el("span", { class: "lbl" }, "MAU"));
      c.appendChild(seal);
    }

    const inner = el("div", { class: "pc-content" });

    // Card-mast (top header row): emblem + type
    const mast = el("div", { class: "card-mast" });
    mast.appendChild(el("span", {
      class: `dept-emblem ${card.dept}`,
      title: deptLabel(card.dept)
    }, DEPT_LETTER[card.dept] || "?"));
    mast.appendChild(el("span", { class: "type-label" }, card.type));
    inner.appendChild(mast);

    // Name (italic Fraunces, hero of the card)
    inner.appendChild(el("div", { class: "name" }, card.name));

    // Per-dept ornament divider (fleuron)
    const orn = el("div", { class: "ornament" });
    orn.appendChild(el("span", { class: "glyph" }, DEPT_ORNAMENT[card.dept] || "❦"));
    inner.appendChild(orn);

    // Description
    inner.appendChild(el("div", { class: "desc" }, card.desc));

    if (card.permanent) inner.appendChild(el("div", { class: "perm-tag" }, "Effetto permanente"));

    // Chain info
    if (card.chainFrom && card.chainDiscount) {
      const triggered = isChainTriggered(player, card);
      const names = card.chainFrom.map(chainNameById).join(" / ");
      const dParts = Object.entries(card.chainDiscount).map(([k, v]) => {
        const ic = { budget: "💰", tempo: "⏱", talento: "🧠", dati: "📊", morale: "🚀" }[k] || k;
        return `${ic}-${v}`;
      }).join(" ");
      const chainEl = el("div", {
        class: "chain-info" + (triggered ? " active" : ""),
        title: `Catena: se possiedi ${names}, ottieni sconto ${dParts}`
      }, `${triggered ? "Catena attiva" : "Catena"}: ${names} → ${dParts}`);
      inner.appendChild(chainEl);
    }

    // Cost / Effect row
    const adj = adjustedCost(player, card);
    const costParts = [];
    if (adj.budget) costParts.push(`💰${adj.budget}`);
    if (adj.tempo) costParts.push(`⏱${adj.tempo}`);
    if (adj.talento) costParts.push(`🧠${adj.talento}`);
    if (adj.dati) costParts.push(`📊${adj.dati}`);
    const effParts = [];
    if (e.budget) effParts.push(`💰+${e.budget}`);
    if (e.tempo) effParts.push(`⏱+${e.tempo}`);
    if (e.talento) effParts.push(`🧠+${e.talento}`);
    if (e.dati) effParts.push(`📊+${e.dati}`);
    if (e.morale) effParts.push(`🚀+${e.morale}`);
    if (e.techDebt) effParts.push(`🐞${e.techDebt}`);
    if (e.opponentsTempo) effParts.push(`⏱ avv. ${e.opponentsTempo}`);

    const costRow = el("div", { class: "cost-row" });
    costRow.appendChild(el("div", { class: "lbl" }, "Costo"));
    costRow.appendChild(el("div", { class: "cost-line" + (affordable ? "" : " bad") }, costParts.join(" ") || "Gratis"));
    if (effParts.length > 0) {
      costRow.appendChild(el("div", { class: "lbl" }, "Yield"));
      costRow.appendChild(el("div", { class: "eff-line" }, effParts.join(" ")));
    }
    inner.appendChild(costRow);

    c.appendChild(inner);

    // Footer: quarter origin + card number (subtle, bottom-right)
    if (meta) c.appendChild(el("div", { class: "card-foot" }, `Q${meta.quarter} · Nº ${meta.num}`));
  }
  return c;
}

function renderPyramid() {
  const isHumanTurn = state.phase === "human";
  const root = el("div", { class: "stage pyramid-area" + (isHumanTurn ? " your-turn" : "") });
  root.appendChild(el("span", { class: "stage-label" }, "The Board"));

  const meta = el("span", { class: "stage-meta" });
  meta.appendChild(makeTurnIndicator());
  // S10 fix: state.pyramid can be empty array [] during early multiplayer
  // broadcasts (post-Vision draft, pre-startQuarter). Guard against that to
  // avoid "Cannot read properties of undefined (reading '0')" TypeErrors.
  const pyramid = state.pyramid || [];
  const remaining = pyramid.flat().filter(s => !s.taken).length;
  meta.appendChild(document.createTextNode(`  ·  ${remaining} carte rimaste`));
  root.appendChild(meta);

  const grid = el("div", { class: "pyramid" });
  if (pyramid.length > 0) {
    for (let col = 0; col < PYR_COLS; col++) {
      const colDiv = el("div", { class: "pcol" });
      for (let row = 0; row < PYR_ROWS; row++) {
        const slot = pyramid[row]?.[col];
        if (!slot || slot.taken) continue;
        colDiv.appendChild(renderPyramidCard(slot, row, col));
      }
      grid.appendChild(colDiv);
    }
  }
  root.appendChild(grid);
  return root;
}
