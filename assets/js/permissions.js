import { getCurrentUser } from "./auth.js";
import { list } from "./data/store.js";

function staffIdOf(user) {
  return (user && (user.staffId || (user.staff && user.staff.staffId))) || null;
}

export function assignmentsFor(user = getCurrentUser()) {
  const staffId = staffIdOf(user);
  if (!staffId) return [];
  return list("teacherAssignments").filter((a) => a.teacherId === staffId || a.staffId === staffId);
}

export function teacherClassIds(user = getCurrentUser()) {
  const ids = new Set();
  const staff = user && user.staff;
  if (staff && staff.classId) ids.add(staff.classId);
  assignmentsFor(user).forEach((a) => {
    if (a.classId) ids.add(a.classId);
    (a.classIds || []).forEach((id) => id && ids.add(id));
  });
  return ids;
}

export function teacherClasses(user = getCurrentUser()) {
  const ids = teacherClassIds(user);
  if (!ids.size) return [];
  return list("classes").filter((c) => ids.has(c.classId));
}

export function teacherSubjectCodesFor(classId, user = getCurrentUser()) {
  const codes = new Set();
  assignmentsFor(user)
    .filter((a) => !classId || a.classId === classId || (a.classIds || []).includes(classId))
    .forEach((a) => (a.subjectIds || a.subjects || []).forEach((code) => code && codes.add(code)));
  return codes;
}

export function isAssignedClass(classId, user = getCurrentUser()) {
  return teacherClassIds(user).has(classId);
}
