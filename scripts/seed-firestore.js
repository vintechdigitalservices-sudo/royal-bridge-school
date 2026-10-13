/* eslint-disable no-console */
/**
 * ROYALBRIDGE INT'L SCHOOL — privileged Firestore seed (Admin SDK).
 *
 * SAFE BY DESIGN
 *  - Only ever creates docs that do not exist, and never overwrites a real (non-demo) doc.
 *  - Every seeded doc is tagged `isDemo: true`, `dataOrigin: "development-seed"`.
 *  - Deterministic document IDs => idempotent; re-running creates nothing new.
 *  - `--reset-demo` overwrites ONLY docs that are already tagged isDemo.
 *  - `--extra-cumulative` adds the 2 remaining term docs for a complete Basic cumulative demo.
 *
 * Usage:  node scripts/seed-firestore.js [--dry-run] [--reset-demo] [--extra-cumulative]
 * Key:    FIREBASE_SERVICE_ACCOUNT env var, else the *firebase-adminsdk*.json in repo root.
 * NOTE:   Never commit the service-account key (git-ignored).
 */
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const args = new Set(process.argv.slice(2));
const DRY = args.has("--dry-run");
const RESET_DEMO = args.has("--reset-demo");
const EXTRA = args.has("--extra-cumulative");

const ROOT = path.resolve(__dirname, "..");

function findKeyFile() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) return process.env.FIREBASE_SERVICE_ACCOUNT;
  const file = fs.readdirSync(ROOT).find((f) => /firebase-adminsdk.*\.json$/.test(f));
  if (!file) throw new Error("No service-account key found. Set FIREBASE_SERVICE_ACCOUNT or place the *firebase-adminsdk*.json in the repo root.");
  return path.join(ROOT, file);
}

const SESSION_ID = "session-2026-2027";
const SESSION_NAME = "2026/2027";
const TERMS = [
  { termId: "term-2026-2027-1", name: "First Term", slug: "first-term" },
  { termId: "term-2026-2027-2", name: "Second Term", slug: "second-term" },
  { termId: "term-2026-2027-3", name: "Third Term", slug: "third-term" }
];
const CURRENT_TERM = "Third Term";

const GRADING_SCALE = {
  confirmed: false, // provisional — MUST be confirmed against official school policy
  note: "Provisional scale. Confirm official boundaries/tie rules before publishing.",
  boundaries: [
    { min: 70, grade: "A", remark: "Excellent" },
    { min: 60, grade: "B", remark: "Very Good" },
    { min: 50, grade: "C", remark: "Good" },
    { min: 40, grade: "D", remark: "Fair" },
    { min: 30, grade: "E", remark: "Pass" },
    { min: 0, grade: "F", remark: "Fail" }
  ]
};
const WEIGHTS = { ca: 20, mid: 20, exam: 60 };

function subject(code, label) { return { code, label }; }
const NURSERY_SUBJECTS = [
  subject("LIT", "LITERACY"), subject("NUM", "NUMERACY"), subject("SCI", "SCIENCE"),
  subject("ORA", "ORAL EXPRESSION"), subject("SAF", "SAFETY MEASURE"), subject("HHB", "HEALTH HABIT"),
  subject("HED", "HEALTH EDUCATION"), subject("SCH", "SOCIAL HABIT"), subject("CRS", "C.R.S"),
  subject("RHY", "NURSERY RHYMES"), subject("ENV", "ENVIRONMENT HEALTH"), subject("CIV", "CIVIC EDUCATION"),
  subject("FNU", "FOOD AND NUTRITION"), subject("ART", "ART"), subject("PHE", "P.H.E"),
  subject("DIC", "DICTION"), subject("DTT", "DICTATION"), subject("COM", "COMPUTER"), subject("WRT", "WRITING")
];
const BASIC_TERMLY_SUBJECTS = [
  subject("ENG", "ENGLISH LANGUAGE"), subject("MTH", "MATHEMATICS"), subject("CIV", "CIVIC EDUCATION"),
  subject("AGR", "AGRICULTURAL SCIENCE"), subject("HEC", "HOME ECONOMICS"), subject("SOS", "SOCIAL STUDIES"),
  subject("HED", "HEALTH EDUCATION"), subject("BSC", "BASIC SCIENCE"), subject("CRS", "C.R.S"),
  subject("CCA", "C.C.A"), subject("VBR", "VERBAL REASONING"), subject("QTR", "QUANTITATIVE REASONING"),
  subject("IGB", "IGBO LANGUAGE"), subject("FRE", "FRENCH"), subject("CMP", "COMPREHENSION"),
  subject("PHE", "P.H.E"), subject("DIC", "DICTION"), subject("DTT", "DICTATION"),
  subject("CWR", "CREATIVE WRITING"), subject("COM", "COMPUTER"), subject("WRT", "WRITING")
];
const BASIC_CUMULATIVE_SUBJECTS = BASIC_TERMLY_SUBJECTS.map((s, i) => (i === 0 ? subject("ENG", "ENGLISH") : s));

