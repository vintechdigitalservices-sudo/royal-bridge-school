import { uid, deepClone, generateReceiptNumber } from "./utils.js";
import { CURRENT_SESSION, CURRENT_TERM, RESULT_STATUS } from "./config.js";
import * as store from "./data/store.js";

function withUserId(u) {
  return u.userId ? u : { ...u, userId: u.uid };
}

export const studentService = {
  getAll() {
    return store.list("students");
  },
  getById(id) {
    return store.find("students", (x) => x.studentId === id);
  },
  findByClass(classId) {
    return store.filter("students", (x) => x.classId === classId);
  },
  create(data) {
    const record = { studentId: uid(), status: "active", ...data };
    store.createRecord("students", "studentId", record).catch(() => {});
    return deepClone(record);
  },
  update(id, data) {
    store.updateRecord("students", "studentId", id, data).catch(() => {});
    return deepClone({ ...(this.getById(id) || {}), ...data });
  },
  delete(id) {
    store.removeRecord("students", "studentId", id).catch(() => {});
    return true;
  }
};

export const staffService = {
  getAll() {
    return store.list("staff");
  },
  getById(id) {
    return store.find("staff", (x) => x.staffId === id);
  },
  create(data) {
    const record = { staffId: uid(), active: true, ...data };
    store.createRecord("staff", "staffId", record).catch(() => {});
    return deepClone(record);
  },
  update(id, data) {
    store.updateRecord("staff", "staffId", id, data).catch(() => {});
    return deepClone({ ...(this.getById(id) || {}), ...data });
  }
};

export const classService = {
  getAll() {
    return store.list("classes");
  },
  getById(id) {
    return store.find("classes", (x) => x.classId === id);
  },
  create(data) {
    const record = { classId: uid(), ...data };
    store.createRecord("classes", "classId", record).catch(() => {});
    return deepClone(record);
  }
};

export const subjectService = {
  getAll() {
    return store.list("subjects");
  },
  create(data) {
    const record = { subjectId: uid(), ...data };
    store.createRecord("subjects", "subjectId", record).catch(() => {});
    return deepClone(record);
  },
  update(id, data) {
    store.updateRecord("subjects", "subjectId", id, data).catch(() => {});
    return deepClone({ ...(store.find("subjects", (x) => x.subjectId === id) || {}), ...data });
  }
};

export const sessionService = {
  getAll() {
    return store.list("sessions");
  },
  getCurrent() {
    return store.find("sessions", (x) => x.current) || { name: CURRENT_SESSION, sessionId: null };
  },
  getCurrentTerm() {
    return store.find("terms", (x) => x.current) || { name: CURRENT_TERM, termId: null };
  },
  setCurrentSession(id) {
    store.list("sessions").forEach((s) => {
      store.updateRecord("sessions", "sessionId", s.sessionId, { current: s.sessionId === id }).catch(() => {});
    });
    return true;
  },
  setCurrentTerm(id) {
    store.list("terms").forEach((t) => {
      store.updateRecord("terms", "termId", t.termId, { current: t.termId === id }).catch(() => {});
    });
    return true;
  }
};

export const feeService = {
  getCategories() {
    return [];
  },
  getStructures() {
    return store.list("feeStructures");
  },
  getStudentBalance(studentId) {
    const paid = store
      .filter("payments", (p) => p.studentId === studentId)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const expected = 150000;
    return { totalPaid: paid, outstanding: Math.max(0, expected - paid), expected };
  }
};

export const paymentService = {
  getAll() {
    const students = store.list("students");
    return store.list("payments").map((p) => {
      const s = students.find((x) => x.studentId === p.studentId);
      return {
        ...p,
        student: s ? `${s.firstName} ${s.lastName} (${s.admissionNumber})` : null,
        className: s?.className,
        classArm: s?.classArm
      };
    });
  },
  record({ studentId, amount, paymentMethod, feeCategory, notes }) {
    const pay = {
      paymentId: uid(),
      receiptNumber: generateReceiptNumber(),
      studentId,
      amount: Number(amount) || 0,
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMethod,
      feeCategory: feeCategory || "Fees",
      sessionId: sessionService.getCurrent().sessionId || null,
      termName: sessionService.getCurrentTerm().name || CURRENT_TERM,
      recordedBy: null,
      status: "confirmed",
      notes: notes || ""
    };
    store.createRecord("payments", "paymentId", pay).catch(() => {});
    return deepClone(pay);
  },
  getByStudent(studentId) {
    return store.filter("payments", (p) => p.studentId === studentId);
  }
};

