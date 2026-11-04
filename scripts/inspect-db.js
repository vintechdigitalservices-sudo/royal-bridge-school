/* eslint-disable no-console */
/**
 * Inspects the live Firestore database to distinguish real records from
 * demo/mock records (isDemo: true + dataOrigin: "development-seed").
 *
 * Usage: node scripts/inspect-db.js
 */
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
  "schoolSettings", "sessions", "terms", "classes", "subjects",
  "staff", "students", "users", "studentAccess", "teacherAssignments",
  "feeStructures", "payments", "attendance", "results", "reportSheets",
  "announcements", "notifications", "auditLogs"
];

async function main() {
  const keyPath = findKeyFile();
  const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  console.log(`Project: ${serviceAccount.project_id}\n`);
  const authUsers = await admin.auth().listUsers(100);
  console.log("Firebase Auth users:");
  authUsers.users.forEach((u) => {
    console.log(`  ${u.uid} ${u.email} ${u.displayName || "-"} created=${u.metadata.creationTime.slice(0, 10)}`);
  });
  console.log("");

  for (const coll of COLLECTIONS) {
    const snap = await db.collection(coll).get();
    if (snap.empty) {
      console.log(`${coll}: EMPTY`);
      continue;
    }
    const demo = [];
    const real = [];
    snap.forEach((d) => {
      const data = d.data();
      const entry = { id: d.id, data };
      if (data.isDemo === true || data.dataOrigin === "development-seed") demo.push(entry);
      else real.push(entry);
    });
    console.log(`${coll}: total=${snap.size} demo=${demo.length} nonDemo=${real.length}`);
    const show = (list, label) => {
      list.slice(0, 8).forEach(({ id, data }) => {
        const bits = [];
        ["name", "firstName", "lastName", "title", "email", "role", "studentId", "admissionNumber", "classId", "termName", "sessionId", "amount", "receiptNumber", "status", "code"].forEach((k) => {
          if (data[k] !== undefined && data[k] !== "") bits.push(`${k}=${data[k]}`);
        });
        console.log(`  ${label} ${id} :: ${bits.join(" ")}`);
      });
      if (list.length > 8) console.log(`  ... ${list.length - 8} more`);
    };
    show(demo, "[demo]");
    show(real, "[real]");
  }
  process.exit(0);
}

main().catch((err) => { console.error("INSPECT FAILED:", err.message); process.exit(1); });
