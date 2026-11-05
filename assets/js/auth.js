import { ROLES, STAFF_STATUS } from "./config.js";
import { storage } from "./storage.js";
import { appPath } from "./paths.js";
import { getAuthClient } from "./firebase/client.js";
import { repos } from "./repositories/index.js";
import { resolveLoginEmail } from "./access.js";
import { uid } from "./utils.js";

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
  if (role === ROLES.STAFF || role === ROLES.CLASS_TEACHER) return appPath("pages/staff/dashboard.html");
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

export async function login(identifier, password) {
  let client;
  try {
    client = await getAuthClient();
  } catch (err) {
    console.warn("Firebase Auth unavailable.", err);
    throw new Error("Cannot reach the login service. Check your connection and try again.");
  }
  const { auth, signInWithEmailAndPassword, signOut } = client;

  let email;
  try {
    email = await resolveLoginEmail(identifier);
  } catch (err) {
    throw new Error(err.message || "Invalid login details.");
  }

  let cred;
  try {
    cred = await signInWithEmailAndPassword(auth, email, password);
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
  return profile;
}

/**
 * Post-login routing for staff accounts, driven by account status (not by the
 * password). Pending/rejected/deactivated staff never reach the staff
 * dashboard functions.
 */
export function routeStaffLogin(profile) {
  const status = profile && profile.status;
  switch (status) {
    case STAFF_STATUS.APPROVED:
      redirectByRole(profile.role || ROLES.STAFF);
      return;
    case STAFF_STATUS.PROFILE_INCOMPLETE:
      window.location.href = appPath("pages/staff/profile-complete.html");
      return;
    default:
      // pending_approval, rejected, deactivated and any unknown status go to
      // the staff dashboard, which renders the appropriate status message.
      redirectByRole(ROLES.STAFF);
      return;
  }
}

export async function registerStaff({ fullName, email, password } = {}) {
  const client = await getAuthClient();
  const { auth, createUserWithEmailAndPassword } = client;
  const name = String(fullName || "").trim();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!name) throw new Error("Full name is required.");
  if (!normalizedEmail) throw new Error("Email address is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("Enter a valid email address.");
  }
  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  let cred;
  try {
    cred = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
  } catch (err) {
    if (/email-already-in-use/.test(err.code)) {
      throw new Error("An account with this email address already exists.");
    }
    throw new Error(mapAuthError(err) || "Could not create the account. Please retry.");
  }
  const uid = cred.user.uid;
  const parts = name.split(/\s+/);
  const firstName = parts[0] || "";
  const lastName = parts.slice(1).join(" ") || "";
  const now = new Date().toISOString();
  const userRecord = {
    uid,
    email: normalizedEmail,
    role: ROLES.STAFF,
    staffId: uid,
    fullName: name,
    status: STAFF_STATUS.PROFILE_INCOMPLETE,
    active: true,
    authProvider: "firebase",
    dataOrigin: "portal",
    createdAt: now,
    updatedAt: now
  };
  const staffRecord = {
    staffId: uid,
    firstName,
    lastName,
    email: normalizedEmail,
    phone: "",
    section: "",
    classId: "",
    role: ROLES.STAFF,
    status: STAFF_STATUS.PROFILE_INCOMPLETE,
    active: true,
    createdAt: now,
    updatedAt: now
  };
  try {
    await repos.users.create(uid, userRecord);
    await repos.staff.create(uid, staffRecord);
  } catch (err) {
    await repos.users.remove(uid).catch(() => {});
    await repos.staff.remove(uid).catch(() => {});
    throw new Error("The account was created but the staff profile could not be saved. Please retry.");
  }
  const profile = {
    ...userRecord,
    staff: staffRecord,
    uid,
    userId: uid,
    id: uid,
    authProvider: "firebase"
  };
  storage.setCurrentUser(profile);
  return profile;
}

