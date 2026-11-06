import { showAlert, showModal } from "./modal.js";
import { storage } from "./storage.js";

const STORAGE_KEY = "rbi_pwa_install_state";
const DEFAULT_COOLDOWN_FIRST = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_COOLDOWN_REPEAT = 14 * 24 * 60 * 60 * 1000;

let deferredPrompt = null;
let installBanner = null;

function isCurrentlyStandalone() {
  try {
    return !!(window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true);
  } catch (err) {
    return false;
  }
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function createDefaultState() {
  return {
    key: STORAGE_KEY,
    lastDismissed: 0,
    dismissalCount: 0,
    lastPromptShown: 0,
    nextEligibleAt: 0,
    isCurrentlyInstalled: false,
    cooldownFirst: DEFAULT_COOLDOWN_FIRST,
    cooldownRepeat: DEFAULT_COOLDOWN_REPEAT
  };
}

function readStoredState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    const state = JSON.parse(raw);
    state.cooldownFirst = state.cooldownFirst !== undefined ? state.cooldownFirst : DEFAULT_COOLDOWN_FIRST;
    state.cooldownRepeat = state.cooldownRepeat !== undefined ? state.cooldownRepeat : DEFAULT_COOLDOWN_REPEAT;
    state.lastDismissed = state.lastDismissed !== undefined ? state.lastDismissed : 0;
    state.dismissalCount = state.dismissalCount !== undefined ? state.dismissalCount : 0;
    state.lastPromptShown = state.lastPromptShown !== undefined ? state.lastPromptShown : 0;
    state.nextEligibleAt = state.nextEligibleAt !== undefined ? state.nextEligibleAt : 0;
    state.isCurrentlyInstalled = state.isCurrentlyInstalled !== undefined ? state.isCurrentlyInstalled : false;
    return state;
  } catch (err) {
    console.warn("Failed to read PWA install state", err);
    return createDefaultState();
  }
}

function writeStoredState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("Failed to write PWA install state", err);
  }
}

function updateInstallationStatus() {
  const state = readStoredState();
  const currentlyInstalled = isCurrentlyStandalone();
  let statusChanged = false;
  if (state.isCurrentlyInstalled && !currentlyInstalled) {
    state.isCurrentlyInstalled = false;
    writeStoredState(state);
    statusChanged = true;
  }
  if (!state.isCurrentlyInstalled && currentlyInstalled) {
    state.isCurrentlyInstalled = true;
    state.dismissalCount = 0;
    state.nextEligibleAt = 0;
    writeStoredState(state);
    statusChanged = true;
  }
  return statusChanged;
}

function isEligibleForPrompt(state) {
  if (state.isCurrentlyInstalled && isCurrentlyStandalone()) {
    return false;
  }
  const now = Date.now();
  if (state.nextEligibleAt && now >= state.nextEligibleAt) {
    if (state.isCurrentlyInstalled && isCurrentlyStandalone()) {
      return false;
    }
    state.nextEligibleAt = 0;
    writeStoredState(state);
  }
  if (state.nextEligibleAt && now < state.nextEligibleAt) {
    return false;
  }
  return true;
}

function recordDismissal() {
  const state = readStoredState();
  const now = Date.now();
  state.lastDismissed = now;
  state.dismissalCount += 1;
  if (state.dismissalCount >= 2) {
    state.nextEligibleAt = now + state.cooldownRepeat;
  } else {
    state.nextEligibleAt = now + state.cooldownFirst;
  }
  state.lastPromptShown = 0;
  writeStoredState(state);
}

function recordPromptShown() {
  const state = readStoredState();
  state.lastPromptShown = Date.now();
  writeStoredState(state);
}

function updateInstallUi() {
  const isInstalled = isCurrentlyStandalone();
  document.querySelectorAll("[data-install-status]").forEach((el) => {
    el.textContent = isInstalled
      ? "Installed on this device."
      : deferredPrompt
        ? "Ready to install."
        : isIOS()
          ? "Tap Install, then use Safari's Share > Add to Home Screen."
          : "Use browser menu > Install app or Add to Home Screen.";
  });
  document.querySelectorAll("[data-install-app]").forEach((btn) => {
    btn.hidden = isInstalled;
  });
}

function createBanner(message, actionText, dismissText) {
  const banner = document.createElement("div");
  banner.className = "install-banner";
  banner.setAttribute("role", "region");
  banner.setAttribute("aria-label", "Install application");
  banner.innerHTML = `
    <div class="install-banner-content">
      <strong>${message}</strong>
      <span>Open it full-screen from your home screen, even with a weak connection.</span>
    </div>
    <div class="install-banner-actions">
      <button type="button" class="btn btn-sm btn-primary" data-install-accept>${actionText}</button>
      <button type="button" class="btn btn-sm btn-ghost" data-install-dismiss aria-label="Dismiss install prompt"><i class="fas fa-times"></i> ${dismissText}</button>
    </div>`;
  document.body.appendChild(banner);
  return banner;
}

