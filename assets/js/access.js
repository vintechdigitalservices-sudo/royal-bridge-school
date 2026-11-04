import { getSecondaryAuth } from "./firebase/client.js";
import { repos } from "./repositories/index.js";
import { ROLES } from "./config.js";

const STUDENT_DOMAIN = "students.royalbridge.app";

export function admissionKey(value) {
  return String(value == null ? "" : value).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function randomDigits(length) {
  const values = new Uint32Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(values);
  } else {
    for (let i = 0; i < length; i += 1) values[i] = Math.floor(Math.random() * 1e9);
  }
  return Array.from(values, (n) => String(n % 10)).join("");
}

export function generateScratchPin() {
  let pin = randomDigits(6);
  while (pin === "000000") pin = randomDigits(6);
  return pin;
}

/**
 * Builds the next permanent admission number (e.g. RBI/2026/006). Admission
 * numbers are the student's identity and never change on promotion.
 */
export function generateAdmissionNumber(existingStudents = []) {
  const year = new Date().getFullYear();
  const taken = new Set(
    (existingStudents || []).map((s) => admissionKey(s && s.admissionNumber)).filter(Boolean)
  );
  let next = 1;
  let candidate = "";
  do {
    candidate = `RBI/${year}/${String(next).padStart(3, "0")}`;
    next += 1;
  } while (taken.has(admissionKey(candidate)));
  return candidate;
}

/** Resolves the Firebase Auth email behind an admission number (or accepts an email). */
export async function resolveLoginEmail(identifier) {
  const value = String(identifier == null ? "" : identifier).trim();
  if (!value) throw new Error("Enter your email or admission number.");
  if (value.includes("@")) return value;
  const access = await repos.studentAccess.getById(admissionKey(value));
  if (!access || access.active === false || !access.loginEmail) {
    throw new Error("Admission number or scratch card PIN is incorrect.");
  }
  return access.loginEmail;
}

function portalEmail(admissionNumber) {
  const slug = admissionKey(admissionNumber).toLowerCase() || "student";
  return `rbi.${slug}.${Date.now().toString(36)}${randomDigits(4)}@${STUDENT_DOMAIN}`;
}

/**
 * Creates the Firebase Auth identity and portal profile for a student.
 * The scratch PIN is returned once so it can be handed to the student; it is
 * never written to Firestore (Firebase Auth stores only a password hash).
 */
export async function createStudentPortalAccess({ studentId, admissionNumber, displayName = "" }) {
  const key = admissionKey(admissionNumber);
  if (!key) throw new Error("A valid admission number is required.");
  if (!studentId) throw new Error("The student record is missing.");

  const email = portalEmail(admissionNumber);
  const pin = generateScratchPin();
  let secondary = null;
  let uid = null;

  try {
    secondary = await getSecondaryAuth();
    const cred = await secondary.createUserWithEmailAndPassword(secondary.auth, email, pin);
    uid = cred.user.uid;
    if (displayName && secondary.updateProfile) {
      await secondary.updateProfile(cred.user, { displayName });
    }
    await secondary.signOut(secondary.auth);
  } catch (err) {
    if (secondary) await secondary.deleteApp(secondary.app).catch(() => {});
    const code = err && err.code ? err.code : "";
    if (/email-already-in-use/.test(code)) {
      throw new Error("A portal account already exists for this admission number. Reset the scratch card instead.");
    }
    if (/operation-not-allowed/.test(code)) {
      throw new Error("Student portal sign-in is not enabled in Firebase Auth. Ask the administrator to enable Email/Password sign-in.");
    }
    throw new Error("Could not create the student portal account. Please retry.");
  }

  try {
    await repos.users.create(uid, {
      uid,
      email,
      role: ROLES.STUDENT,
      studentId,
      active: true,
      status: "active",
      authProvider: "firebase",
      dataOrigin: "portal",
      isDemo: false
    });
    await repos.studentAccess.create(key, {
      studentId,
      loginEmail: email,
      uid,
      active: true,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    throw new Error("The student was saved, but portal access could not be linked. Please retry from the student page.");
  } finally {
    if (secondary) await secondary.deleteApp(secondary.app).catch(() => {});
  }

  return { uid, loginEmail: email, pin };
}

export async function reissueStudentAccess({ studentId, admissionNumber, previousUid, displayName = "" }) {
  const access = await createStudentPortalAccess({ studentId, admissionNumber, displayName });
  if (previousUid && previousUid !== access.uid) {
    await repos.users.remove(previousUid).catch(() => {});
  }
  return access;
}
