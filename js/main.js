"use strict";

// =============================================================
// main.js — entry point. Boots the game on page load.
// First-run flow: ensure a user profile exists before showing
// the splash screen.
// =============================================================

(function boot() {
  // S7.1: respect user's reduced-motion preference at startup
  if (getReducedMotion()) document.body.classList.add("reduced-motion");

  if (!getProfile()) {
    // No saved profile: render an empty app shell, then show
    // the setup modal as a blocking step. After the user
    // submits, fall through to the splash.
    document.getElementById("app").innerHTML = "";
    showProfileSetup({ onComplete: renderSplash });
  } else {
    renderSplash();
  }
})();
