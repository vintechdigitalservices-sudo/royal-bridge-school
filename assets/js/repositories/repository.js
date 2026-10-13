import { getDbClient } from "../firebase/client.js";

function toPlain(value) {
  if (value == null) return value;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(toPlain);
  if (typeof value === "object") {
    const out = {};
    for (const k of Object.keys(value)) out[k] = toPlain(value[k]);
    return out;
  }
  return value;
}

function docToObject(doc) {
  return { id: doc.id, ...toPlain(doc.data()) };
}

/**
 * Creates a standard Firestore repository. UI must not query Firestore directly;
 * it goes through services which use these repositories.
 */
export function makeRepository(collectionName) {
  return {
    collectionName,

    async getAll({ orderBy, direction = "asc", limit } = {}) {
      const { db, collection, getDocs, query, orderBy: ob, limit: lim } = await getDbClient();
      const parts = [];
      if (orderBy) parts.push(ob(orderBy, direction));
      if (limit) parts.push(lim(limit));
      const q = parts.length ? query(collection(db, collectionName), ...parts) : collection(db, collectionName);
      const snap = await getDocs(q);
      return snap.docs.map(docToObject);
    },

    async query({ where = [], orderBy, direction = "asc", limit } = {}) {
      const { db, collection, getDocs, query, where: wh, orderBy: ob, limit: lim } = await getDbClient();
      const parts = where.map(([field, op, value]) => wh(field, op, value));
      if (orderBy) parts.push(ob(orderBy, direction));
      if (limit) parts.push(lim(limit));
      const snap = await getDocs(query(collection(db, collectionName), ...parts));
      return snap.docs.map(docToObject);
    },

    async getById(id) {
      const { db, collection, doc, getDoc } = await getDbClient();
      const snap = await getDoc(doc(db, collectionName, id));
      return snap.exists() ? docToObject(snap) : null;
    },

    async create(id, data, { actorId } = {}) {
      const { db, collection, doc, setDoc, serverTimestamp } = await getDbClient();
      const payload = { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
      if (actorId) payload.createdBy = actorId;
      await setDoc(doc(db, collectionName, id), payload);
      return { id, ...payload };
    },

    async add(data, { actorId } = {}) {
      const { db, collection, addDoc, serverTimestamp } = await getDbClient();
      const payload = { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
      if (actorId) payload.createdBy = actorId;
      const ref = await addDoc(collection(db, collectionName), payload);
      return { id: ref.id, ...payload };
    },

    async update(id, patch, { actorId } = {}) {
      const { db, collection, doc, updateDoc, serverTimestamp } = await getDbClient();
      const payload = { ...patch, updatedAt: serverTimestamp() };
      if (actorId) payload.updatedBy = actorId;
      await updateDoc(doc(db, collectionName, id), payload);
      return { id, ...payload };
    },

    async remove(id) {
      const { db, collection, doc, deleteDoc } = await getDbClient();
      await deleteDoc(doc(db, collectionName, id));
      return { id, deleted: true };
    },

    async subscribe(callback, { where = [], orderBy, direction = "asc", limit } = {}) {
      const { db, collection, query, where: wh, orderBy: ob, limit: lim, onSnapshot } = await getDbClient();
      const parts = where.map(([field, op, value]) => wh(field, op, value));
      if (orderBy) parts.push(ob(orderBy, direction));
      if (limit) parts.push(lim(limit));
      const q = parts.length ? query(collection(db, collectionName), ...parts) : collection(db, collectionName);
      return onSnapshot(q, (snap) => callback(snap.docs.map(docToObject)));
    }
  };
}
