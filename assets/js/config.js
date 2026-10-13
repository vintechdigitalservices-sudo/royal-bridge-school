export const SCHOOL_CONFIG = {
  name: "ROYALBRIDGE INT'L SCHOOL",
  shortName: "ROYALBRIDGE",
  motto: "Inspiring Excellence",
  address: "10 LADY MAPO STAR CRESENT G/L ESTATE 3-3.",
  phone: "+234 000 000 0000",
  email: "info@royalbridge.edu.ng",
  primaryColor: "#0F7B63",
  secondaryColor: "#0B5C4C",
  logoFile: "assets/images/logo.jpg"
};

export const ROLES = {
  ADMIN: "admin",
  BURSAR: "bursar",
  TEACHER: "teacher",
  PARENT: "parent"
};

export const CURRENT_SESSION = "2026/2027";
export const CURRENT_TERM = "First Term";

export const PAYMENT_METHODS = ["Cash", "Bank Transfer", "POS", "Other"];

export const ATTENDANCE_STATUS = {
  PRESENT: "present",
  ABSENT: "absent",
  LATE: "late"
};

export const RESULT_STATUS = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
  APPROVED: "approved",
  REJECTED: "rejected"
};

export const NOTIFICATION_TYPES = {
  ANNOUNCEMENT: "announcement",
  RESULT: "result",
  RESULT_APPROVED: "result_approved",
  RESULT_REJECTED: "result_rejected",
  PAYMENT: "payment",
  FEE_REMINDER: "fee_reminder",
  ATTENDANCE: "attendance",
  ACCOUNT: "account",
  SYSTEM: "system",
  STAFF: "staff"
};

const NOTIFICATION_ICONS = {
  announcement: "fa-bullhorn",
  result: "fa-graduation-cap",
  result_approved: "fa-circle-check",
  result_rejected: "fa-circle-xmark",
  payment: "fa-receipt",
  fee_reminder: "fa-money-bill-wave",
  attendance: "fa-calendar-check",
  account: "fa-user-check",
  system: "fa-gear",
  staff: "fa-user-tie"
};

export function iconForNotificationType(type) {
  return NOTIFICATION_ICONS[type] || "fa-bell";
}
