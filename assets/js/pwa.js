import { showAlert, showModal } from "./modal.js";
import { storage } from "./storage.js";

const DISMISS_KEY = "rbi_install_dismissed_at";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;
let deferredPrompt = null;
let banner = null;

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function dismissedRecently() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return at && Date.now() - at < DISMISS_MS;
  } catch (err) {
    return false;
  }
}

function updateInstallUi() {
  document.querySelectorAll("[data-install-app]").forEach((btn) => {
    btn.hidden = isStandalone();
  });
  document.querySelectorAll("[data-install-status]").forEach((el) => {
    el.textContent = isStandalone()
      ? "Installed on this device."
      : deferredPrompt
        ? "Ready to install."
        : isIOS()
          ? "Tap Install, then use Safari's Share > Add to Home Screen."
          : "Use Install, or your browser menu > Install app.";
  });
}

export function canInstall() {
  return !!deferredPrompt;
}

export async function promptInstall() {
  if (isStandalone()) {
    await showAlert("The portal is already installed on this device.", { title: "Already installed", icon: "fa-circle-check", variant: "success" });
    return;
  }
  if (deferredPrompt) {
    const prompt = deferredPrompt;
    deferredPrompt = null;
    prompt.prompt();
    try { await prompt.userChoice; } catch (err) { /* ignore */ }
    updateInstallUi();
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
    return;
  }
  await showModal({
    title: "Install the portal",
    icon: "fa-download",
    html: `<p class="custom-modal-text">Open your browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>. In Chrome or Edge the icon appears in the address bar.</p>`,
    buttons: [{ label: "Got it", variant: "primary", value: true, autofocus: true }]
  });
}

function ensureBanner() {
  if (banner || isStandalone() || dismissedRecently() || !storage.getCurrentUser()) return;
  if (document.getElementById("loginForm")) return;

  banner = document.createElement("div");
  banner.className = "install-banner";
  banner.setAttribute("role", "region");
  banner.setAttribute("aria-label", "Install application");
  banner.innerHTML = `
    <div class="install-banner-text">
      <strong>Install the school portal</strong>
      <span>Open it full-screen from your home screen, even with a weak connection.</span>
    </div>
    <div class="install-banner-actions">
      <button type="button" class="btn btn-sm btn-primary" data-install-app data-install-banner>Install app</button>
      <button type="button" class="btn btn-sm btn-ghost" data-install-dismiss aria-label="Dismiss install prompt"><i class="fas fa-times"></i></button>
    </div>`;
  document.body.appendChild(banner);

  banner.querySelector("[data-install-dismiss]").addEventListener("click", () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch (err) { /* ignore */ }
    banner.remove();
    banner = null;
  });
  banner.querySelector("[data-install-banner]").addEventListener("click", () => promptInstall());
}

export function initPwa() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    updateInstallUi();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    if (banner) {
      banner.remove();
      banner = null;
    }
    updateInstallUi();
  });
  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-install-app]");
    if (!target) return;
    event.preventDefault();
    promptInstall();
  });
  updateInstallUi();
  window.setTimeout(ensureBanner, 1400);
}
