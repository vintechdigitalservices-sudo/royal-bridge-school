export function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function setButtonLoading(button, loading, label) {
  if (!button) return;
  if (loading) {
    if (!button.dataset.originalHtml) button.dataset.originalHtml = button.innerHTML;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.innerHTML = `<i class="fas fa-circle-notch fa-spin" aria-hidden="true"></i> ${escapeHtml(label || "Please wait…")}`;
  } else {
    button.disabled = false;
    button.removeAttribute("aria-busy");
    if (button.dataset.originalHtml) {
      button.innerHTML = button.dataset.originalHtml;
      delete button.dataset.originalHtml;
    }
  }
}

export function loadingRow(colspan, message = "Loading…") {
  return `<tr><td colspan="${Number(colspan) || 1}" class="text-center text-muted"><i class="fas fa-circle-notch fa-spin" aria-hidden="true"></i> ${escapeHtml(message)}</td></tr>`;
}

export function emptyRow(colspan, message) {
  return `<tr><td colspan="${Number(colspan) || 1}" class="text-center text-muted">${escapeHtml(message)}</td></tr>`;
}

export function loadingCards(message = "Loading…") {
  return `<div class="text-center text-muted p-lg"><i class="fas fa-circle-notch fa-spin" aria-hidden="true"></i> ${escapeHtml(message)}</div>`;
}

export function initAppProgress() {
  if (document.getElementById("appProgress") || document.getElementById("loginForm")) return;
  const bar = document.createElement("div");
  bar.id = "appProgress";
  bar.className = "app-progress";
  bar.setAttribute("role", "progressbar");
  bar.setAttribute("aria-label", "Loading portal data");
  document.body.appendChild(bar);
  const done = () => bar.classList.add("done");
  document.addEventListener("data:ready", done, { once: true });
  window.setTimeout(done, 9000);
}
