import { repos } from "../repositories/index.js";

/**
 * Firestore is the source of truth. On startup the whole dataset is hydrated
 * into an in-memory mirror so the existing synchronous page code keeps working.
 * Writes go to Firestore (optimistically updating the mirror, reverting on error).
 */
const state = {
  schoolSettings: [],
  sessions: [],
  terms: [],
  classes: [],
  subjects: [],
  staff: [],
  students: [],
  users: [],
  teacherAssignments: [],
  feeStructures: [],
  payments: [],
  attendance: [],
  results: [],
  reportSheets: [],
  announcements: [],
  notifications: [],
  auditLogs: []
};

let readyPromise = null;
let hydrated = false;
const listeners = new Set();

function clone(v) {
  return v == null ? v : JSON.parse(JSON.stringify(v));
}

async function loadAll() {
  const keys = Object.keys(state);
  await Promise.all(
    keys.map(async (key) => {
      try {
        state[key] = await repos[key].getAll();
      } catch (err) {
        console.warn(`[store] failed to load "${key}"`, err);
        state[key] = [];
      }
    })
  );
}

export function hydrate() {
  if (!readyPromise) {
    readyPromise = loadAll()
      .catch((err) => {
        console.error("[store] hydration failed", err);
        document.dispatchEvent(new CustomEvent("data:error", { detail: { error: err } }));
      })
      .then(() => {
        hydrated = true;
        document.dispatchEvent(new CustomEvent("data:ready"));
        listeners.forEach((fn) => {
          try { fn(); } catch (err) { console.warn(err); }
        });
      });
  }
  return readyPromise;
}

export function whenDataReady() {
  return hydrate();
}

export function isReady() {
  return hydrated;
}

export function list(name) {
  return clone(state[name] || []);
}

export function find(name, predicate) {
  const found = (state[name] || []).find(predicate);
  return found ? clone(found) : null;
}

export function filter(name, predicate) {
  return clone((state[name] || []).filter(predicate));
}

export function count(name) {
  return (state[name] || []).length;
}

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function pushOptimistic(name, record, { front = false } = {}) {
  const arr = state[name] || (state[name] = []);
  if (front) arr.unshift(record);
  else arr.push(record);
}

function replaceOptimistic(name, idField, docId, patch) {
  const arr = state[name] || [];
  const idx = arr.findIndex((r) => r[idField] === docId);
  if (idx === -1) return null;
  arr[idx] = { ...arr[idx], ...patch };
  return arr[idx];
}

function removeOptimistic(name, idField, docId) {
  state[name] = (state[name] || []).filter((r) => r[idField] !== docId);
}

function reportWriteError(name, err) {
  console.error(`[store] write to "${name}" failed`, err);
  document.dispatchEvent(new CustomEvent("data:error", { detail: { collection: name, error: err } }));
}

export async function createRecord(name, idField, record, { front = false, actorId } = {}) {
  const docId = record[idField];
  pushOptimistic(name, record, { front });
  try {
    await repos[name].create(docId, record, { actorId });
    return clone(record);
  } catch (err) {
    removeOptimistic(name, idField, docId);
    reportWriteError(name, err);
    throw err;
  }
}

export async function updateRecord(name, idField, docId, patch, { actorId } = {}) {
  const before = (state[name] || []).find((r) => r[idField] === docId);
  replaceOptimistic(name, idField, docId, patch);
  try {
    await repos[name].update(docId, patch, { actorId });
    return clone((state[name] || []).find((r) => r[idField] === docId));
  } catch (err) {
    if (before) replaceOptimistic(name, idField, docId, before);
    reportWriteError(name, err);
    throw err;
  }
}

export async function removeRecord(name, idField, docId) {
  const before = (state[name] || []).find((r) => r[idField] === docId);
  removeOptimistic(name, idField, docId);
  try {
    await repos[name].remove(docId);
    return { id: docId, deleted: true };
  } catch (err) {
    if (before) pushOptimistic(name, before);
    reportWriteError(name, err);
    throw err;
  }
}
