import { SCHOOL_CONFIG } from "./config.js";
import { initNavigation } from "./navigation.js";
import { initModals } from "./modal.js";
import { initPasswordToggles } from "./forms.js";
import { initAuth } from "./auth.js";
import { hydrate } from "./data/store.js";
import { toast } from "./notifications.js";

function setConfig() {
  window.SCHOOL_CONFIG = SCHOOL_CONFIG;
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(new URL("../../service-worker.js", import.meta.url)).catch(() => {
      // Registration is best-effort; app remains fully functional without it.
    });
  });
}

function initDataLayer() {
  document.addEventListener("data:error", (e) => {
    const detail = (e && e.detail) || {};
    const label = detail.collection ? ` (${detail.collection})` : "";
    toast(`Could not save to the database${label}. Please retry.`, "error");
  });
  // Login page never renders the dataset; hydrating it there only steals
  // main-thread time from the keyboard. Pages inside the portal hydrate themselves.
  if (document.getElementById("loginForm")) return;
  hydrate().catch(() => {
    // Errors are already surfaced via the data:error event.
  });
}

let initialized = false;
export function initApp() {
  if (initialized) return;
  initialized = true;
  setConfig();
  initNavigation();
  initModals();
  initPasswordToggles();
  initDataLayer();
  initAuth();
  registerServiceWorker();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
