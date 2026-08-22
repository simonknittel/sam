import toast from "react-hot-toast";

/**
 * Long enough to be read rather than skimmed past: a warning always sits
 * next to a success toast and reports the part of the work that did not go
 * through.
 */
const WARNING_TOAST_DURATION_MS = 8_000;

export const toastWarning = (message: string) =>
  toast(message, { icon: "⚠️", duration: WARNING_TOAST_DURATION_MS });