const AFFECTIVE_TRAITS = ["ATTENDANCE", "PUNCTUALITY", "NEATNESS", "RELATIONSHIP WITH PEERS", "RELATIONSHIP WITH TEACHERS", "ATTITUDE TO CLASS WORK"];
const PSYCHOMOTOR = ["READING SKILLS", "LISTENING SKILLS", "WRITING SKILLS", "LOGIC REASONING"];
const RATINGS = ["EXCELLENT", "VERY GOOD", "GOOD", "FAIR", "POOR"];

function gradeFor(total) {
  const b = GRADING_SCALE.boundaries.find((x) => total >= x.min);
  return b ? { grade: b.grade, remark: b.remark } : { grade: "F", remark: "Fail" };
}

let seedSeq = 0;
function scoreMap(subjects, base) {
  const map = {};
  subjects.forEach((s, i) => {
    const ca = Math.min(WEIGHTS.ca, base + ((i * 3) % 6));
    const mid = Math.min(WEIGHTS.mid, base - 1 + ((i * 2) % 6));
    const exam = Math.min(WEIGHTS.exam, base * 2 + ((i * 5) % 12));
    const total = ca + mid + exam;
    map[s.code] = { ca, mid, exam, total, grade: gradeFor(total).grade, remark: gradeFor(total).remark };
  });
  return map;
}

function resultDoc({ id, studentId, classId, termName, termSlug, levelGroup, base }) {
  const subjects = levelGroup === "nursery" ? NURSERY_SUBJECTS : BASIC_TERMLY_SUBJECTS;
  const map = scoreMap(subjects, base);
  const totals = Object.values(map).map((m) => m.total);
  const totalScore = totals.reduce((a, b) => a + b, 0);
  const average = Math.round((totalScore / subjects.length) * 100) / 100;
  const affective = {};
  AFFECTIVE_TRAITS.forEach((t, i) => (affective[t] = RATINGS[(i + base) % 5]));
  const psychomotor = {};
  PSYCHOMOTOR.forEach((t, i) => (psychomotor[t] = RATINGS[(i + base + 1) % 5]));
  return {
    resultId: id, studentId, classId, sessionId: SESSION_ID, termName, termSlug, levelGroup,
    subjects: map, subjectCount: subjects.length, totalScore, average,
    classHighestAverage: average + 8.5, classLowestAverage: average - 9.2,
    affective, psychomotor,
    teacherComment: "A diligent pupil. Keep up the good effort.",
    headTeacherComment: "A commendable result. Well done.",
    nextTermBegins: "2026-09-08",
    dueNextTerm: 45000,
    status: "published",
    isDemo: true, dataOrigin: "development-seed"
  };
}

