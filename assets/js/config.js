export const SCHOOL_CONFIG = {
  name: "ROYALBRIDGE INT'L SCHOOL",
  shortName: "ROYALBRIDGE",
  motto: "Inspiring Excellence",
  address: "10 Lady Mapo Star Oyolu Junction, College Road 3-3 Onitsha",
  phone: "+234 000 000 0000",
  email: "info@royalbridge.edu.ng",
  primaryColor: "#2340B0",
  secondaryColor: "#1B2E86",
  logoFile: "assets/images/logo.jpg"
};

export const ROLES = {
  ADMIN: "admin",
  BURSAR: "bursar",
  TEACHER: "teacher",
  STUDENT: "student"
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
  RETURNED: "returned",
  APPROVED: "approved",
  PUBLISHED: "published"
};

export const RESULT_STATUS_FLOW = ["draft", "submitted", "returned", "approved", "published"];

export const RESULT_STATUS_LABELS = {
  draft: "Draft",
  submitted: "Submitted",
  returned: "Returned",
  approved: "Approved",
  published: "Published"
};

export const REPORT_TYPES = {
  TERMLY: "termly",
  CUMULATIVE: "cumulative"
};

export const NOTIFICATION_TYPES = {
  ANNOUNCEMENT: "announcement",
  RESULT: "result",
  RESULT_APPROVED: "result_approved",
  RESULT_RETURNED: "result_returned",
  RESULT_PUBLISHED: "result_published",
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
  result_returned: "fa-rotate-left",
  result_published: "fa-bullhorn",
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
