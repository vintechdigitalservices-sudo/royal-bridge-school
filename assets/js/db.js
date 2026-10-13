import { storage } from "./storage.js";
import { createSeed } from "./seed.js";

function ensureDb() {
  const existing = storage.load();
  if (existing) return existing;
  const seed = createSeed();
  storage.save(seed);
  return seed;
}

export const db = {
  get() {
    return ensureDb();
  },
  save(next) {
    storage.save(next);
    return next;
  },
  reset() {
    storage.clear();
    return ensureDb();
  }
};