export async function completeStaffProfile({ section, classId, phone } = {}) {
  const user = getCurrentUser();
  if (!user || (user.role !== ROLES.STAFF && user.role !== ROLES.CLASS_TEACHER)) {
    throw new Error("Only staff accounts can complete a profile.");
  }
  const staffId = user.staffId || user.uid;
  if (!section || !["Nursery", "Primary", "Daycare"].includes(section)) {
    throw new Error("Select a valid section.");
  }
  if (!classId) throw new Error("Select a class.");
  if (!phone || !String(phone).trim()) throw new Error("Phone number is required.");
  const patch = {
    section,
    classId,
    phone: String(phone).trim(),
    status: STAFF_STATUS.PENDING_APPROVAL,
    updatedAt: new Date().toISOString()
  };
  try {
    await repos.staff.update(staffId, patch);
    await repos.users.update(staffId, { status: STAFF_STATUS.PENDING_APPROVAL, updatedAt: patch.updatedAt });
  } catch (err) {
    throw new Error("Could not save the profile. Please retry.");
  }
  const updated = {
    ...getCurrentUser(),
    ...patch,
    staff: { ...(getCurrentUser().staff || {}), ...patch }
  };
  storage.setCurrentUser(updated);
  return updated;
}

export async function approveStaff(staffId, { section, classId } = {}) {
  const user = getCurrentUser();
  if (!user || user.role !== ROLES.ADMIN) {
    throw new Error("Only the administrator can approve staff accounts.");
  }
  if (!section || !["Nursery", "Primary", "Daycare"].includes(section)) {
    throw new Error("Select a valid section.");
  }
  if (!classId) throw new Error("Assign a class.");
  const staff = await repos.staff.getById(staffId);
  if (!staff) throw new Error("Staff record not found.");
  const now = new Date().toISOString();
  const staffPatch = {
    status: STAFF_STATUS.APPROVED,
    section,
    classId,
    role: ROLES.CLASS_TEACHER,
    updatedAt: now
  };
  const userPatch = {
    role: ROLES.CLASS_TEACHER,
    status: STAFF_STATUS.APPROVED,
    active: true,
    updatedAt: now
  };
  const current = await repos.sessions.query({ where: [["current", "==", true]], limit: 1 });
  const sessionId = current.length ? current[0].sessionId : null;
  try {
    await repos.staff.update(staffId, staffPatch);
    await repos.users.update(staffId, userPatch);
    await repos.teacherAssignments.add({
      assignmentId: uid(),
      teacherId: staffId,
      classId,
      subjectIds: [],
      sessionId
    });
  } catch (err) {
    throw new Error("Could not approve the staff member. Please retry.");
  }
  return { staffId, section, classId, role: ROLES.CLASS_TEACHER, status: STAFF_STATUS.APPROVED };
}

export async function rejectStaff(staffId, reason = "") {
  const user = getCurrentUser();
  if (!user || user.role !== ROLES.ADMIN) {
    throw new Error("Only the administrator can reject staff accounts.");
  }
  const patch = {
    status: STAFF_STATUS.REJECTED,
    updatedAt: new Date().toISOString()
  };
  if (reason && reason.trim()) patch.rejectionReason = reason.trim();
  try {
    await repos.staff.update(staffId, patch);
    await repos.users.update(staffId, { ...patch, active: true });
  } catch (err) {
    throw new Error("Could not reject the staff member. Please retry.");
  }
}

export async function setStaffActive(staffId, active) {
  const user = getCurrentUser();
  if (!user || user.role !== ROLES.ADMIN) {
    throw new Error("Only the administrator can change account state.");
  }
  const now = new Date().toISOString();
  const patch = {
    active: Boolean(active),
    status: Boolean(active) ? STAFF_STATUS.APPROVED : STAFF_STATUS.DEACTIVATED,
    updatedAt: now
  };
  try {
    await repos.staff.update(staffId, patch);
    await repos.users.update(staffId, patch);
  } catch (err) {
    throw new Error("Could not update the account state. Please retry.");
  }
}

export function getStaffMembers() {
  const { list } = require("./data/store.js");
  return list("staff");
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
