"use strict";

// =============================================================
// main.js — entry point. Boots the game on page load.
// First-run flow: ensure a user profile exists before showing
// the splash screen.
// =============================================================

(function boot() {
  // S7.1: respect user's reduced-motion preference at startup
  if (getReducedMotion()) document.body.classList.add("reduced-motion");

  // S10: URL hash room link. If user opens index.html#room=ABCD, fast-path
  // them to the join modal with the code prefilled.
  const roomMatch = location.hash.match(/room=([A-Z]{4})/i);
  const prefilledRoom = roomMatch ? roomMatch[1].toUpperCase() : null;

  const afterProfile = () => {
    if (prefilledRoom) {
      // Clear hash so page refresh doesn't re-trigger
      history.replaceState(null, "", location.pathname);
      // Render splash in the background, then open join modal
      renderSplash();
      showMultiplayerJoinModal({ prefilledCode: prefilledRoom });
    } else {
      renderSplash();
    }
  };

  if (!getProfile()) {
    document.getElementById("app").innerHTML = "";
    showProfileSetup({ onComplete: afterProfile });
  } else {
    afterProfile();
  }
})();