function buildDocs() {
  const docs = [];

  docs.push(["schoolSettings", "main", {
    settingsId: "main",
    name: "ROYALBRIDGE INT'L SCHOOL",
    motto: "Inspiring Excellence",
    address: "10 Lady Mapo Star Oyolu Junction, College Road 3-3 Onitsha",
    currentSessionId: SESSION_ID,
    currentTerm: CURRENT_TERM,
    weights: WEIGHTS,
    gradingScale: GRADING_SCALE,
    reportConfig: {
      coverAddress: "10 LADY STAR CRESCENT G/L ESTATE 3-3",
      nurserySubjects: NURSERY_SUBJECTS,
      basicTermlySubjects: BASIC_TERMLY_SUBJECTS,
      basicCumulativeSubjects: BASIC_CUMULATIVE_SUBJECTS,
      affectiveTraits: AFFECTIVE_TRAITS,
      psychomotorSkills: PSYCHOMOTOR,
      ratingLegend: RATINGS
    },
    isDemo: true, dataOrigin: "development-seed"
  }]);

  docs.push(["sessions", SESSION_ID, { sessionId: SESSION_ID, name: SESSION_NAME, current: true, isDemo: true, dataOrigin: "development-seed" }]);
  TERMS.forEach((t) => docs.push(["terms", t.termId, { termId: t.termId, name: t.name, slug: t.slug, sessionId: SESSION_ID, current: t.name === CURRENT_TERM, isDemo: true, dataOrigin: "development-seed" }]));

  const classes = [
    { classId: "nursery-2", name: "Nursery 2", arm: null, level: "Nursery 2", levelGroup: "nursery" },
    { classId: "primary-1a", name: "Primary 1", arm: "A", level: "Primary 1", levelGroup: "basic" },
    { classId: "primary-3a", name: "Primary 3", arm: "A", level: "Primary 3", levelGroup: "basic" },
    { classId: "jss-1a", name: "JSS 1", arm: "A", level: "JSS 1", levelGroup: "basic" },
    { classId: "ss-1a", name: "SS 1", arm: "A", level: "SS 1", levelGroup: "basic" }
  ];
  classes.forEach((c) => docs.push(["classes", c.classId, { ...c, isDemo: true, dataOrigin: "development-seed" }]));

  const subjects = [
    { subjectId: "sub-english", code: "ENG", name: "English Language" },
    { subjectId: "sub-mathematics", code: "MTH", name: "Mathematics" },
    { subjectId: "sub-basic-science", code: "BSC", name: "Basic Science" },
    { subjectId: "sub-civic", code: "CIV", name: "Civic Education" },
    { subjectId: "sub-crs", code: "CRS", name: "C.R.S" }
  ];
  subjects.forEach((s) => docs.push(["subjects", s.subjectId, { ...s, isDemo: true, dataOrigin: "development-seed" }]));

  const staff = [
    { staffId: "stf-admin", firstName: "Adebola", lastName: "Okoye", role: "admin", email: "admin@royalbridge.edu.ng" },
    { staffId: "stf-bursar", firstName: "Funmilayo", lastName: "Adekunle", role: "bursar", email: "bursar@royalbridge.edu.ng" },
    { staffId: "stf-t1", firstName: "Chukwuemeka", lastName: "Eze", role: "teacher", email: "teacher1@royalbridge.edu.ng" },
    { staffId: "stf-t2", firstName: "Ngozi", lastName: "Okafor", role: "teacher", email: "teacher2@royalbridge.edu.ng" },
    { staffId: "stf-t3", firstName: "Emeka", lastName: "Nwosu", role: "teacher", email: "teacher3@royalbridge.edu.ng" }
  ];
  staff.forEach((s) => docs.push(["staff", s.staffId, { ...s, active: true, isDemo: true, dataOrigin: "development-seed" }]));

  const students = [
    { studentId: "stu-001", admissionNumber: "RBI/2026/001", firstName: "Ada", lastName: "Obi", classId: "nursery-2", levelGroup: "nursery", age: 4, sex: "F", guardian: { name: "Mrs. Obi", phone: "08030000001", relationship: "Mother" } },
    { studentId: "stu-002", admissionNumber: "RBI/2026/002", firstName: "Emeka", lastName: "Nwosu", classId: "primary-3a", levelGroup: "basic", age: 9, sex: "M", guardian: { name: "Mr. Nwosu", phone: "08030000002", relationship: "Father" } },
    { studentId: "stu-003", admissionNumber: "RBI/2026/003", firstName: "Zainab", lastName: "Bello", classId: "primary-1a", levelGroup: "basic", age: 6, sex: "F", guardian: { name: "Mr. Bello", phone: "08030000003", relationship: "Father" } },
    { studentId: "stu-004", admissionNumber: "RBI/2026/004", firstName: "Chinedu", lastName: "Eze", classId: "jss-1a", levelGroup: "basic", age: 11, sex: "M", guardian: { name: "Mrs. Eze", phone: "08030000004", relationship: "Mother" } },
    { studentId: "stu-005", admissionNumber: "RBI/2026/005", firstName: "Tunde", lastName: "Adeyemi", classId: "ss-1a", levelGroup: "basic", age: 14, sex: "M", guardian: { name: "Mr. Adeyemi", phone: "08030000005", relationship: "Father" } }
  ];
  students.forEach((s) => docs.push(["students", s.studentId, { ...s, status: "active", isDemo: true, dataOrigin: "development-seed" }]));

  const users = [
    { uid: "u-admin", email: "admin@royalbridge.edu.ng", role: "admin", staffId: "stf-admin" },
    { uid: "u-bursar", email: "bursar@royalbridge.edu.ng", role: "bursar", staffId: "stf-bursar" },
    { uid: "u-teacher1", email: "teacher1@royalbridge.edu.ng", role: "teacher", staffId: "stf-t1" },
    { uid: "u-student1", email: "student1@royalbridge.edu.ng", role: "student", studentId: "stu-001" },
    { uid: "u-student2", email: "student2@royalbridge.edu.ng", role: "student", studentId: "stu-002" }
  ];
  users.forEach((u) => docs.push(["users", u.uid, { ...u, active: true, isDemo: true, dataOrigin: "development-seed" }]));

  const assignments = [
    { assignmentId: "ta-001", teacherId: "stf-t1", classId: "nursery-2", subjectIds: NURSERY_SUBJECTS.map((s) => s.code) },
    { assignmentId: "ta-002", teacherId: "stf-t2", classId: "primary-3a", subjectIds: ["ENG", "MTH", "BSC", "CIV", "CRS"] },
    { assignmentId: "ta-003", teacherId: "stf-t3", classId: "primary-1a", subjectIds: ["ENG", "MTH", "BSC"] },
    { assignmentId: "ta-004", teacherId: "stf-t1", classId: "jss-1a", subjectIds: ["ENG", "MTH"] },
    { assignmentId: "ta-005", teacherId: "stf-t2", classId: "ss-1a", subjectIds: ["ENG", "MTH", "BSC"] }
  ];
  assignments.forEach((a) => docs.push(["teacherAssignments", a.assignmentId, { ...a, sessionId: SESSION_ID, isDemo: true, dataOrigin: "development-seed" }]));

  const feeStructures = [
    { feeId: "fee-nursery-2", classId: "nursery-2", termName: "Third Term", items: [{ name: "Tuition", amount: 40000 }, { name: "Development", amount: 5000 }] },
    { feeId: "fee-primary-1a", classId: "primary-1a", termName: "Third Term", items: [{ name: "Tuition", amount: 45000 }, { name: "Development", amount: 5000 }] },
    { feeId: "fee-primary-3a", classId: "primary-3a", termName: "Third Term", items: [{ name: "Tuition", amount: 50000 }, { name: "Development", amount: 5000 }] },
    { feeId: "fee-jss-1a", classId: "jss-1a", termName: "Third Term", items: [{ name: "Tuition", amount: 60000 }, { name: "Development", amount: 5000 }] },
    { feeId: "fee-ss-1a", classId: "ss-1a", termName: "Third Term", items: [{ name: "Tuition", amount: 70000 }, { name: "Development", amount: 5000 }] }
  ];
  feeStructures.forEach((f) => docs.push(["feeStructures", f.feeId, { ...f, total: f.items.reduce((s, i) => s + i.amount, 0), sessionId: SESSION_ID, isDemo: true, dataOrigin: "development-seed" }]));

  const payments = [
    { paymentId: "pay-001", receiptNumber: "RBI-RCPT-0001", studentId: "stu-001", amount: 45000, paymentMethod: "Bank Transfer", feeCategory: "Third Term Fees", status: "confirmed" },
    { paymentId: "pay-002", receiptNumber: "RBI-RCPT-0002", studentId: "stu-002", amount: 55000, paymentMethod: "Cash", feeCategory: "Third Term Fees", status: "confirmed" },
    { paymentId: "pay-003", receiptNumber: "RBI-RCPT-0003", studentId: "stu-003", amount: 50000, paymentMethod: "POS", feeCategory: "Third Term Fees", status: "pending" },
    { paymentId: "pay-004", receiptNumber: "RBI-RCPT-0004", studentId: "stu-004", amount: 65000, paymentMethod: "Bank Transfer", feeCategory: "Third Term Fees", status: "confirmed" },
    { paymentId: "pay-005", receiptNumber: "RBI-RCPT-0005", studentId: "stu-005", amount: 0, paymentMethod: "Cash", feeCategory: "Third Term Fees", status: "recorded" }
  ];
  payments.forEach((p) => docs.push(["payments", p.paymentId, { ...p, sessionId: SESSION_ID, termName: "Third Term", paymentDate: "2026-10-05", isDemo: true, dataOrigin: "development-seed" }]));

  const attendance = [
    { attendanceId: "att-001", classId: "nursery-2", date: "2026-10-05", records: [{ studentId: "stu-001", status: "present" }] },
    { attendanceId: "att-002", classId: "primary-3a", date: "2026-10-05", records: [{ studentId: "stu-002", status: "present" }] },
    { attendanceId: "att-003", classId: "primary-1a", date: "2026-10-05", records: [{ studentId: "stu-003", status: "present" }] },
    { attendanceId: "att-004", classId: "jss-1a", date: "2026-10-05", records: [{ studentId: "stu-004", status: "late" }] },
    { attendanceId: "att-005", classId: "ss-1a", date: "2026-10-05", records: [{ studentId: "stu-005", status: "absent" }] }
  ];
  attendance.forEach((a) => docs.push(["attendance", a.attendanceId, { ...a, sessionId: SESSION_ID, termName: "Third Term", isDemo: true, dataOrigin: "development-seed" }]));

  // Results: per student+term. 5 docs demonstrate Nursery cumulative (stu-001 t1-3)
  // and Basic termly (stu-002 t3); Basic cumulative shows the missing 2nd term (valid state).
  const resultSpecs = [
    { id: "res-2026-2027-first-term-stu-001", studentId: "stu-001", classId: "nursery-2", termName: "First Term", termSlug: "first-term", levelGroup: "nursery", base: 12 },
    { id: "res-2026-2027-second-term-stu-001", studentId: "stu-001", classId: "nursery-2", termName: "Second Term", termSlug: "second-term", levelGroup: "nursery", base: 13 },
    { id: "res-2026-2027-third-term-stu-001", studentId: "stu-001", classId: "nursery-2", termName: "Third Term", termSlug: "third-term", levelGroup: "nursery", base: 14 },
    { id: "res-2026-2027-first-term-stu-002", studentId: "stu-002", classId: "primary-3a", termName: "First Term", termSlug: "first-term", levelGroup: "basic", base: 13 },
    { id: "res-2026-2027-third-term-stu-002", studentId: "stu-002", classId: "primary-3a", termName: "Third Term", termSlug: "third-term", levelGroup: "basic", base: 15 }
  ];
  if (EXTRA) {
    resultSpecs.push({ id: "res-2026-2027-second-term-stu-002", studentId: "stu-002", classId: "primary-3a", termName: "Second Term", termSlug: "second-term", levelGroup: "basic", base: 14 });
  }
  resultSpecs.forEach((r) => docs.push(["results", r.id, resultDoc(r)]));

  docs.push(["reportSheets", "rs-2026-2027-third-term-stu-001", {
    reportId: "rs-2026-2027-third-term-stu-001", studentId: "stu-001", classId: "nursery-2",
    sessionId: SESSION_ID, termName: "Third Term", format: "nursery-cumulative",
    publishedAt: "2026-10-10", publishedBy: "stf-admin", isDemo: true, dataOrigin: "development-seed"
  }]);

  const announcements = [
    { announcementId: "ann-001", title: "Third Term Resumption", message: "All students resume for the third term on Monday. Parents should complete outstanding fees before resumption.", audience: "everyone", date: "2026-09-01", status: "published" },
    { announcementId: "ann-002", title: "Mid-Term Assessment", message: "Mid-term assessments begin in week six. Teachers should prepare their question papers on time.", audience: "teachers", date: "2026-09-15", status: "published" },
    { announcementId: "ann-003", title: "PTA Meeting", message: "The termly PTA meeting holds at the school hall. Your attendance is important.", audience: "parents", date: "2026-09-20", status: "published" },
    { announcementId: "ann-004", title: "Staff Development Day", message: "A staff development workshop will hold on the last Friday of the month.", audience: "staff", date: "2026-09-25", status: "published" },
    { announcementId: "ann-005", title: "Independence Day", message: "The school will observe Independence Day. Normal academic activities resume the next day.", audience: "everyone", date: "2026-10-01", status: "published" }
  ];
  announcements.forEach((a) => docs.push(["announcements", a.announcementId, { ...a, createdAt: a.date + "T08:00:00.000Z", isDemo: true, dataOrigin: "development-seed" }]));

  const notifications = [
    { id: "ntf-001", userId: "u-admin", title: "New Payment Recorded", message: "A payment of ₦55,000 was recorded for Emeka Nwosu.", type: "payment", link: "pages/admin/payments.html", read: false },
    { id: "ntf-002", userId: "u-admin", title: "Result Submitted for Approval", message: "Primary 3A results are awaiting your approval.", type: "result", link: "pages/admin/results.html", read: false },
    { id: "ntf-003", userId: "u-bursar", title: "Payment Activity", message: "Two payments were recorded today. Review the collection report.", type: "payment", link: "pages/bursar/payments.html", read: false },
    { id: "ntf-004", userId: "u-teacher1", title: "Result Submission Reminder", message: "Please submit your third term results before the deadline.", type: "result", link: "pages/teacher/results.html", read: false },
    { id: "ntf-005", userId: "u-student1", title: "Result Published", message: "Your Third Term result is now available to view.", type: "result_approved", link: "pages/student/results.html", read: false }
  ];
  notifications.forEach((n) => docs.push(["notifications", n.id, { ...n, createdAt: "2026-10-08T09:00:00.000Z", isDemo: true, dataOrigin: "development-seed" }]));

  return docs;
}

