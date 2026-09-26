"use client";

import type { ActionResponse } from "./createAction";
import { runAction } from "./runAction";

/**
 * Runs a server action and reloads the full page when it succeeds. Use it
 * for actions which change how the server authorizes the request.
 * `router.refresh()` is not sufficient for them: a page rendered through
 * the `forbidden()` boundary is not rendered again by a refresh and would
 * keep its old redaction state.
 */
export const runActionAndReload = async (
  action: (formData: FormData) => Promise<ActionResponse>,
  formData: FormData,
) => {
  if (await runAction(action, formData, { successToast: false }))
    window.location.reload();
};
