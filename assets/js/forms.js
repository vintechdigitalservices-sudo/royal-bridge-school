/**
 * Adds an eye toggle to every password field so users can reveal what they type.
 * Safe to call multiple times; already-enhanced inputs are skipped.
 *
 * Mobile notes:
 * - The toggle acts on pointerdown (with preventDefault) so the input never
 *   blurs and the on-screen keyboard stays open while tapping the eye.
 * - The icon is swapped via class instead of innerHTML so it never flickers.
 */
export function initPasswordToggles(root = document) {
  root.querySelectorAll('input[type="password"]:not([data-pw-toggle])').forEach((input) => {
    input.setAttribute("data-pw-toggle", "1");
    input.setAttribute("autocapitalize", "none");
    input.setAttribute("autocorrect", "off");
    input.setAttribute("spellcheck", "false");

    const wrap = document.createElement("div");
    wrap.className = "password-wrap";
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "password-toggle";
    toggle.setAttribute("aria-label", "Show password");
    toggle.setAttribute("tabindex", "-1");
    const icon = document.createElement("i");
    icon.className = "fas fa-eye";
    toggle.appendChild(icon);

    let lastToggle = 0;
    function flip() {
      const now = Date.now();
      if (now - lastToggle < 400) return; // pointerdown is followed by click; only act once
      lastToggle = now;
      const revealing = input.type === "password";
      input.type = revealing ? "text" : "password";
      icon.className = revealing ? "fas fa-eye-slash" : "fas fa-eye";
      toggle.setAttribute("aria-label", revealing ? "Hide password" : "Show password");
      input.focus();
      const end = input.value.length;
      try { input.setSelectionRange(end, end); } catch (err) { /* type may not support it */ }
    }

    // preventDefault keeps focus (and the keyboard) on the input.
    toggle.addEventListener("pointerdown", (e) => { e.preventDefault(); flip(); });
    toggle.addEventListener("mousedown", (e) => { e.preventDefault(); flip(); });
    toggle.addEventListener("click", (e) => { e.preventDefault(); flip(); });

    wrap.appendChild(toggle);
  });
}
