/**
 * Single Firebase initialization point for the whole app.
 * Loads the modular SDK from the official CDN and re-exports only what the app needs,
 * so no other module talks to Firebase directly.
 */
import { firebaseConfig, SDK_VERSION } from "./config.js";

const CDN = `https://www.gstatic.com/firebasejs/${SDK_VERSION}`;

let _app = null;
let _auth = null;
let _db = null;
let _mods = null;

export async function getFirebase() {
  if (_mods) return _mods;
  const [appMod, authMod, dbMod] = await Promise.all([
    import(/* @vite-ignore */ `${CDN}/firebase-app.js`),
    import(/* @vite-ignore */ `${CDN}/firebase-auth.js`),
    import(/* @vite-ignore */ `${CDN}/firebase-firestore.js`)
  ]);
  _app = appMod.initializeApp(firebaseConfig);
  _auth = authMod.getAuth(_app);
  _db = dbMod.getFirestore(_app);
  _mods = { app: _app, auth: _auth, db: _db, authMod, dbMod, appMod };
  return _mods;
}

export async function getAuthClient() {
  const m = await getFirebase();
  return { auth: m.auth, ...m.authMod };
}

export async function getDbClient() {
  const m = await getFirebase();
  return { db: m.db, ...m.dbMod };
}
