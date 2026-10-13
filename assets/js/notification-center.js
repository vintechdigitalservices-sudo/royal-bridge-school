import { getCurrentUser } from "./auth.js";
import { appPath } from "./paths.js";
import { notificationService } from "./services.js";
import { iconForNotificationType } from "./config.js";
import { query, on } from "./utils.js";

const SOUND_PREF_KEY = "rbi_notification_sound";
const PERMISSION_DISMISS_KEY = "rbi_notification_prompt_dismissed";
const POLL_INTERVAL = 6000;

let seenIds = new Set();
let pollTimer = null;
let audioEl = null;
let audioUnlocked = false;
let panelEl = null;

function soundEnabled() {
  return localStorage.getItem(SOUND_PREF_KEY) !== "off";
}

export function setSoundEnabled(enabled) {
  localStorage.setItem(SOUND_PREF_KEY, enabled ? "on" : "off");
}

export function isSoundEnabled() {
  return soundEnabled();
}

function relativeTime(iso) {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });
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

function renderPanel() {
  if (!panelEl) return;
  const userId = currentUserId();
  const items = userId ? notificationService.getByUser(userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : [];
  const unread = items.filter((n) => !n.read).length;

  const list = items.length
    ? items.map((n) => `
      <a class="notification-item ${n.read ? "" : "unread"}" data-notification-id="${n.id}" data-link="${n.link || ""}" href="#">
        <span class="notification-item-icon"><i class="fas ${iconForNotificationType(n.type)}"></i></span>
        <span class="notification-item-body">
          <span class="notification-item-title">${n.title}</span>
          <span class="notification-item-message">${n.message}</span>
          <span class="notification-item-time">${relativeTime(n.createdAt)}</span>
        </span>
        ${n.read ? "" : '<span class="notification-dot" aria-hidden="true"></span>'}
      </a>`).join("")
    : `<div class="notification-empty"><i class="fas fa-bell-slash"></i><p>No notifications yet</p><span class="text-muted text-sm">You'll see school announcements, results and payment updates here.</span></div>`;

  panelEl.innerHTML = `
    <div class="notification-panel-header">
      <strong>Notifications</strong>
      <button class="btn btn-ghost btn-sm" data-mark-all ${unread ? "" : "disabled"}>Mark all as read</button>
    </div>
    <div class="notification-panel-list">${list}</div>
    <div class="notification-panel-footer">
      <a class="btn btn-secondary w-full" href="${appPath("pages/notifications.html")}">View all notifications</a>
    </div>`;

  on(panelEl.querySelector("[data-mark-all]"), "click", (e) => {
    e.stopPropagation();
    const uid = currentUserId();
    if (uid) notificationService.markAllRead(uid);
    refresh();
  });

  panelEl.querySelectorAll("[data-notification-id]").forEach((item) => {
    on(item, "click", (e) => {
      e.preventDefault();
      const id = item.getAttribute("data-notification-id");
      notificationService.markRead(id);
      refresh();
      closePanel();
      const link = item.getAttribute("data-link");
      if (link) window.location.href = appPath(link);
    });
  });
}

function openPanel() {
  if (!panelEl) return;
  panelEl.classList.add("open");
  const bell = query("[data-notification-bell]");
  if (bell) bell.setAttribute("aria-expanded", "true");
}

function closePanel() {
  if (!panelEl) return;
  panelEl.classList.remove("open");
  const bell = query("[data-notification-bell]");
  if (bell) bell.setAttribute("aria-expanded", "false");
}

function togglePanel() {
  if (!panelEl) return;
  if (panelEl.classList.contains("open")) closePanel();
  else openPanel();
}

export function refresh() {
  renderBadge();
  renderPanel();
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

function ensureShell() {
  const info = query("[data-user-info]");
  if (!info) return false;
  if (!query("[data-notification-bell]")) {
    const bell = document.createElement("button");
    bell.type = "button";
    bell.className = "btn btn-ghost btn-icon notification-bell";
    bell.setAttribute("data-notification-bell", "");
    bell.setAttribute("aria-label", "Notifications");
    bell.setAttribute("aria-expanded", "false");
    bell.innerHTML = '<i class="fas fa-bell"></i><span class="notification-badge" data-notification-badge hidden></span>';
    info.parentNode.insertBefore(bell, info);
    on(bell, "click", (e) => { e.stopPropagation(); togglePanel(); });
  }
  if (!panelEl) {
    panelEl = document.createElement("div");
    panelEl.className = "notification-panel";
    panelEl.setAttribute("role", "dialog");
    panelEl.setAttribute("aria-label", "Notifications");
    document.body.appendChild(panelEl);
    on(document, "click", (e) => {
      if (!panelEl.classList.contains("open")) return;
      if (e.target.closest(".notification-panel") || e.target.closest("[data-notification-bell]")) return;
      closePanel();
    });
  }
  return true;
}

function initPermissionBanner() {
  if (!("Notification" in window)) return;
  const user = getCurrentUser();
  if (!user) return;
  if (Notification.permission !== "default") return;
  if (localStorage.getItem(PERMISSION_DISMISS_KEY) === "1") return;
  if (document.querySelector(".notification-permission-banner")) return;

  const banner = document.createElement("div");
  banner.className = "notification-permission-banner";
  banner.innerHTML = `
    <div class="notification-permission-text">
      <strong>Stay updated</strong>
      <span>Stay updated with important school announcements, results, payments and account activity.</span>
    </div>
    <div class="notification-permission-actions">
      <button class="btn btn-sm btn-secondary" data-perm-later>Not now</button>
      <button class="btn btn-sm btn-primary" data-perm-enable>Enable Notifications</button>
    </div>`;
  document.body.appendChild(banner);

  on(banner.querySelector("[data-perm-later]"), "click", () => {
    localStorage.setItem(PERMISSION_DISMISS_KEY, "1");
    banner.remove();
  });
  on(banner.querySelector("[data-perm-enable]"), "click", async () => {
    try {
      const result = await Notification.requestPermission();
      localStorage.setItem(PERMISSION_DISMISS_KEY, "1");
      banner.remove();
      if (result === "granted") {
        new Notification("ROYALBRIDGE INT'L SCHOOL", { body: "Notifications are now enabled. You'll be alerted about school activity.", icon: appPath("assets/images/icon-192.png") });
      }
    } catch (e) {
      banner.remove();
    }
  });
}

export function initNotificationCenter() {
  const user = getCurrentUser();
  if (!user) return;

  // mark existing notifications as seen so we don't chime on first load
  notificationService.getByUser(user.userId).forEach((n) => seenIds.add(n.id));

  if (ensureShell()) {
    refresh();
    startPolling();
    initPermissionBanner();
  }

  // unlock audio on first user gesture (autoplay policy)
  const unlock = () => { unlockAudio(); document.removeEventListener("pointerdown", unlock); document.removeEventListener("keydown", unlock); };
  document.addEventListener("pointerdown", unlock);
  document.addEventListener("keydown", unlock);
}
