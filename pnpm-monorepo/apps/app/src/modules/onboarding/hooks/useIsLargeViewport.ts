"use client";

import { useSyncExternalStore } from "react";

/** Tailwind's `lg` breakpoint */
const LARGE_VIEWPORT_QUERY = "(min-width: 1024px)";

const subscribe = (onStoreChange: () => void) => {
  const mediaQueryList = window.matchMedia(LARGE_VIEWPORT_QUERY);
  mediaQueryList.addEventListener("change", onStoreChange);
  return () => mediaQueryList.removeEventListener("change", onStoreChange);
};

const getSnapshot = () => window.matchMedia(LARGE_VIEWPORT_QUERY).matches;

const getServerSnapshot = () => false;

export const useIsLargeViewport = () =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
