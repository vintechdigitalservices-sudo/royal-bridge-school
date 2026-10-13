import { db } from "./db.js";
import { uid, deepClone, generateReceiptNumber } from "./utils.js";
import { CURRENT_SESSION, CURRENT_TERM, RESULT_STATUS } from "./config.js";

function getDb() {
  return db.get();
}

function commit(next) {
  return db.save(next);
}

export const studentService = {
  getAll() {
    return deepClone(getDb().students || []);
  },
  getById(id) {
    const s = (getDb().students || []).find((x) => x.studentId === id);
    return s ? deepClone(s) : null;
  },
  findByClass(classId) {
    return deepClone((getDb().students || []).filter((x) => x.classId === classId));
  },
  create(data) {
    const d = getDb();
    const record = { studentId: uid(), ...data };
    d.students.push(record);
    commit(d);
    return deepClone(record);
  },
  update(id, data) {
    const d = getDb();
    const idx = d.students.findIndex((x) => x.studentId === id);
    if (idx === -1) return null;
    d.students[idx] = { ...d.students[idx], ...data };
    commit(d);
    return deepClone(d.students[idx]);
  },
  delete(id) {
    const d = getDb();
    d.students = d.students.filter((x) => x.studentId !== id);
    commit(d);
    return true;
  }
};

export const staffService = {
  getAll() {
    return deepClone(getDb().staff || []);
  },
  getById(id) {
    const s = (getDb().staff || []).find((x) => x.staffId === id);
    return s ? deepClone(s) : null;
  },
  create(data) {
    const d = getDb();
    const record = { staffId: uid(), ...data };
    d.staff.push(record);
    commit(d);
    return deepClone(record);
  },
  update(id, data) {
    const d = getDb();
    const idx = d.staff.findIndex((x) => x.staffId === id);
    if (idx === -1) return null;
    d.staff[idx] = { ...d.staff[idx], ...data };
    commit(d);
    return deepClone(d.staff[idx]);
  }
};

export const classService = {
  getAll() {
    return deepClone(getDb().classes || []);
  },
  getById(id) {
    const c = (getDb().classes || []).find((x) => x.classId === id);
    return c ? deepClone(c) : null;
  },
  create(data) {
    const d = getDb();
    const record = { classId: uid(), ...data };
    d.classes.push(record);
    commit(d);
    return deepClone(record);
  }
};

export const subjectService = {
  getAll() {
    return deepClone(getDb().subjects || []);
  },
  create(data) {
    const d = getDb();
    const record = { subjectId: uid(), ...data };
    d.subjects.push(record);
    commit(d);
    return deepClone(record);
  },
  update(id, data) {
    const d = getDb();
    const idx = d.subjects.findIndex((x) => x.subjectId === id);
    if (idx === -1) return null;
    d.subjects[idx] = { ...d.subjects[idx], ...data };
    commit(d);
    return deepClone(d.subjects[idx]);
  }
};

export const sessionService = {
  getAll() {
    return deepClone(getDb().sessions || []);
  },
  getCurrent() {
    const d = getDb();
    return d.sessions.find((x) => x.current) || { name: CURRENT_SESSION, sessionId: null };
  },
  getCurrentTerm() {
    const d = getDb();
    return d.terms.find((x) => x.current) || { name: CURRENT_TERM, termId: null };
  },
  setCurrentSession(id) {
    const d = getDb();
    d.sessions.forEach((s) => { s.current = s.sessionId === id; });
    commit(d);
    return true;
  },
  setCurrentTerm(id) {
    const d = getDb();
    d.terms.forEach((t) => { t.current = t.termId === id; });
    commit(d);
    return true;
  }
};

export const feeService = {
  getCategories() {
    return deepClone(getDb().feeCategories || []);
  },
  getStructures() {
    return deepClone(getDb().feeStructures || []);
  },
  getStudentBalance(studentId) {
    const payments = (getDb().payments || []).filter((p) => p.studentId === studentId).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const expected = 150000;
    return { totalPaid: payments, outstanding: Math.max(0, expected - payments), expected };
  }
};

export const paymentService = {
  getAll() {
    const d = getDb();
    return deepClone(d.payments || []).map((p) => {
      const s = d.students.find((x) => x.studentId === p.studentId);
      return { ...p, student: s ? `${s.firstName} ${s.lastName} (${s.admissionNumber})` : null, className: s?.className, classArm: s?.classArm };
    });
  },
  record({ studentId, amount, paymentMethod, feeCategory, notes }) {
    const d = getDb();
    const pay = {
      paymentId: uid(),
      receiptNumber: generateReceiptNumber(),
      studentId,
      amount: Number(amount) || 0,
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMethod,
      feeCategory: feeCategory || "Fees",
      sessionId: d.sessions.find((s) => s.current)?.sessionId || null,
      termName: sessionService.getCurrentTerm().name || CURRENT_TERM,
      recordedBy: null,
      notes: notes || ""
    };
    d.payments.push(pay);
    commit(d);
    return deepClone(pay);
  },
  getByStudent(studentId) {
    return deepClone((getDb().payments || []).filter((p) => p.studentId === studentId));
  }
};

