import { queryAll, on } from "./utils.js";

export function initModals() {
  queryAll("[data-modal-open]").forEach((btn) => {
    on(btn, "click", () => {
      const id = btn.getAttribute("data-modal-open");
      const modal = document.getElementById(id);
      if (modal) modal.classList.add("active");
    });
  });

  queryAll("[data-modal-close]").forEach((btn) => {
    on(btn, "click", () => {
      const modal = btn.closest(".modal");
      if (modal) modal.classList.remove("active");
    });
  });

  queryAll(".modal-overlay").forEach((overlay) => {
    on(overlay, "click", () => {
      const modal = overlay.closest(".modal");
      if (modal) modal.classList.remove("active");
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      queryAll(".modal.active").forEach((m) => m.classList.remove("active"));
    }
  });
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Custom, promise-based modal (never uses the browser's native alert/confirm/prompt).
 * @param {object} opts
 * @param {string} [opts.title]
 * @param {string} [opts.message]   plain-text body
 * @param {string} [opts.html]      trusted HTML body (overrides message)
 * @param {string} [opts.icon]      Font Awesome class e.g. "fa-bell"
 * @param {string} [opts.variant]   icon accent: primary|success|danger|warning
 * @param {Array}  [opts.buttons]   [{ label, variant, value, autofocus }]
 * @param {boolean}[opts.dismissible=true] close on overlay/Esc/close button
 * @returns {Promise<any>} resolves with the clicked button's value
 */
export function showModal(opts = {}) {
  const {
    title = "",
    message = "",
    html = "",
    icon = "",
    variant = "primary",
    buttons = [{ label: "OK", variant: "primary", value: true }],
    dismissible = true
  } = opts;

  return new Promise((resolve) => {
    const modal = document.createElement("div");
    modal.className = "modal active custom-modal";

    const body = html
      ? `<div class="custom-modal-html">${html}</div>`
      : `<p class="custom-modal-text">${escapeHtml(message)}</p>`;

    modal.innerHTML = `
      <div class="modal-overlay" data-cm-overlay></div>
      <div class="modal-content" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h2 class="card-title">${title ? escapeHtml(title) : ""}</h2>
          ${dismissible ? '<button class="btn btn-ghost btn-icon" data-cm-close aria-label="Close"><i class="fas fa-times"></i></button>' : ""}
        </div>
        <div class="modal-body">
          ${icon ? `<div class="custom-modal-icon custom-modal-icon-${variant}"><i class="fas ${icon}"></i></div>` : ""}
          ${body}
        </div>
        <div class="modal-footer">
          ${buttons.map((b, i) => `<button class="btn btn-${b.variant || "primary"}" data-cm-btn="${i}"${b.autofocus ? " data-autofocus" : ""}>${escapeHtml(b.label)}</button>`).join("")}
        </div>
      </div>`;

    document.body.appendChild(modal);
    document.body.classList.add("modal-open");

    let done = false;
    const finish = (value) => {
      if (done) return;
      done = true;
      modal.classList.remove("active");
      setTimeout(() => {
        modal.remove();
        if (!document.querySelector(".modal.active")) document.body.classList.remove("modal-open");
      }, 150);
      document.removeEventListener("keydown", onKey);
      resolve(value);
    };
    const onKey = (e) => {
      if (e.key === "Escape" && dismissible) finish(null);
    };
    document.addEventListener("keydown", onKey);

    modal.querySelectorAll("[data-cm-btn]").forEach((btn) => {
      on(btn, "click", () => finish(buttons[Number(btn.getAttribute("data-cm-btn"))]?.value ?? true));
    });
    if (dismissible) {
      on(modal.querySelector("[data-cm-overlay]"), "click", () => finish(null));
      on(modal.querySelector("[data-cm-close]"), "click", () => finish(null));
    }

    const focusTarget = modal.querySelector("[data-autofocus]") || modal.querySelector("[data-cm-btn]");
    if (focusTarget) focusTarget.focus();
  });
}

export function showAlert(message, opts = {}) {
  return showModal({ title: opts.title || "Notice", message, icon: opts.icon, variant: opts.variant, buttons: [{ label: opts.okLabel || "OK", variant: "primary", value: true, autofocus: true }] });
}

export function showConfirm(message, opts = {}) {
  return showModal({
    title: opts.title || "Please confirm",
    message,
    icon: opts.icon || "fa-circle-question",
    variant: opts.variant || "warning",
    buttons: [
      { label: opts.cancelLabel || "Cancel", variant: "secondary", value: false },
      { label: opts.confirmLabel || "Confirm", variant: opts.confirmVariant || "primary", value: true, autofocus: true }
    ]
  });
}
