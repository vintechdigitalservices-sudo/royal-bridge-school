import { COLLECTIONS } from "../firebase/config.js";
import { makeRepository } from "./repository.js";

export const repos = {
  schoolSettings: makeRepository(COLLECTIONS.SCHOOL_SETTINGS),
  sessions: makeRepository(COLLECTIONS.SESSIONS),
  terms: makeRepository(COLLECTIONS.TERMS),
  classes: makeRepository(COLLECTIONS.CLASSES),
  subjects: makeRepository(COLLECTIONS.SUBJECTS),
  staff: makeRepository(COLLECTIONS.STAFF),
  students: makeRepository(COLLECTIONS.STUDENTS),
  users: makeRepository(COLLECTIONS.USERS),
  teacherAssignments: makeRepository(COLLECTIONS.TEACHER_ASSIGNMENTS),
  feeStructures: makeRepository(COLLECTIONS.FEE_STRUCTURES),
  payments: makeRepository(COLLECTIONS.PAYMENTS),
  attendance: makeRepository(COLLECTIONS.ATTENDANCE),
  results: makeRepository(COLLECTIONS.RESULTS),
  reportSheets: makeRepository(COLLECTIONS.REPORT_SHEETS),
  announcements: makeRepository(COLLECTIONS.ANNOUNCEMENTS),
  notifications: makeRepository(COLLECTIONS.NOTIFICATIONS),
  auditLogs: makeRepository(COLLECTIONS.AUDIT_LOGS)
};
