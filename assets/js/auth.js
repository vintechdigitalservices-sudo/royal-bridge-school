import { ROLES } from "./config.js";
import { storage } from "./storage.js";
import { userService } from "./services.js";
import { appPath } from "./paths.js";

export function getCurrentUser() {
  return storage.getCurrentUser();
}

export function dashboardPathForRole(role) {
  if (role === ROLES.ADMIN) return appPath("pages/admin/dashboard.html");
  if (role === ROLES.BURSAR) return appPath("pages/bursar/dashboard.html");
  if (role === ROLES.TEACHER) return appPath("pages/teacher/dashboard.html");
  if (role === ROLES.PARENT) return appPath("pages/parent/dashboard.html");
  return appPath("index.html");
}

export function logout() {
  storage.setCurrentUser(null);
  window.location.href = appPath("index.html");
}

export function requireAuth() {
  const u = getCurrentUser();
  if (!u) {
    window.location.href = appPath("index.html");
    return null;
  }
  return u;
}

export function requireRole(...roles) {
  const u = getCurrentUser();
  if (!u || !roles.includes(u.role)) {
    if (u && u.role) redirectByRole(u.role);
    else window.location.href = appPath("index.html");
    return null;
  }
  return u;
}

export function redirectByRole(role) {
  window.location.href = dashboardPathForRole(role);
}

export async function login(email, password) {
  const user = userService.findByEmail(email);
  if (!user) throw new Error("Invalid credentials");
  if (user.password !== password) throw new Error("Invalid credentials");
  if (!user.active) throw new Error("Account is not active");
  const db = (await import("./db.js")).db.get();
  const staff = (db.staff || []).find((s) => s.staffId === user.staffId);
  const parent = (db.parents || []).find((p) => p.parentId === user.parentId);
  const current = { ...user, staff, parent };
  storage.setCurrentUser(current);
  redirectByRole(current.role);
  return current;
}
