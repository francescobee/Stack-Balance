"use strict";

// =============================================================
// render-card-detail.js — S12.3 (Phase 12)
//
// Tap-to-detail fullscreen overlay shown when a phone user taps
// any pyramid card. Replaces the direct click → humanPickCard
// flow on mobile with an explicit confirm step:
//
//   • Pickable + affordable → "← Annulla" + "🃏 Pesca"
//   • Pickable + non-affordable → "← Annulla" + "❌ Scarta (+2 💰)"
//   • Not pickable (face-down dietro / taken) → "Chiudi" only
//
// On desktop and tablet (> 600px) the wrapper bypasses this and
// triggers humanPickCard directly. The wrapping lives in
// render-pyramid.js (function onPyramidCardTap).
//
// Cross-mode: works in single-player, P2P MP, and Hot Seat without
// branching — humanPickCard already routes correctly via
// state.localSlotIdx + state.activePicker.
// =============================================================

function showCardDetailModal({ row, col, slot, isPickable, canAfford, onConfirm }) {
  if (!slot || !slot.card) return;
  const card = slot.card;
  const faceUp = !!slot.faceUp;
  const localIdx = state.localSlotIdx ?? 0;
  const player = state.players[localIdx];
  const e = card.effect || {};
  const meta = (typeof CARD_META !== "undefined") ? CARD_META[card.id] : null;

  const root = el("div", { class: "modal-bg", id: "cardDetailBg",
    onclick: (ev) => { if (ev.target.id === "cardDetailBg") root.remove(); } });
  const modal = el("div", { class: "modal card-detail" });

  // === Header (eyebrow + close X) ===
  const header = el("div", { class: "cd-header" });
  header.appendChild(el("div", { class: "cd-eyebrow" },
    faceUp
      ? `${deptLabel(card.dept)}${meta ? ` · Q${meta.quarter} · Nº ${meta.num}` : ""}`
      : "Carta coperta · Pesca alla cieca"));
  const closeBtn = el("button", { class: "cd-close", type: "button",
    "aria-label": "Chiudi", onclick: () => root.remove() }, "✕");
  header.appendChild(closeBtn);
  modal.appendChild(header);

  // === Face-down view: keep the mystery — render the card-back monogram,
  //     skip cost/effect/chain, action bar offers blind pick if pickable. ===
  if (!faceUp) {
    const big = el("div", { class: "cd-card pcard d0 face-down" });
    big.appendChild(el("div", { class: "cd-mystery-hint" },
      "Verrà rivelata solo se la peschi."));
    modal.appendChild(big);

    const actions = el("div", { class: "cd-actions" });
    if (isPickable) {
      actions.appendChild(el("button", {
        type: "button", class: "cd-cancel",
        onclick: () => root.remove(),
      }, "← Annulla"));
      actions.appendChild(el("button", {
        type: "button", class: "cd-confirm primary",
        onclick: () => {
          root.remove();
          if (typeof onConfirm === "function") onConfirm();
        },
      }, "🃏 Pesca alla cieca"));
    } else {
      actions.appendChild(el("button", {
        type: "button", class: "cd-cancel cd-cancel-only",
        onclick: () => root.remove(),
      }, "Chiudi"));
    }
    modal.appendChild(actions);

    root.appendChild(modal);
    document.body.appendChild(root);
    return;
  }

  // === Big card render (reuses the same DOM shape produced by
  //     renderPyramidCard for d0 face-up — we synthesize it inline so
  //     the styling we already wrote for desktop pyramid carries over) ===
  const big = el("div", { class: `cd-card pcard d0 face-up ${card.dept}` });

  // VP seal (top-right corner)
  if (e.vp) {
    const seal = el("div", { class: "vp-seal" });
    seal.appendChild(el("span", { class: "num" }, `+${e.vp}`));
    seal.appendChild(el("span", { class: "lbl" }, "MAU"));
    big.appendChild(seal);
  }

  const inner = el("div", { class: "pc-content" });

  // Card-mast (dept emblem + type label)
  const mast = el("div", { class: "card-mast" });
  mast.appendChild(el("span", {
    class: `dept-emblem ${card.dept}`,
    title: deptLabel(card.dept),
  }, (typeof DEPT_LETTER !== "undefined" && DEPT_LETTER[card.dept]) || "?"));
  mast.appendChild(el("span", { class: "type-label" }, card.type));
  inner.appendChild(mast);

  // Name (italic Fraunces)
  inner.appendChild(el("div", { class: "name" }, card.name));

  // Ornament fleuron
  const orn = el("div", { class: "ornament" });
  orn.appendChild(el("span", { class: "glyph" },
    (typeof DEPT_ORNAMENT !== "undefined" && DEPT_ORNAMENT[card.dept]) || "❦"));
  inner.appendChild(orn);

  // Description
  inner.appendChild(el("div", { class: "desc" }, card.desc));

  if (card.permanent) inner.appendChild(el("div", { class: "perm-tag" }, "Effetto permanente"));

  // Chain info (with discount preview if triggered)
  if (card.chainFrom && card.chainDiscount) {
    const triggered = (typeof isChainTriggered === "function")
      ? isChainTriggered(player, card) : false;
    const names = card.chainFrom
      .map(id => (typeof chainNameById === "function" ? chainNameById(id) : id))
      .join(" / ");
    const dParts = Object.entries(card.chainDiscount).map(([k, v]) => {
      const ic = { budget: "💰", tempo: "⏱", talento: "🧠", dati: "📊", morale: "🚀" }[k] || k;
      return `${ic}-${v}`;
    }).join(" ");
    inner.appendChild(el("div", {
      class: "chain-info" + (triggered ? " active" : ""),
    }, `${triggered ? "Catena attiva" : "Catena"}: ${names} → ${dParts}`));
  }

  // Cost / Yield row
  const adj = (typeof adjustedCost === "function") ? adjustedCost(player, card) : (card.cost || {});
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
  costRow.appendChild(el("div", {
    class: "cost-line" + (canAfford ? "" : " bad"),
  }, costParts.join(" ") || "Gratis"));
  if (effParts.length > 0) {
    costRow.appendChild(el("div", { class: "lbl" }, "Yield"));
    costRow.appendChild(el("div", { class: "eff-line" }, effParts.join(" ")));
  }
  inner.appendChild(costRow);

  big.appendChild(inner);
  modal.appendChild(big);

  // === Action bar (sticky bottom) ===
  const actions = el("div", { class: "cd-actions" });
  if (isPickable) {
    actions.appendChild(el("button", {
      type: "button", class: "cd-cancel",
      onclick: () => root.remove(),
    }, "← Annulla"));

    const confirmLabel = canAfford ? "🃏 Pesca" : "❌ Scarta (+2 💰)";
    const confirmCls = canAfford ? "primary" : "warn";
    actions.appendChild(el("button", {
      type: "button", class: `cd-confirm ${confirmCls}`,
      onclick: () => {
        root.remove();
        if (typeof onConfirm === "function") onConfirm();
      },
    }, confirmLabel));
  } else {
    // Read-only view (face-down behind row, or already taken)
    actions.appendChild(el("button", {
      type: "button", class: "cd-cancel cd-cancel-only",
      onclick: () => root.remove(),
    }, "Chiudi"));
  }
  modal.appendChild(actions);

  root.appendChild(modal);
  document.body.appendChild(root);
}
