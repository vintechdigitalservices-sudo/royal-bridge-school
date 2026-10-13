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