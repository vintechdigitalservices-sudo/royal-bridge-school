/* eslint-disable no-console */
/** Reads back seeded collections from Firestore and prints counts + a few relationship checks. */
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const ROOT = path.resolve(__dirname, "..");
function findKeyFile() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) return process.env.FIREBASE_SERVICE_ACCOUNT;
  const file = fs.readdirSync(ROOT).find((f) => /firebase-adminsdk.*\.json$/.test(f));
  if (!file) throw new Error("No service-account key found.");
  return path.join(ROOT, file);
}

const COLLECTIONS = [
  "schoolSettings", "sessions", "terms", "classes", "subjects", "staff", "students", "users",
  "teacherAssignments", "feeStructures", "payments", "attendance", "results", "reportSheets",
  "announcements", "notifications", "auditLogs"
];

async function main() {
  const sa = JSON.parse(fs.readFileSync(findKeyFile(), "utf8"));
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
  const db = admin.firestore();

  console.log(`Project: ${sa.project_id}\n`);
  let total = 0;
  for (const c of COLLECTIONS) {
    const snap = await db.collection(c).get();
    total += snap.size;
    const demo = snap.docs.filter((d) => d.get("isDemo") === true).length;
    console.log(`${c.padEnd(20)} docs=${String(snap.size).padStart(4)}  demo=${demo}`);
  }
  console.log(`\nTotal documents: ${total}`);

  const results = await db.collection("results").get();
  if (!results.empty) {
    const r = results.docs[0];
    const student = await db.collection("students").doc(r.get("studentId")).get();
    console.log(`\nSample result ${r.id}: student=${student.exists ? student.get("firstName") + " " + student.get("lastName") : "MISSING"} subjects=${Object.keys(r.get("subjects") || {}).length} average=${r.get("average")} status=${r.get("status")}`);
  }
}

main().catch((e) => { console.error("VERIFY FAILED:", e.message); process.exit(1); });
