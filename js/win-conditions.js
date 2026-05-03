"use strict";

// =============================================================
// win-conditions.js — alternative victory rules (S17)
//
// Each scenario LOCKS one win condition (no mid-game switch, no
// chooser modal). Standard → "mau" (the original "max MAU at Q3
// end wins"). Bear Market → "survival", AI Hype → "acquisition",
// Remote First → "efficiency".
//
// Each entry shape:
//   id, name, icon
//   description: string                       — one-line UX
//   selectWinner(players, state) → player|null — null = no winner (draw)
//   earlyTermination?(state) → boolean         — optional, fires endGame mid-Q
//   endGameTitleYou(): string                  — modal banner when local won
//   endGameTitleOther(winner): string          — modal banner otherwise
//   masthead?: { icon, label, hint(state) }    — optional in-game reminder
//
// state.winCondition is populated at game start from state.scenario.winConditionId
// (defaulting to "mau" for safety) and consumed by endGame/showEndGameModal/
// endOfQuarter in game.js.
// =============================================================

const WIN_CONDITION_POOL = [
  // ───────────────────────────────────────────────────────────
  // STANDARD — original behavior. Picked when scenario doesn't
  // pin one (or pins "mau" explicitly).
  // ───────────────────────────────────────────────────────────
  {
    id: "mau",
    name: "MAU Race",
    icon: "📈",
    description: "Più K MAU finali a Q3 end vince.",
    selectWinner(players /* , state */) {
      const ranked = [...players].sort((a, b) => b.vp - a.vp);
      return ranked[0] || null;
    },
    endGameTitleYou()   { return "🎉 Promosso a CTO!"; },
    endGameTitleOther(w) { return `🏆 ${w.name} promosso a CTO`; },
  },

  // ───────────────────────────────────────────────────────────
  // SURVIVAL — Bear Market. Vince chi sopravvive con morale > 0
  // a Q3 end; tiebreak per MAU. Se nessuno sopravvive → no winner.
  // ───────────────────────────────────────────────────────────
  {
    id: "survival",
    name: "Survival",
    icon: "💀",
    description: "Vince chi a fine Q3 ha morale > 0 (tiebreak: MAU). Se nessuno sopravvive: nessun vincitore.",
    selectWinner(players /* , state */) {
      const survivors = players.filter(p => p.morale > 0);
      if (survivors.length === 0) return null;
      const ranked = [...survivors].sort((a, b) => b.vp - a.vp);
      return ranked[0];
    },
    endGameTitleYou()   { return "🩺 Sei sopravvissuto al mercato!"; },
    endGameTitleOther(w) {
      if (!w) return "💀 Nessun sopravvissuto. Il mercato ha vinto.";
      return `🩺 ${w.name} è l'unico sopravvissuto`;
    },
    masthead: {
      icon: "💀",
      label: "Survival",
      hint: () => "morale > 0 a Q3 end",
    },
  },

  // ───────────────────────────────────────────────────────────
  // ACQUISITION — AI Hype Wave. Primo a 40K MAU a qualsiasi Q-end
  // → win early. Altrimenti standard MAU race a Q3 end.
  // ───────────────────────────────────────────────────────────
  {
    id: "acquisition",
    name: "Acquisition",
    icon: "🎯",
    description: "Primo a 40K MAU a qualsiasi Q-end vince subito. Altrimenti, max MAU a Q3 end.",
    selectWinner(players /* , state */) {
      // If anyone hit the threshold, prefer them; else fall back to MAU race.
      const overshooting = players.filter(p => p.vp >= 40);
      if (overshooting.length > 0) {
        const ranked = [...overshooting].sort((a, b) => b.vp - a.vp);
        return ranked[0];
      }
      const ranked = [...players].sort((a, b) => b.vp - a.vp);
      return ranked[0] || null;
    },
    earlyTermination(state) {
      return (state.players || []).some(p => p.vp >= 40);
    },
    endGameTitleYou()   { return "💼 Acquisita: 40K+ MAU raggiunti!"; },
    endGameTitleOther(w) { return `💼 ${w.name} acquisita: 40K+ MAU`; },
    masthead: {
      icon: "🎯",
      label: "Acquisition",
      hint: (state) => {
        const top = Math.max(0, ...((state.players || []).map(p => p.vp || 0)));
        return `40K to win · top ${top}K`;
      },
    },
  },

  // ───────────────────────────────────────────────────────────
  // EFFICIENCY — Remote First. Vince chi ha il miglior rapporto
  // MAU / risorse spese (budget speso + talento usato). Premia chi
  // fa molto con poco. A parità di rapporto, chi ha più MAU.
  // ───────────────────────────────────────────────────────────
  {
    id: "efficiency",
    name: "Efficiency",
    icon: "⚖️",
    description: "Vince il miglior rapporto MAU / risorse spese (budget + talento).",
    selectWinner(players /* , state */) {
      // Compute spent: starting budget+talento minus current. We can't trust
      // current values alone (may be modified mid-game) — use played[] cards
      // to derive total cost paid. Falls back to "1" to avoid div-by-zero.
      function spent(p) {
        let total = 0;
        (p.played || []).forEach(c => {
          const cost = c.cost || {};
          total += (cost.budget || 0);
          total += (cost.talento || 0);
        });
        return Math.max(1, total);
      }
      function score(p) { return (p.vp || 0) / spent(p); }
      const ranked = [...players].sort((a, b) => {
        const da = score(b) - score(a);
        return da !== 0 ? da : (b.vp - a.vp);
      });
      return ranked[0] || null;
    },
    endGameTitleYou()   { return "⚙️ Operatività ottimale: massima efficienza!"; },
    endGameTitleOther(w) { return `⚙️ ${w.name} ha la miglior efficienza`; },
    masthead: {
      icon: "⚖️",
      label: "Efficiency",
      hint: () => "best MAU / spesa",
    },
  },
];

function getWinConditionById(id) {
  return WIN_CONDITION_POOL.find(w => w.id === id) || WIN_CONDITION_POOL[0];
}