async function main() {
  const keyPath = findKeyFile();
  const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  const db = admin.firestore();
  const now = admin.firestore.FieldValue.serverTimestamp();

  console.log(`Project : ${serviceAccount.project_id}`);
  console.log(`Mode    : ${DRY ? "DRY RUN" : RESET_DEMO ? "RESET DEMO" : "CREATE-IF-MISSING"}${EXTRA ? " (+extra cumulative)" : ""}\n`);

  const docs = buildDocs();
  const perColl = {};
  const counts = { created: 0, skipped: 0, updated: 0, blocked: 0 };
  const problems = [];
  let batch = db.batch();
  let batchCount = 0;

  for (const [coll, id, data] of docs) {
    perColl[coll] = perColl[coll] || { created: 0, skipped: 0, updated: 0, blocked: 0 };
    let ref; let snap;
    try {
      ref = db.collection(coll).doc(id);
      snap = await ref.get();
    } catch (err) {
      counts.blocked++; perColl[coll].blocked++;
      problems.push(`${coll}/${id}: read failed -> ${err.message}`);
      continue;
    }

    const payload = { ...data, updatedAt: now };
    if (!snap.exists) {
      Object.assign(payload, { createdAt: now });
      batch.set(ref, payload);
      counts.created++; perColl[coll].created++; batchCount++;
      if (batchCount >= 400) { if (!DRY) await batch.commit(); batch = db.batch(); batchCount = 0; }
    } else if (RESET_DEMO && snap.get("isDemo") === true) {
      batch.set(ref, payload, { merge: true });
      counts.updated++; perColl[coll].updated++; batchCount++;
      if (batchCount >= 400) { if (!DRY) await batch.commit(); batch = db.batch(); batchCount = 0; }
    } else if (snap.get("isDemo") === true || snap.get("isDemo") === undefined) {
      counts.skipped++; perColl[coll].skipped++;
    } else {
      counts.blocked++; perColl[coll].blocked++;
      problems.push(`${coll}/${id}: existing NON-demo doc — refusing to overwrite`);
    }
  }

  if (!DRY && batchCount > 0) await batch.commit();

  console.log("Collection            created  skipped  updated  blocked");
  Object.keys(perColl).sort().forEach((c) => {
    const x = perColl[c];
    console.log(`${c.padEnd(20)} ${String(x.created).padStart(7)} ${String(x.skipped).padStart(8)} ${String(x.updated).padStart(8)} ${String(x.blocked).padStart(8)}`);
  });
  console.log(`\nTOTAL created=${counts.created} skipped=${counts.skipped} updated=${counts.updated} blocked=${counts.blocked}`);
  if (problems.length) {
    console.log("\nBLOCKED DOCUMENTS:");
    problems.forEach((p) => console.log("  - " + p));
  }
  if (DRY) console.log("\n(Dry run — nothing was written.)");
}

main().catch((err) => { console.error("SEED FAILED:", err.message); process.exit(1); });
