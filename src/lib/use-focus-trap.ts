"use client";

import * as React from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Trap Tab within `ref` and close on Escape while `active`.
 *
 * Without this, Tab walks straight out of an open overlay and into the page
 * behind it, which is invisible to a sighted mouse user but strands keyboard
 * and screen-reader users outside the menu they just opened.
 */
export function useFocusTrap(
  ref: React.RefObject<HTMLElement | null>,
  active: boolean,
  onClose: () => void
) {
  // Callers pass inline closures, so `onClose` has a new identity on every
  // render. As an effect dependency it tore the trap down on each keystroke —
  // focus went back to the opener, then to the overlay's first button, and
  // the expanded editor could not be typed in. Read it through a ref instead.
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => {
    onCloseRef.current = onClose;
  });

  React.useEffect(() => {
    if (!active) return;
    const node = ref.current;
    if (!node) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = () =>
      Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );

    // Move focus in so the first Tab lands inside, not after, the overlay.
    // An element marked `data-autofocus` wins — React's `autoFocus` fires
    // before this effect and would be overridden by the first button.
    (
      node.querySelector<HTMLElement>("[data-autofocus]") ?? focusables()[0]
    )?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const items = focusables();
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;

      if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      // Return focus to whatever opened the overlay.
      previouslyFocused?.focus?.();
    };
  }, [active, ref]);
}
