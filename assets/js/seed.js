import { CURRENT_SESSION, CURRENT_TERM, ROLES, SCHOOL_CONFIG, NOTIFICATION_TYPES } from "./config.js";
import { uid, deepClone } from "./utils.js";

// Maximum 5 records per major entity. This is a real client application:
// empty states are expected and preferred over fabricated volume.
export function createSeed() {
  const sessionId = uid();
  const sessions = [{ sessionId, name: CURRENT_SESSION, current: true }];
  const terms = [
    { termId: uid(), name: "First Term", sessionId, current: CURRENT_TERM === "First Term" },
    { termId: uid(), name: "Second Term", sessionId, current: CURRENT_TERM === "Second Term" },
    { termId: uid(), name: "Third Term", sessionId, current: CURRENT_TERM === "Third Term" }
  ];

  const classes = [
    { classId: uid(), name: "Nursery 1", arm: null, level: "Nursery 1" },
    { classId: uid(), name: "Primary 1", arm: "A", level: "Primary 1" },
    { classId: uid(), name: "JSS 1", arm: "A", level: "JSS 1" },
    { classId: uid(), name: "JSS 2", arm: "A", level: "JSS 2" },
    { classId: uid(), name: "SS 1", arm: "A", level: "SS 1" }
  ];

  const subjects = [
    "Mathematics", "English Language", "Basic Science", "Computer Studies", "Civic Education"
  ].map((name) => ({ subjectId: uid(), name, active: true }));

  const adminStaff = { staffId: uid(), role: ROLES.ADMIN, firstName: "Adebola", lastName: "Okoye", email: "admin@royalbridge.edu.ng", phone: "08031234567", active: true };
  const bursarStaff = { staffId: uid(), role: ROLES.BURSAR, firstName: "Funmilayo", lastName: "Adekunle", email: "bursar@royalbridge.edu.ng", phone: "08021234567", active: true };
  const teacherStaff = [
    { staffId: uid(), role: ROLES.TEACHER, firstName: "Chukwuemeka", lastName: "Eze", email: "teacher1@royalbridge.edu.ng", phone: "08031112222", active: true },
    { staffId: uid(), role: ROLES.TEACHER, firstName: "Ngozi", lastName: "Okafor", email: "teacher2@royalbridge.edu.ng", phone: "08033334444", active: true },
    { staffId: uid(), role: ROLES.TEACHER, firstName: "Emeka", lastName: "Nwosu", email: "teacher3@royalbridge.edu.ng", phone: "08035556666", active: true }
  ];
  const staff = [adminStaff, bursarStaff, ...teacherStaff];

  const studentData = [
    { firstName: "David", lastName: "Chukwu", gender: "Male", classIndex: 3 },
    { firstName: "Mary", lastName: "Chukwu", gender: "Female", classIndex: 1 },
    { firstName: "Halima", lastName: "Bello", gender: "Female", classIndex: 2 },
    { firstName: "Ikenna", lastName: "Obi", gender: "Male", classIndex: 4 },
    { firstName: "Grace", lastName: "Adeyemi", gender: "Female", classIndex: 0 }
  ];
  const parentEmails = [
    "parent@royalbridge.edu.ng",
    "parent@royalbridge.edu.ng",
    "bello.parent@royalbridge.edu.ng",
    "obi.parent@royalbridge.edu.ng",
    "adeyemi.parent@royalbridge.edu.ng"
  ];
  const parentNames = [
    { first: "Samuel", last: "Chukwu", phone: "08061112222" },
    { first: "Samuel", last: "Chukwu", phone: "08061112222" },
    { first: "Yakubu", last: "Bello", phone: "08063334444" },
    { first: "Peter", last: "Obi", phone: "08065556666" },
    { first: "Rebecca", last: "Adeyemi", phone: "08067778888" }
  ];

  const students = studentData.map((s, i) => {
    const cls = classes[s.classIndex];
    const p = parentNames[i];
    return {
      studentId: uid(),
      admissionNumber: `RBIS-2026-${String(101 + i)}`,
      firstName: s.firstName,
      lastName: s.lastName,
      otherName: "",
      gender: s.gender,
      dateOfBirth: "",
      classId: cls.classId,
      className: cls.name,
      classArm: cls.arm,
      admissionDate: "2026-09-01",
      parentName: `${p.first} ${p.last}`,
      parentEmail: parentEmails[i],
      parentPhone: p.phone,
      address: SCHOOL_CONFIG.address,
      status: "active"
    };
  });

  const parents = [];
  studentData.forEach((s, i) => {
    const email = parentEmails[i];
    let parent = parents.find((p) => p.email === email);
    if (!parent) {
      const p = parentNames[i];
      parent = { parentId: uid(), firstName: p.first, lastName: p.last, email, phone: p.phone, children: [] };
      parents.push(parent);
    }
    const student = students[i];
    parent.children.push({ studentId: student.studentId, admissionNumber: student.admissionNumber });
  });

  const users = [
    { userId: uid(), email: adminStaff.email, role: ROLES.ADMIN, staffId: adminStaff.staffId, parentId: null, active: true, activated: true, password: "password123" },
    { userId: uid(), email: bursarStaff.email, role: ROLES.BURSAR, staffId: bursarStaff.staffId, parentId: null, active: true, activated: true, password: "password123" },
    ...teacherStaff.map((t) => ({ userId: uid(), email: t.email, role: ROLES.TEACHER, staffId: t.staffId, parentId: null, active: true, activated: true, password: "password123" })),
    ...parents.map((p) => ({ userId: uid(), email: p.email, role: ROLES.PARENT, staffId: null, parentId: p.parentId, active: true, activated: true, password: "password123" }))
  ];

  const teacherAssignments = teacherStaff.map((t, idx) => ({
    assignmentId: uid(),
    staffId: t.staffId,
    classId: classes[(idx + 2) % classes.length].classId,
    subjectId: subjects[idx % subjects.length].subjectId,
    isClassTeacher: true
  }));

  const feeCategories = ["Tuition", "Development Levy", "Examination Fee", "ICT Fee", "Transport"]
    .map((name) => ({ feeId: uid(), name, description: name }));

  const feeStructures = classes.map((cls) => ({
    structureId: uid(),
    feeId: feeCategories[0].feeId,
    feeName: "Tuition",
    classId: cls.classId,
    sessionId,
    termName: CURRENT_TERM,
    amount: cls.name.includes("SS") ? 120000 : cls.name.includes("JSS") ? 80000 : cls.name.includes("Primary") ? 60000 : 40000
  }));

  const payments = students.slice(0, 5).map((s, i) => ({
    paymentId: uid(),
    receiptNumber: `RBIS-${String(10001 + i)}`,
    studentId: s.studentId,
    amount: [80000, 60000, 80000, 120000, 40000][i],
    paymentDate: `2026-09-${String(10 + i).padStart(2, "0")}`,
    paymentMethod: ["Cash", "Bank Transfer", "POS", "Bank Transfer", "Cash"][i],
    feeCategory: "Tuition",
    sessionId,
    termName: CURRENT_TERM,
    recordedBy: bursarStaff.staffId,
    notes: "First term tuition"
  }));

  const announcements = [
    { announcementId: uid(), title: "Resumption Notice", message: "All students resume on Monday, 8th September 2026. Parents are advised to complete first term payments before resumption.", audience: "everyone", date: "2026-09-01", status: "published" },
    { announcementId: uid(), title: "Mid-Term Assessment", message: "Mid-term assessments begin in week six. Teachers should prepare their question papers on time.", audience: "teachers", date: "2026-09-15", status: "published" },
    { announcementId: uid(), title: "PTA Meeting", message: "The termly PTA meeting holds at the school hall. Your attendance is important.", audience: "parents", date: "2026-09-20", status: "published" },
    { announcementId: uid(), title: "Staff Development Day", message: "A staff development workshop will hold on the last Friday of the month.", audience: "staff", date: "2026-09-25", status: "published" },
    { announcementId: uid(), title: "Independence Day", message: "The school will observe Independence Day. Normal academic activities resume the next day.", audience: "everyone", date: "2026-10-01", status: "published" }
  ];

  const now = Date.now();
  const adminUser = users.find((u) => u.role === ROLES.ADMIN);
  const bursarUser = users.find((u) => u.role === ROLES.BURSAR);
  const teacherUser = users.find((u) => u.role === ROLES.TEACHER);
  const parentUser = users.find((u) => u.role === ROLES.PARENT);

  const notifications = [
    { id: uid(), userId: adminUser.userId, title: "New Payment Recorded", message: "A payment of ₦80,000 was recorded for David Chukwu.", type: NOTIFICATION_TYPES.PAYMENT, createdAt: new Date(now - 3600e3).toISOString(), read: false, link: "pages/admin/payments.html" },
    { id: uid(), userId: adminUser.userId, title: "Result Submitted for Approval", message: "Mathematics results for JSS 2A are awaiting your approval.", type: NOTIFICATION_TYPES.RESULT, createdAt: new Date(now - 7200e3).toISOString(), read: false, link: "pages/admin/results.html" },
    { id: uid(), userId: bursarUser.userId, title: "Payment Activity", message: "Two payments were recorded today. Review the collection report.", type: NOTIFICATION_TYPES.PAYMENT, createdAt: new Date(now - 5400e3).toISOString(), read: false, link: "pages/bursar/payments.html" },
    { id: uid(), userId: teacherUser.userId, title: "Result Submission Reminder", message: "Please submit your First Term results before the deadline.", type: NOTIFICATION_TYPES.RESULT, createdAt: new Date(now - 9000e3).toISOString(), read: false, link: "pages/teacher/results.html" },
    { id: uid(), userId: parentUser.userId, title: "Payment Recorded", message: "Your payment for David Chukwu has been recorded successfully.", type: NOTIFICATION_TYPES.PAYMENT, createdAt: new Date(now - 10800e3).toISOString(), read: false, link: "pages/parent/payments.html" }
  ];

  return deepClone({
    school: { name: SCHOOL_CONFIG.name, motto: SCHOOL_CONFIG.motto, address: SCHOOL_CONFIG.address, session: CURRENT_SESSION, term: CURRENT_TERM },
    sessions,
    terms,
    classes,
    subjects,
    staff,
    teachers: teacherStaff,
    students,
    parents,
    users,
    teacherAssignments,
    feeCategories,
    feeStructures,
    payments,
    attendance: [],
    results: [],
    announcements,
    notifications
  });
}