export const attendanceService = {
  getAll() {
    return store.list("attendance");
  },
  record({ classId, date, records }) {
    const entry = { attendanceId: uid(), classId, date, records, recordedAt: new Date().toISOString() };
    store.createRecord("attendance", "attendanceId", entry).catch(() => {});
    return deepClone(entry);
  },
  getByStudent(studentId) {
    const res = [];
    store.list("attendance").forEach((a) => {
      const rec = (a.records || []).find((r) => r.studentId === studentId);
      if (rec) res.push({ date: a.date, status: rec.status });
    });
    return res;
  }
};

export const resultService = {
  getAll() {
    return store.list("results");
  },
  getByStudent(studentId) {
    return store.filter("results", (x) => x.studentId === studentId);
  },
  getPublishedForStudent(studentId) {
    return store
      .filter("results", (x) => x.studentId === studentId && /published|approved/i.test(x.status || ""))
      .sort((a, b) => new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0));
  },
  submit({ classId, subjectId, termName, records }) {
    const r = {
      resultId: uid(),
      classId,
      subjectId,
      termName,
      records,
      status: RESULT_STATUS.SUBMITTED,
      submittedAt: new Date().toISOString()
    };
    store.createRecord("results", "resultId", r).catch(() => {});
    return deepClone(r);
  },
  approve(id) {
    const patch = { status: RESULT_STATUS.APPROVED, approvedAt: new Date().toISOString() };
    store.updateRecord("results", "resultId", id, patch).catch(() => {});
    return deepClone({ ...(store.find("results", (x) => x.resultId === id) || {}), ...patch });
  },
  reject(id) {
    const patch = { status: RESULT_STATUS.REJECTED };
    store.updateRecord("results", "resultId", id, patch).catch(() => {});
    return deepClone({ ...(store.find("results", (x) => x.resultId === id) || {}), ...patch });
  },
  getApprovedForStudent(studentId, termName) {
    return store.filter(
      "results",
      (x) =>
        x.status === RESULT_STATUS.APPROVED &&
        (!termName || x.termName === termName) &&
        (x.studentId === studentId || (x.records || []).some((r) => r.studentId === studentId))
    );
  }
};

function announcementTime(a) {
  const v = a.createdAt || a.date || 0;
  const t = new Date(v).getTime();
  return isNaN(t) ? 0 : t;
}

export const announcementService = {
  getAll() {
    return store.list("announcements").sort((a, b) => announcementTime(b) - announcementTime(a));
  },
  getPublished() {
    return store
      .filter("announcements", (a) => a.status === "published")
      .sort((a, b) => announcementTime(b) - announcementTime(a));
  },
  create(data) {
    const a = {
      announcementId: uid(),
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      status: "published",
      ...data
    };
    store.createRecord("announcements", "announcementId", a, { front: true }).catch(() => {});
    return deepClone(a);
  }
};

export const userService = {
  getAll() {
    return store.list("users").map(withUserId);
  },
  getById(id) {
    const u = store.find("users", (x) => (x.userId || x.uid) === id);
    return u ? withUserId(u) : null;
  },
  findByEmail(email) {
    const u = store.find("users", (x) => String(x.email || "").toLowerCase() === String(email).toLowerCase());
    return u ? withUserId(u) : null;
  },
  getByRole(role) {
    return store.filter("users", (x) => x.role === role).map(withUserId);
  },
  getParentsOfStudent(studentId) {
    const students = store.find("students", (s) => s.studentId === studentId);
    const email = students?.parentEmail || students?.guardian?.email;
    if (email) return store.filter("users", (u) => String(u.email || "").toLowerCase() === String(email).toLowerCase()).map(withUserId);
    return [];
  }
};

export const notificationService = {
  getAll() {
    return store.list("notifications");
  },
  getByUser(userId) {
    return store.filter("notifications", (n) => n.userId === userId);
  },
  getUnreadCount(userId) {
    return store.filter("notifications", (n) => n.userId === userId && !n.read).length;
  },
  create({ userId, title, message, type, link }) {
    const n = {
      id: uid(),
      userId,
      title,
      message,
      type: type || "system",
      createdAt: new Date().toISOString(),
      read: false,
      link: link || null
    };
    store.createRecord("notifications", "id", n).catch(() => {});
    return deepClone(n);
  },
  createForUsers(userIds, payload) {
    return (userIds || []).map((userId) => notificationService.create({ userId, ...payload }));
  },
  markRead(id) {
    store.updateRecord("notifications", "id", id, { read: true }).catch(() => {});
    return deepClone({ ...(store.find("notifications", (n) => n.id === id) || {}), read: true });
  },
  markAllRead(userId) {
    store.filter("notifications", (n) => n.userId === userId && !n.read).forEach((n) => {
      store.updateRecord("notifications", "id", n.id, { read: true }).catch(() => {});
    });
    return true;
  },
  remove(id) {
    store.removeRecord("notifications", "id", id).catch(() => {});
    return true;
  }
};
