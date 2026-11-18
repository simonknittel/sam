"use client";

import { useSyncExternalStore } from "react";

/** The value never changes, thus nothing has to subscribe to it */
const subscribeToNothing = () => () => undefined;

/**
 * False on the server and during the hydration, true after it. A render in
 * the browser after a client-side navigation gives true at once.
 */
export const useIsHydrated = () =>
  useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
