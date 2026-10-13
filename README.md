# ROYALBRIDGE INT'L SCHOOL — School Portal (V2)

A mobile-first school management portal built with HTML, CSS, and Vanilla JavaScript (ES6 modules),
backed by **Firebase** (Authentication + Cloud Firestore).
**Motto:** Inspiring Excellence
**Address:** 10 Lady Mapo Star Oyolu Junction, College Road 3-3 Onitsha.

Themes: **Midnight / Dark Royal Blue**. Roles: **Admin, Bursar, Teacher, Student**.

## Tech
- HTML5, CSS3, Vanilla JS (ES6 modules)
- Firebase Auth + Cloud Firestore (modular SDK, lazy-loaded from gstatic)
- Font Awesome 6
- PWA (manifest + service worker + offline fallback)

## Structure
- `index.html` — login
- `pages/` — `admin`, `bursar`, `teacher`, `student` portals, auth flows
  (`forgot-password.html`, `reset-password.html`, `activate-account.html`), shared
  `notifications.html`, and `reports/view.html` (3-page report sheet viewer).
- `assets/css/` — `style.css` (theme tokens), `components.css`, `responsive.css`, `report-sheet.css`
- `assets/js/` — `config`, `utils`, `storage` (session cache), `services`, `reporting`,
  `reportSheet`, `auth`, `paths`, `navigation`, `notification-center`, `modal`, `notifications`, `app`
- `assets/js/firebase/` — public config + lazy SDK init · `assets/js/repositories/` — per-collection repos
- `assets/js/data/store.js` — hydrated Firestore mirror + optimistic writes
- `assets/images/` — logo + PWA icons; `assets/audio/notification-chime.wav`
- `scripts/` — privileged idempotent Firestore seed + verifier · `docs/` — architecture notes

## Run locally
Serve the folder over HTTP (modules + service worker require it), e.g.:

```
python -m http.server 8080
```

Then open http://localhost:8080/.

## Demo credentials
Password for all accounts: `password123`

| Role    | Email                          |
|---------|--------------------------------|
| Admin   | admin@royalbridge.edu.ng       |
| Bursar  | bursar@royalbridge.edu.ng      |
| Teacher | teacher1@royalbridge.edu.ng    |
| Student | student1@ / student2@royalbridge.edu.ng |

## Data
Firestore is the **source of truth**. The client hydrates all collections into an in-memory mirror
and writes optimistically (revert + error event on failure). Demo data is seeded with the Admin SDK
via `scripts/seed-firestore.js` (idempotent, demo-tagged, ≤5 records per entity) and verified with
`scripts/verify-firestore.js`. See `docs/FIRESTORE-ARCHITECTURE.md`.

## Results & report sheets
- Weights: **C/A 20 · Mid Term 20 · Exam 60 · Total 100**.
- Lifecycle: `draft → submitted → returned → approved → published` (students see published only).
- Four 3-page report sheets (Nursery/Basic · Termly/Cumulative) render in `reportSheet.js`, with the
  third-term cumulative averaging the three term results. Print to PDF from the browser.

## Notifications
User-specific and role-scoped. Bell badge shows the live unread count and hides at zero; dedicated
page `pages/notifications.html` (All / Unread / Read). Sound plays only for genuinely new
notifications, after the first user gesture, and can be toggled Off.

## PWA
`manifest.json` + `service-worker.js` cache the static shell only (HTML/CSS/JS/icons/logo/audio)
with versioned caches and old-cache cleanup. Credentials, payments and other sensitive/API
responses are **never** cached. `offline.html` is the offline fallback.

> Note: GitHub Pages serves this repo under a subpath, so all internal links are relative.
