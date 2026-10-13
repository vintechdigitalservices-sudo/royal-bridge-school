import { getCurrentUser, redirectByRole } from "./auth.js";
document.addEventListener("DOMContentLoaded", () => {
  const u = getCurrentUser();
  if (u && u.role) redirectByRole(u.role);
  else window.location.href = "./index.html";
});
