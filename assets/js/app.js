import { SCHOOL_CONFIG } from "./config.js";
import { initNavigation } from "./navigation.js";
import { initModals } from "./modal.js";
import { initPasswordToggles } from "./forms.js";
import { initAuth } from "./auth.js";

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

export function initApp() {
  setConfig();
  initNavigation();
  initModals();
  initPasswordToggles();
  initAuth();
  registerServiceWorker();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
