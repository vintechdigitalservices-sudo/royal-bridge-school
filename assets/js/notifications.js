export function toast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) {
    const c = document.createElement("div");
    c.id = "toast-container";
    c.style.cssText = "position:fixed;top:16px;right:16px;z-index:3000;display:flex;flex-direction:column;gap:8px;";
    document.body.appendChild(c);
  }
  const el = document.createElement("div");
  el.className = `alert alert-${type}`;
  el.style.cssText = "min-width:240px;box-shadow:var(--shadow-lg);";
  el.textContent = message;
  document.getElementById("toast-container").appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity 0.3s ease";
    setTimeout(() => el.remove(), 300);
  }, 2500);
}