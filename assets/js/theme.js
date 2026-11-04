const THEME_KEY = "rbi_theme";
const META_COLORS = { light: "#F4F6FB", dark: "#070B18" };

export function getTheme() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

export function applyTheme(theme) {
  const value = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", value);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", META_COLORS[value]);
  document.querySelectorAll("[data-theme-toggle]").forEach((el) => {
    if (el.type === "checkbox") el.checked = value === "dark";
    el.setAttribute("aria-checked", String(value === "dark"));
  });
  document.querySelectorAll("[data-theme-label]").forEach((el) => {
    el.textContent = value === "dark" ? "Dark" : "Light";
  });
  return value;
}

export function setTheme(theme) {
  const value = applyTheme(theme);
  try { localStorage.setItem(THEME_KEY, value); } catch (err) { /* ignore */ }
  document.dispatchEvent(new CustomEvent("theme:changed", { detail: { theme: value } }));
  return value;
}

export function toggleTheme() {
  return setTheme(getTheme() === "dark" ? "light" : "dark");
}

export function initTheme() {
  applyTheme(getTheme());
  document.querySelectorAll("[data-theme-toggle]").forEach((el) => {
    el.addEventListener("change", () => setTheme(el.checked ? "dark" : "light"));
  });
  window.addEventListener("storage", (event) => {
    if (event.key === THEME_KEY) applyTheme(event.newValue === "dark" ? "dark" : "light");
  });
}