export const attendanceService = {
  getAll() { return deepClone(getDb().attendance || []); },
  record({ classId, date, records }) {
    const d = getDb();
    const entry = { attendanceId: uid(), classId, date, records, recordedAt: new Date().toISOString() };
    d.attendance.push(entry);
    commit(d);
    return deepClone(entry);
  },
  getByStudent(studentId) {
    const att = getDb().attendance || [];
    const res = [];
    att.forEach((a) => {
      const rec = (a.records || []).find((r) => r.studentId === studentId);
      if (rec) res.push({ date: a.date, status: rec.status });
    });
    return res;
  }
};

export const resultService = {
  getAll() { return deepClone(getDb().results || []); },
  submit({ classId, subjectId, termName, records }) {
    const d = getDb();
    const r = { resultId: uid(), classId, subjectId, termName, records, status: RESULT_STATUS.SUBMITTED, submittedAt: new Date().toISOString() };
    d.results.push(r);
    commit(d);
    return deepClone(r);
  },
  approve(id) {
    const d = getDb();
    const idx = d.results.findIndex((x) => x.resultId === id);
    if (idx === -1) return null;
    d.results[idx].status = RESULT_STATUS.APPROVED;
    d.results[idx].approvedAt = new Date().toISOString();
    commit(d);
    return deepClone(d.results[idx]);
  },
  reject(id) {
    const d = getDb();
    const idx = d.results.findIndex((x) => x.resultId === id);
    if (idx === -1) return null;
    d.results[idx].status = RESULT_STATUS.REJECTED;
    commit(d);
    return deepClone(d.results[idx]);
  },
  getApprovedForStudent(studentId, termName) {
    const d = getDb();
    return deepClone((d.results || []).filter((x) => x.status === RESULT_STATUS.APPROVED && x.termName === termName && (x.records || []).some((r) => r.studentId === studentId)));
  }
};

export const announcementService = {
  getAll() { return deepClone(getDb().announcements || []); },
  getPublished() { return deepClone((getDb().announcements || []).filter((a) => a.status === "published")); },
  create(data) {
    const d = getDb();
    const a = { announcementId: uid(), date: new Date().toISOString().slice(0, 10), status: "published", ...data };
    d.announcements.push(a);
    commit(d);
    return deepClone(a);
  }
};

export const userService = {
  getAll() { return deepClone(getDb().users || []); },
  getById(id) {
    const u = (getDb().users || []).find((x) => x.userId === id);
    return u ? deepClone(u) : null;
  },
  findByEmail(email) {
    const u = (getDb().users || []).find((x) => x.email.toLowerCase() === String(email).toLowerCase());
    return u ? deepClone(u) : null;
  },
  getByRole(role) {
    return deepClone((getDb().users || []).filter((x) => x.role === role));
  },
  getParentsOfStudent(studentId) {
    const d = getDb();
    const parentIds = (d.parents || []).filter((p) => (p.children || []).some((c) => c.studentId === studentId)).map((p) => p.parentId);
    return deepClone((d.users || []).filter((u) => parentIds.includes(u.parentId)));
  }
};

export const notificationService = {
  getAll() {
    return deepClone(getDb().notifications || []);
  },
  getByUser(userId) {
    return deepClone((getDb().notifications || []).filter((n) => n.userId === userId));
  },
  getUnreadCount(userId) {
    return (getDb().notifications || []).filter((n) => n.userId === userId && !n.read).length;
  },
  create({ userId, title, message, type, link }) {
    const d = getDb();
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
    d.notifications.push(n);
    commit(d);
    return deepClone(n);
  },
  createForUsers(userIds, payload) {
    return (userIds || []).map((userId) => notificationService.create({ userId, ...payload }));
  },
  markRead(id) {
    const d = getDb();
    const n = (d.notifications || []).find((x) => x.id === id);
    if (!n) return null;
    n.read = true;
    commit(d);
    return deepClone(n);
  },
  markAllRead(userId) {
    const d = getDb();
    (d.notifications || []).forEach((n) => { if (n.userId === userId) n.read = true; });
    commit(d);
    return true;
  },
  remove(id) {
    const d = getDb();
    d.notifications = (d.notifications || []).filter((x) => x.id !== id);
    commit(d);
    return true;
  }
};