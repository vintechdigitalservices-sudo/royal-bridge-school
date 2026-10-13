# ROYALBRIDGE INT'L SCHOOL — School Portal (V1)

A mobile-first school management portal built with HTML, CSS, and Vanilla JavaScript.
**Motto:** Inspiring Excellence
**Address:** 10 LADY MAPO STAR CRESENT G/L ESTATE 3-3.

Data runs on mock/local storage and is backend-ready — replace the service layer with API
calls without touching the UI.

## Tech
- HTML5, CSS3, Vanilla JS (ES6 modules)
- Font Awesome 6
- PWA (manifest + service worker + offline fallback)

## Structure
- `index.html` — login
- `pages/` — admin, bursar, teacher, parent portals + auth flows (`notifications.html` is shared)
- `assets/css/` — `style.css`, `components.css`, `responsive.css`
- `assets/js/` — `config`, `utils`, `storage`, `seed`, `db`, `services`, `auth`, `paths`, `navigation`, `notification-center`, `modal`, `notifications`, `app`
- `assets/images/` — logo + PWA icons; `assets/audio/notification-chime.wav`

## Run locally
Serve the folder over HTTP (modules + service worker require it), e.g.:

```
python -m http.server 8080
```

Then open http://localhost:8080/.

## Demo credentials
Password for all accounts: `password123`

| Role    | Email                                     |
|---------|-------------------------------------------|
| Admin   | admin@royalbridge.edu.ng                  |
| Bursar  | bursar@royalbridge.edu.ng                 |
| Teacher | teacher1@ / teacher2@ / teacher3@ …       |
| Parent  | parent@royalbridge.edu.ng (2 children)    |

`parent@royalbridge.edu.ng` has two children (David Chukwu, Mary Chukwu) to demo multi-child switching.

## Notifications
User-specific and role-scoped. Service (`notificationService`) → state → bell badge → panel → chime.
- Bell badge shows the live unread count and hides at zero.
- Panel: dropdown on desktop, full-width sheet on mobile; mark one / mark all as read.
- Dedicated page: `pages/notifications.html` (All / Unread / Read filters + settings).
- Sound: short 3-tone chime, played only for genuinely new notifications, after first user gesture, and can be toggled Off.
- Permission is requested via a dismissible in-app banner **after** login (never on the login page) and never re-asked once denied.
- To move to a real backend, replace `notificationService` with FCM / Web Push / WebSocket calls — the UI stays the same.

## PWA
`manifest.json` + `service-worker.js` cache the static shell only (HTML/CSS/JS/icons/logo/audio)
with versioned caches and old-cache cleanup. Credentials, payments and other sensitive/API
responses are **never** cached. `offline.html` is the offline fallback.

## Mock data
Seeded on first load in localStorage (key `rbc_portal_db_v1`); the current user is stored under
`rbc_portal_current_user_v1`. Sample data is intentionally limited to ≤5 records per entity so the
portal is ready for real data (empty states are expected).

## Responsive
Mobile-first: sidebar collapses on mobile, bottom nav on small screens, tables convert to cards where appropriate.

> Note: GitHub Pages serves this repo under a subpath, so all internal links are relative.
