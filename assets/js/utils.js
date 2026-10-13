export const formatDate = (date) => {
  if (!date) return "-";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });
};

export const formatDateTime = (date) => {
  if (!date) return "-";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-NG", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return "₦" + num.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const slug = (str = "") => {
  return String(str).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
};

export const uid = () => {
  return "id_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 8);
};

export const generateReceiptNumber = () => {
  const ts = Date.now().toString().slice(-6);
  const r = Math.floor(100 + Math.random() * 900);
  return `RC-${ts}-${r}`;
};

export const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

export const isEmpty = (val) => {
  if (val == null) return true;
  if (Array.isArray(val)) return val.length === 0;
  if (typeof val === "object") return Object.keys(val).length === 0;
  if (typeof val === "string") return val.trim() === "";
  return false;
};

export const setTitle = (title) => {
  const { SCHOOL_CONFIG } = requireConfig();
  document.title = title ? `${title} — ${SCHOOL_CONFIG.name}` : SCHOOL_CONFIG.name;
};

function requireConfig() {
  return window.SCHOOL_CONFIG ? { SCHOOL_CONFIG: window.SCHOOL_CONFIG } : { SCHOOL_CONFIG: { name: "ROYALBRIDGE INT'L SCHOOL", motto: "Inspiring Excellence" } };
}

export const toggleClass = (el, cls) => el && el.classList.toggle(cls);
export const addClass = (el, cls) => el && el.classList.add(cls);
export const removeClass = (el, cls) => el && el.classList.remove(cls);

export const query = (sel, root = document) => root.querySelector(sel);
export const queryAll = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export const on = (el, event, handler) => el && el.addEventListener(event, handler);
export const delegate = (root, selector, event, handler) => {
  on(root, event, (e) => {
    const target = e.target.closest(selector);
    if (target && root.contains(target)) {
      handler.call(target, e);
    }
  });
};