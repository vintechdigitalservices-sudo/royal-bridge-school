/**
 * Firebase web configuration (public identifiers — safe to ship in client code).
 * Secrets (service-account keys) are NEVER placed here; they live server-side only.
 */
export const firebaseConfig = {
  apiKey: "AIzaSyAMHaFx9M6ZIw-taTANvOrLG8mKPJkbGsA",
  authDomain: "royal-bridge-college-3ec88.firebaseapp.com",
  projectId: "royal-bridge-college-3ec88",
  storageBucket: "royal-bridge-college-3ec88.firebasestorage.app",
  messagingSenderId: "574984214743",
  appId: "1:574984214743:web:7142e93dd2ce8f95907892"
};

export const COLLECTIONS = {
  SCHOOL_SETTINGS: "schoolSettings",
  SESSIONS: "sessions",
  TERMS: "terms",
  CLASSES: "classes",
  SUBJECTS: "subjects",
  STAFF: "staff",
  STUDENTS: "students",
  USERS: "users",
  TEACHER_ASSIGNMENTS: "teacherAssignments",
  FEE_STRUCTURES: "feeStructures",
  PAYMENTS: "payments",
  ATTENDANCE: "attendance",
  RESULTS: "results",
  REPORT_SHEETS: "reportSheets",
  ANNOUNCEMENTS: "announcements",
  NOTIFICATIONS: "notifications",
  AUDIT_LOGS: "auditLogs"
};

export const SDK_VERSION = "10.12.2";
