import { ROLES } from "./config.js";
import { storage } from "./storage.js";
import { appPath } from "./paths.js";
import { getAuthClient } from "./firebase/client.js";
import { repos } from "./repositories/index.js";

function mapAuthError(err) {
  const code = (err && err.code) || "";
  if (/invalid-credential|wrong-password|user-not-found|invalid-email|missing-password/.test(code)) {
    return "Invalid email or password.";
  }
  if (/too-many-requests/.test(code)) return "Too many attempts. Please try again later.";
  if (/user-disabled/.test(code)) return "This account has been disabled.";
  if (/network|unavailable/.test(code)) return "Network error. Check your connection and retry.";
  return "Login failed. Please try again.";
}

function isLoginPage() {
  return !!document.getElementById("loginForm");
}

export function getCurrentUser() {
  return storage.getCurrentUser();
}

export function dashboardPathForRole(role) {
  if (role === ROLES.ADMIN) return appPath("pages/admin/dashboard.html");
  if (role === ROLES.BURSAR) return appPath("pages/bursar/dashboard.html");
  if (role === ROLES.TEACHER) return appPath("pages/teacher/dashboard.html");
  if (role === ROLES.STUDENT) return appPath("pages/student/dashboard.html");
  return appPath("index.html");
}

export function logout() {
  storage.setCurrentUser(null);
  const go = () => { window.location.href = appPath("index.html"); };
  getAuthClient()
    .then(({ auth, signOut }) => signOut(auth))
    .then(go)
    .catch(go);
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

/**
 * Resolves a portal profile from users/{uid} (Firestore is the source of truth
 * for role and links). Staff/student records are attached for convenience.
 */
export async function resolveProfile(uid) {
  const userDoc = await repos.users.getById(uid);
  if (!userDoc) return null;
  const profile = { ...userDoc, uid, userId: uid, id: uid, authProvider: "firebase" };
  try {
    if (userDoc.staffId) {
      const staff = await repos.staff.getById(userDoc.staffId);
      if (staff) profile.staff = staff;
    }
    if (userDoc.studentId) {
      const student = await repos.students.getById(userDoc.studentId);
      if (student) profile.student = student;
    }
  } catch (err) {
    console.warn("Profile hydration failed", err);
  }
  return profile;
}

async function localLogin() {
  throw new Error("Cannot reach the login service. Check your connection and try again.");
}

export async function login(email, password) {
  let client;
  try {
    client = await getAuthClient();
  } catch (err) {
    console.warn("Firebase Auth unavailable.", err);
    return localLogin();
  }
  const { auth, signInWithEmailAndPassword, signOut } = client;

  let cred;
  try {
    cred = await signInWithEmailAndPassword(auth, (email || "").trim(), password);
  } catch (err) {
    throw new Error(mapAuthError(err));
  }

  let profile;
  try {
    profile = await resolveProfile(cred.user.uid);
  } catch (err) {
    await signOut(auth).catch(() => {});
    throw new Error("Could not load your portal profile. Please retry.");
  }
  if (!profile) {
    await signOut(auth).catch(() => {});
    throw new Error("No portal profile is linked to this account.");
  }
  if (profile.active === false) {
    await signOut(auth).catch(() => {});
    throw new Error("This account is not active. Contact the administrator.");
  }

  storage.setCurrentUser(profile);
  redirectByRole(profile.role);
  return profile;
}

/**
 * Validates the Firebase session on every page load and refreshes the cached
 * profile. The cached profile keeps the synchronous page guards working while
 * the authoritative session is Firebase Auth.
 */
export async function initAuth() {
  let client;
  try {
    client = await getAuthClient();
  } catch (err) {
    return;
  }
  const { auth, onAuthStateChanged } = client;
  onAuthStateChanged(auth, async (fbUser) => {
    if (!fbUser) {
      const cached = getCurrentUser();
      if (cached && cached.authProvider === "firebase") {
        storage.setCurrentUser(null);
        if (!isLoginPage()) window.location.href = appPath("index.html");
      }
      return;
    }
    const cached = getCurrentUser();
    if (cached && cached.uid === fbUser.uid && cached.role) return;
    try {
      const profile = await resolveProfile(fbUser.uid);
      if (profile) storage.setCurrentUser(profile);
    } catch (err) {
      console.warn("Session profile refresh failed", err);
    }
  });
}

export async function sendPasswordReset(email) {
  const { auth, sendPasswordResetEmail } = await getAuthClient();
  await sendPasswordResetEmail(auth, (email || "").trim());
}
