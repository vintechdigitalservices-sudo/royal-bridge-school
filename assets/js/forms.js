/**
 * Adds an eye toggle to every password field so users can reveal what they type.
 * Safe to call multiple times; already-enhanced inputs are skipped.
 *
 * Mobile notes:
 * - pointerdown/mousedown are cancelled so the button never steals focus from
 *   the input. The on-screen keyboard stays attached to the field.
 * - The toggle runs on click (after the focus guard) so touch, mouse, keyboard
 *   and assistive-technology activation all go through one code path.
 * - Toggling type keeps the current selection, value and focus; the icon is
 *   swapped by class and the input is never replaced or moved.
 */
export function initPasswordToggles(root = document) {
  root.querySelectorAll('input[type="password"]:not([data-pw-toggle])').forEach((input) => {
    // Never move an input that the user is already typing in.
    if (document.activeElement === input) return;

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
    toggle.setAttribute("aria-pressed", "false");
    const icon = document.createElement("i");
    icon.className = "fas fa-eye";
    icon.setAttribute("aria-hidden", "true");
    toggle.appendChild(icon);

    function flip() {
      const focused = document.activeElement === input;
      const selectionStart = input.selectionStart;
      const selectionEnd = input.selectionEnd;
      const selectionDirection = input.selectionDirection;
      const revealing = input.type === "password";

      input.type = revealing ? "text" : "password";
      icon.className = revealing ? "fas fa-eye-slash" : "fas fa-eye";
      toggle.setAttribute("aria-label", revealing ? "Hide password" : "Show password");
      toggle.setAttribute("aria-pressed", String(revealing));

      if (!focused) return;
      if (document.activeElement !== input) input.focus({ preventScroll: true });
      try {
        input.setSelectionRange(
          selectionStart ?? input.value.length,
          selectionEnd ?? input.value.length,
          selectionDirection || undefined
        );
      } catch (err) {
        // Some input types do not expose a text selection.
      }
    }

    // Keep focus (and the keyboard) on the input instead of the button.
    toggle.addEventListener("pointerdown", (e) => e.preventDefault());
    toggle.addEventListener("mousedown", (e) => e.preventDefault());
    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      flip();
    });

    wrap.appendChild(toggle);
  });
}
