/**
 * Adds an eye toggle to every password field so users can reveal what they type.
 * Safe to call multiple times; already-enhanced inputs are skipped.
 */
export function initPasswordToggles(root = document) {
  root.querySelectorAll('input[type="password"]:not([data-pw-toggle])').forEach((input) => {
    input.setAttribute("data-pw-toggle", "1");

    const wrap = document.createElement("div");
    wrap.className = "password-wrap";
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "password-toggle";
    toggle.setAttribute("aria-label", "Show password");
    toggle.setAttribute("tabindex", "-1");
    toggle.innerHTML = '<i class="fas fa-eye"></i>';

    toggle.addEventListener("click", () => {
      const revealing = input.type === "password";
      input.type = revealing ? "text" : "password";
      toggle.innerHTML = `<i class="fas ${revealing ? "fa-eye-slash" : "fa-eye"}"></i>`;
      toggle.setAttribute("aria-label", revealing ? "Hide password" : "Show password");
      input.focus();
    });

    wrap.appendChild(toggle);
  });
}
