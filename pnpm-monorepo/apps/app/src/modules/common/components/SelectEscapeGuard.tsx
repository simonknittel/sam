"use client";

import { useEffect } from "react";

/**
 * A customizable select (`appearance: base-select`, see `globals.css`) shows
 * its open list in the page, not in the operating system. Thus the Escape
 * key, which closes the list, also gets to the listeners of the page, and a
 * dialog or a popover of Base UI closes together with the list. This stops
 * the event before these listeners, but not the default action of the
 * browser, which closes the list. The next Escape closes the dialog, as with
 * a native select.
 */
export const SelectEscapeGuard = () => {
  useEffect(() => {
    if (!CSS.supports("appearance", "base-select")) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (!(event.target instanceof Element)) return;
      if (!event.target.closest("select")?.matches(":open")) return;

      event.stopPropagation();
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, []);

  return null;
};
