import { query, queryAll, on } from "./utils.js";
import { getCurrentUser, logout } from "./auth.js";
import { SCHOOL_CONFIG } from "./config.js";
import { appPath } from "./paths.js";
import { initNotificationCenter } from "./notification-center.js";

function setBrand() {
  const logo = appPath(SCHOOL_CONFIG.logoFile);
  queryAll("[data-brand-name]").forEach((el) => { el.textContent = SCHOOL_CONFIG.name; });
  queryAll("[data-brand-logo]").forEach((img) => {
    img.src = logo;
    img.alt = `${SCHOOL_CONFIG.name} logo`;
  });
  queryAll("[data-brand-motto]").forEach((el) => { el.textContent = SCHOOL_CONFIG.motto; });
}

function getNavItems(role) {
  if (role === "admin") {
    return [
      { href: "dashboard.html", icon: "fa-tachometer-alt", label: "Dashboard" },
      { href: "students.html", icon: "fa-users", label: "Students" },
      { href: "staff.html", icon: "fa-user-tie", label: "Staff" },
      { href: "classes.html", icon: "fa-chalkboard", label: "Classes" },
      { href: "subjects.html", icon: "fa-book", label: "Subjects" },
      { href: "sessions.html", icon: "fa-calendar", label: "Sessions & Terms" },
      { href: "fees.html", icon: "fa-money-bill-wave", label: "Fees" },
      { href: "payments.html", icon: "fa-receipt", label: "Payments" },
      { href: "attendance.html", icon: "fa-calendar-check", label: "Attendance" },
      { href: "results.html", icon: "fa-graduation-cap", label: "Results" },
      { href: "reports.html", icon: "fa-chart-bar", label: "Reports" },
      { href: "announcements.html", icon: "fa-bullhorn", label: "Announcements" },
      { href: "settings.html", icon: "fa-cog", label: "Settings" }
    ];
  }
  if (role === "bursar") {
    return [
      { href: "dashboard.html", icon: "fa-tachometer-alt", label: "Dashboard" },
      { href: "students.html", icon: "fa-users", label: "Students" },
      { href: "fees.html", icon: "fa-money-bill-wave", label: "Fees" },
      { href: "payments.html", icon: "fa-receipt", label: "Payments" },
      { href: "receipts.html", icon: "fa-file-invoice", label: "Receipts" },
      { href: "debtors.html", icon: "fa-exclamation-triangle", label: "Debtors" },
      { href: "reports.html", icon: "fa-chart-bar", label: "Reports" }
    ];
  }
  if (role === "teacher") {
    return [
      { href: "dashboard.html", icon: "fa-tachometer-alt", label: "Dashboard" },
      { href: "classes.html", icon: "fa-chalkboard", label: "My Classes" },
      { href: "students.html", icon: "fa-users", label: "Students" },
      { href: "attendance.html", icon: "fa-calendar-check", label: "Attendance" },
      { href: "results.html", icon: "fa-graduation-cap", label: "Results" },
      { href: "announcements.html", icon: "fa-bullhorn", label: "Announcements" }
    ];
  }
  if (role === "student") {
    return [
      { href: "dashboard.html", icon: "fa-tachometer-alt", label: "Dashboard" },
      { href: "results.html", icon: "fa-graduation-cap", label: "Check Results" },
      { href: "attendance.html", icon: "fa-calendar-check", label: "Attendance" },
      { href: "fees.html", icon: "fa-money-bill-wave", label: "Fees" },
      { href: "receipts.html", icon: "fa-file-invoice", label: "Receipts" },
      { href: "announcements.html", icon: "fa-bullhorn", label: "Announcements" }
    ];
  }
  if (role === "parent") {
    return [
      { href: "dashboard.html", icon: "fa-tachometer-alt", label: "Dashboard" },
      { href: "children.html", icon: "fa-child", label: "My Children" },
      { href: "fees.html", icon: "fa-money-bill-wave", label: "Fees" },
      { href: "payments.html", icon: "fa-receipt", label: "Payments" },
      { href: "receipts.html", icon: "fa-file-invoice", label: "Receipts" },
      { href: "results.html", icon: "fa-graduation-cap", label: "Results" },
      { href: "attendance.html", icon: "fa-calendar-check", label: "Attendance" },
      { href: "announcements.html", icon: "fa-bullhorn", label: "Announcements" }
    ];
  }
  return [];
}

function navPrefix(role) {
  const path = window.location.pathname;
  if (new RegExp(`/pages/${role}/`).test(path)) return "";
  return `${role}/`;
}

function renderSidebarNav() {
  const nav = query("[data-sidebar-nav]");
  if (!nav) return;
  const user = getCurrentUser();
  if (!user) return;
  const prefix = navPrefix(user.role);
  nav.innerHTML = getNavItems(user.role).map((item) => `
    <a href="${prefix}${item.href}" class="sidebar-link" data-nav-item>
      <i class="fas ${item.icon}"></i>
      <span>${item.label}</span>
    </a>
  `).join("");
  markActiveNav();
}

function renderBottomNav() {
  const nav = query("[data-bottom-nav]");
  if (!nav) return;
  const user = getCurrentUser();
  if (!user) return;
  const prefix = navPrefix(user.role);
  nav.innerHTML = getNavItems(user.role).slice(0, 5).map((item) => `
    <a href="${prefix}${item.href}" class="bottom-nav-item" data-nav-item>
      <i class="fas ${item.icon}"></i>
      <span>${item.label}</span>
    </a>
  `).join("");
  markActiveNav();
}

function markActiveNav() {
  const current = window.location.pathname.split("/").pop() || "dashboard.html";
  queryAll("[data-nav-item]").forEach((a) => {
    const href = a.getAttribute("href");
    if (href === current) a.classList.add("active");
  });
}

function initSidebar() {
  const toggle = query("[data-sidebar-toggle]");
  const close = query("[data-sidebar-close]");
  const sidebar = query("[data-sidebar]");
  const overlay = query("[data-sidebar-overlay]");
  const open = () => { sidebar?.classList.add("open"); overlay?.classList.add("active"); };
  const hide = () => { sidebar?.classList.remove("open"); overlay?.classList.remove("active"); };
  on(toggle, "click", open);
  on(close, "click", hide);
  on(overlay, "click", hide);
}

function initUserMenu() {
  const userInfo = query("[data-user-info]");
  const logoutBtns = queryAll("[data-logout]");
  const user = getCurrentUser();
  if (userInfo && user) {
    const name = user.staff
      ? `${user.staff.firstName} ${user.staff.lastName}`
      : user.student
        ? `${user.student.firstName} ${user.student.lastName}`
        : user.parent
          ? `${user.parent.firstName} ${user.parent.lastName}`
          : user.email;
    userInfo.innerHTML = `<div class="user-name">${name}</div><div class="user-role">${user.role}</div>`;
  }
  logoutBtns.forEach((btn) => on(btn, "click", (e) => { e.preventDefault(); logout(); }));
}

export function initNavigation() {
  setBrand();
  renderSidebarNav();
  renderBottomNav();
  initSidebar();
  initUserMenu();
  initNotificationCenter();
}
