# ROYALBRIDGE INT'L SCHOOL — Firestore architecture (V2)

Firebase project: `royal-bridge-college-3ec88`.
Client web config lives in `assets/js/firebase/config.js` (public identifier — safe to ship).
Privileged seeding uses the Admin SDK + a local service-account key that is **git-ignored** and never bundled.

## Design principles

- Firestore is the **source of truth**. `localStorage` is only allowed for UI preferences
  (notification sound, permission prompt flags) and an explicit offline queue — never as a
  silent substitute for a failed write.
- One **repository per collection** (`assets/js/repositories/*.js`). UI never issues ad-hoc
  Firestore queries; it calls services, which call repositories.
- Collections are **top-level** (the app queries across entities and roles; nesting would make
  cross-entity queries and rules harder). Relationships are by **stable ID fields**, not names.
- Every document carries `isDemo`, `dataOrigin`, `createdAt`, `updatedAt`, and `createdBy`
  where applicable. Seeded docs are `isDemo: true`, `dataOrigin: "development-seed"`.
- Full curriculum subject lists are **configuration**, not master documents (avoids 40+ rows and
  keeps within the 5-record seed cap).

## Collections

| Collection | Doc ID | Key fields | Notes |
|---|---|---|---|
| `schoolSettings` | `main` | name, motto, address, currentSessionId, currentTerm, gradingScale, reportConfig, weights | single config doc |
| `sessions` | `session-2026-2027` | sessionId, name, current | ≤5 |
| `terms` | `term-...-1/2/3` | termId, name, sessionId, current | ≤5 |
| `classes` | `nursery-2`, … | classId, name, arm, level, levelGroup (`nursery`/`basic`) | ≤5 |
| `subjects` | `sub-english`, … | subjectId, name, code | small master catalogue (≤5) |
| `staff` | `stf-admin`, … | staffId, firstName, lastName, role, email, active | admin/bursar/teacher (≤5) |
| `students` | `stu-001`, … | studentId, admissionNumber, firstName, lastName, classId, levelGroup, guardian | ≤5 |
| `users` | `u-admin`, … | uid/ email, role, staffId\|studentId, active | role resolved from here, never self-chosen |
| `teacherAssignments` | `ta-001`, … | assignmentId, teacherId, classId, subjectIds[], sessionId | ≤5 |
| `feeStructures` | `fee-...` | feeId, classId, termName, items[], total | ≤5 |
| `payments` | `pay-001`, … | paymentId, receiptNumber, studentId, amount, status | ≤5; status ≠ "verified" proof |
| `attendance` | `att-001`, … | attendanceId, classId, date, records[] | ≤5 |
| `results` | `res-<session>-<term>-<student>` | resultId, studentId, classId, sessionId, termName, subjects{}, totals, affective, psychomotor, comments, status | **one doc per student+term** (score map) → supports cumulative within cap |
| `reportSheets` | `rs-...` | reportId, studentId, sessionId, termName, format, publishedAt, snapshotRef | publication metadata |
| `announcements` | `ann-001`, … | announcementId, title, message, audience, date, status, createdAt | newest first |
| `notifications` | `ntf-001`, … | id, userId, title, message, type, link, read, createdAt | user-specific |
| `auditLogs` | auto | actorId, action, target, at | sensitive admin actions |

### Results status lifecycle

`draft → submitted → returned → approved → published`
Only `approved` may be `published`; students may only read their own `published` results.

### Third-term cumulative

Read the same student's `results` docs for terms 1–3 **of the same session**. Averages come from
the stored term results — never summed blindly. Missing term ⇒ the cumulative report shows the
gap rather than inventing a value.

## Security model (rule intents — deploy requires console/CLI access)

- Unauthenticated: deny all private collections.
- `users`: a user reads only their own doc; cannot change own `role`.
- `students`: a student reads only their own; teachers read assigned classes; admin/bursar per role.
- `results`: students read only own **published** results; teachers write within assignments;
  only admin approves/publishes.
- `payments`/`feeStructures`: bursar/admin; students read own receipts only.
- `notifications`: user reads/writes only their own docs.
- `schoolSettings`/`sessions`/`terms`/`classes`/`subjects`: authenticated read; admin write.
- Seeding uses the Admin SDK (bypasses rules) and is idempotent + demo-tagged.

## Seed / verify

```
npm install
npm run seed          # idempotent; creates demo docs only if missing
npm run seed:dry      # report only
npm run seed:reset-demo  # overwrite ONLY isDemo docs
npm run verify        # read back + print per-collection counts
```

Service-account key path: `FIREBASE_SERVICE_ACCOUNT` env var, else the `*firebase-adminsdk*.json`
in the repo root (git-ignored).
