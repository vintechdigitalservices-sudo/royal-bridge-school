const STORAGE_KEY = "rbc_portal_db_v1";
const USER_KEY = "rbc_portal_current_user_v1";

export const storage = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.warn("Failed to load storage", err);
      return null;
    }
  },
  save(db) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      return true;
    } catch (err) {
      console.warn("Failed to save storage", err);
      return false;
    }
  },
  clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (err) {
      return false;
    }
  },
  getCurrentUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  },
  setCurrentUser(user) {
    try {
      if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
      else localStorage.removeItem(USER_KEY);
      return true;
    } catch (err) {
      return false;
    }
  }
};