async function promptNativeInstall() {
  if (!deferredPrompt) {
    if (isIOS()) {
      await showModal({
        title: "Install on iPhone or iPad",
        icon: "fa-mobile-screen",
        html: `<ol class="install-steps">
          <li>Open this portal in <strong>Safari</strong>.</li>
          <li>Tap the <strong>Share</strong> button.</li>
          <li>Choose <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.</li>
        </ol>`,
        buttons: [{ label: "Got it", variant: "primary", value: true, autofocus: true }]
      });
    } else {
      await showModal({
        title: "Install the portal",
        icon: "fa-download",
        html: `<p class="custom-modal-text">Open your browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>. In Chrome or Edge the icon appears in the address bar.</p>`,
        buttons: [{ label: "Got it", variant: "primary", value: true, autofocus: true }]
      });
    }
    return;
  }
  deferredPrompt.prompt();
  try {
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      deferredPrompt = null;
      if (installBanner) {
        installBanner.remove();
        installBanner = null;
      }
      const state = readStoredState();
      state.isCurrentlyInstalled = true;
      state.dismissalCount = 0;
      state.nextEligibleAt = 0;
      writeStoredState(state);
      updateInstallUi();
    } else {
      deferredPrompt = null;
      if (installBanner) {
        recordDismissal();
        installBanner.remove();
        installBanner = null;
      }
      updateInstallUi();
    }
  } catch (err) {
    console.warn("Install prompt user choice failed", err);
    deferredPrompt = null;
    if (installBanner) {
      installBanner.remove();
      installBanner = null;
    }
    updateInstallUi();
  }
}

function showInstallPrompt() {
  const state = readStoredState();
  if (isCurrentlyStandalone()) {
    updateInstallUi();
    recordPromptShown();
    return;
  }
  if (!isEligibleForPrompt(state)) {
    updateInstallUi();
    return;
  }
  if (installBanner) return;
  installBanner = createBanner(
    "Install the school portal",
    "Install app",
    "Close"
  );
  const installBtn = installBanner.querySelector("[data-install-accept]");
  installBtn.addEventListener("click", () => {
    promptNativeInstall();
  });
  const dismissBtn = installBanner.querySelector("[data-install-dismiss]");
  dismissBtn.addEventListener("click", () => {
    recordDismissal();
    if (installBanner) {
      installBanner.remove();
      installBanner = null;
    }
    updateInstallUi();
  });
  installBanner.addEventListener("click", (e) => {
    const target = e.target;
    if (target === installBanner) {
      recordDismissal();
      if (installBanner) {
        installBanner.remove();
        installBanner = null;
      }
      updateInstallUi();
    }
  });
  recordPromptShown();
}

export function canInstall() {
  return !!deferredPrompt;
}

export async function handleManualInstall() {
  if (isCurrentlyStandalone()) {
    await showAlert("The portal is already installed on this device.", {
      title: "Already installed",
      icon: "fa-circle-check",
      variant: "success"
    });
    return;
  }
  if (deferredPrompt) {
    promptNativeInstall();
    return;
  }
  if (isIOS()) {
    await showModal({
      title: "Install on iPhone or iPad",
      icon: "fa-mobile-screen",
      html: `<ol class="install-steps">
        <li>Open this portal in <strong>Safari</strong>.</li>
        <li>Tap the <strong>Share</strong> button.</li>
        <li>Choose <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.</li>
      </ol>`,
      buttons: [{ label: "Got it", variant: "primary", value: true, autofocus: true }]
    });
  } else {
    await showModal({
      title: "Install the portal",
      icon: "fa-download",
      html: `<p class="custom-modal-text">Open your browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>. In Chrome or Edge the icon appears in the address bar.</p>`,
      buttons: [{ label: "Got it", variant: "primary", value: true, autofocus: true }]
    });
  }
}

export async function promptInstall() {
  return handleManualInstall();
}

export function initPwa() {
  readStoredState();
  updateInstallationStatus();
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    updateInstallUi();
  });
  window.addEventListener("appinstalled", (event) => {
    deferredPrompt = null;
    if (installBanner) {
      installBanner.remove();
      installBanner = null;
    }
    const state = readStoredState();
    state.isCurrentlyInstalled = true;
    state.dismissalCount = 0;
    state.nextEligibleAt = 0;
    writeStoredState(state);
    updateInstallUi();
  });
  try {
    const mediumQuery = window.matchMedia("(display-mode: standalone)");
    mediumQuery.addEventListener("change", (event) => {
      updateInstallationStatus();
      updateInstallUi();
    });
  } catch (err) {
  }
  window.addEventListener("focus", () => {
    setTimeout(() => {
      updateInstallationStatus();
      updateInstallUi();
    }, 100);
  });
  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-install-app]");
    if (!target) return;
    event.preventDefault();
    promptInstall();
  });
  updateInstallUi();
  window.showInstallPrompt = showInstallPrompt;
  window.promptNativeInstall = promptNativeInstall;
  window.updateInstallUi = updateInstallUi;
  window.isCurrentlyStandalone = isCurrentlyStandalone;
  window.setTimeout(() => {
    if (!storage.getCurrentUser()) return;
    if (document.getElementById("loginForm")) return;
    showInstallPrompt();
  }, 1400);
}
