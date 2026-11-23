"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { getBrowserRuntimeErrorText } from "./browserRuntimeTexts";

/**
 * Runs a command of the browser runtime from a click, and shows a failed
 * command as a toast. Call `run()` directly in the click handler:
 * `selectFolder()` and `restoreFolderPermission()` need the user gesture,
 * and `run()` calls the command before its first `await`.
 */
export const useRuntimeCommand = () => {
  const [isPending, setIsPending] = useState(false);

  const run = async (command: () => Promise<unknown>) => {
    setIsPending(true);
    try {
      await command();
    } catch (error) {
      toast.error(getBrowserRuntimeErrorText(error));
    }
    setIsPending(false);
  };

  return { isPending, run };
};
