import { getCurrentUser } from "./auth.js";
import { appPath } from "./paths.js";
import { notificationService } from "./services.js";
import { showModal } from "./modal.js";
import { query, on } from "./utils.js";

const SOUND_PREF_KEY = "rbi_notification_sound";
const PERMISSION_DISMISS_KEY = "rbi_notification_prompt_decided";
const POLL_INTERVAL = 6000;

let seenIds = new Set();
let pollTimer = null;
let audioEl = null;
let audioUnlocked = false;

function soundEnabled() {
  return localStorage.getItem(SOUND_PREF_KEY) !== "off";
}

export function setSoundEnabled(enabled) {
  localStorage.setItem(SOUND_PREF_KEY, enabled ? "on" : "off");
}

export function isSoundEnabled() {
  return soundEnabled();
}

function notificationPageUrl() {
  return appPath("pages/notifications.html");
}

function unlockAudio() {
  if (audioUnlocked) return;
  audioEl = audioEl || new Audio(appPath("assets/audio/notification-chime.wav"));
  audioEl.volume = 0.5;
  const attempt = audioEl.play();
  if (attempt && attempt.then) {
    attempt.then(() => { audioEl.pause(); audioEl.currentTime = 0; audioUnlocked = true; }).catch(() => {});
  } else {
    audioUnlocked = true;
  }
}

function playChime() {
  if (!soundEnabled()) return;
  if (!audioUnlocked) return; // respect autoplay restrictions until user interacts
  try {
    audioEl = audioEl || new Audio(appPath("assets/audio/notification-chime.wav"));
    audioEl.currentTime = 0;
    audioEl.volume = 0.5;
    audioEl.play().catch(() => {});
  } catch (e) { /* no-op */ }
}

function currentUserId() {
  const u = getCurrentUser();
  return u ? u.userId : null;
}

function renderBadge() {
  const badge = query("[data-notification-badge]");
  if (!badge) return;
  const userId = currentUserId();
  const count = userId ? notificationService.getUnreadCount(userId) : 0;
  if (count > 0) {
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.hidden = false;
    badge.setAttribute("aria-label", `${count} unread notifications`);
  } else {
    badge.hidden = true;
    badge.textContent = "";
  }
}

export function refresh() {
  renderBadge();
}

function detectNewNotifications() {
  const userId = currentUserId();
  if (!userId) return;
  const items = notificationService.getByUser(userId);
  let hasNew = false;
  items.forEach((n) => {
    if (!seenIds.has(n.id)) {
      seenIds.add(n.id);
      if (!n.read) hasNew = true;
    }
  });
  if (hasNew) {
    playChime();
    refresh();
  }
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => { detectNewNotifications(); renderBadge(); }, POLL_INTERVAL);
}

window.addEventListener("storage", (e) => {
  if (e.key && e.key.indexOf("rbc_portal_db") === 0) {
    detectNewNotifications();
    refresh();
  }
});

function ensureBell() {
  const info = query("[data-user-info]");
  if (!info) return false;
  if (!query("[data-notification-bell]")) {
    const bell = document.createElement("button");
    bell.type = "button";
    bell.className = "btn btn-ghost btn-icon notification-bell";
    bell.setAttribute("data-notification-bell", "");
    bell.setAttribute("aria-label", "Notifications");
    bell.innerHTML = '<i class="fas fa-bell"></i><span class="notification-badge" data-notification-badge hidden></span>';
    info.parentNode.insertBefore(bell, info);
    on(bell, "click", (e) => {
      e.stopPropagation();
      window.location.href = notificationPageUrl();
    });
  }
  return true;
}

function showPermissionPopup() {
  if (!("Notification" in window)) return;
  const user = getCurrentUser();
  if (!user) return;
  if (Notification.permission !== "default") return;
  if (localStorage.getItem(PERMISSION_DISMISS_KEY) === "1") return;
  if (/notifications\.html$/i.test(window.location.pathname)) return;
  if (document.querySelector(".custom-modal")) return;

  showModal({
    title: "Enable Notifications",
    icon: "fa-bell",
    variant: "primary",
    dismissible: true,
    html: `<p>Get real-time alerts about announcements, results, fee payments and account activity for <strong>ROYALBRIDGE INT'L SCHOOL</strong>.</p>
           <ul class="custom-modal-list">
             <li><i class="fas fa-bullhorn"></i> School announcements</li>
             <li><i class="fas fa-graduation-cap"></i> Result approvals</li>
             <li><i class="fas fa-receipt"></i> Payment receipts</li>
           </ul>`,
    buttons: [
      { label: "Not now", variant: "secondary", value: false },
      { label: "Enable Notifications", variant: "primary", value: true, autofocus: true }
    ]
  }).then(async (enabled) => {
    localStorage.setItem(PERMISSION_DISMISS_KEY, "1");
    if (enabled && "Notification" in window) {
      try {
        const result = await Notification.requestPermission();
        if (result === "granted") {
          new Notification("ROYALBRIDGE INT'L SCHOOL", {
            body: "Notifications are now enabled. You'll be alerted about school activity.",
            icon: appPath("assets/images/icon-192.png")
          });
        }
      } catch (e) { /* no-op */ }
    }
  });
}

export function initNotificationCenter() {
  const user = getCurrentUser();
  if (!user) return;

  // mark existing notifications as seen so we don't chime on first load
  notificationService.getByUser(user.userId).forEach((n) => seenIds.add(n.id));

  if (ensureBell()) {
    refresh();
    startPolling();
    // show the enable-notifications popup shortly after entering the app
    setTimeout(showPermissionPopup, 800);
  }

  // unlock audio on first user gesture (autoplay policy)
  const unlock = () => { unlockAudio(); document.removeEventListener("pointerdown", unlock); document.removeEventListener("keydown", unlock); };
  document.addEventListener("pointerdown", unlock);
  document.addEventListener("keydown", unlock);
}
