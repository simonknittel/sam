"use client";

import type { ActionResponse } from "@/modules/actions/utils/createAction";
import Note from "@/modules/common/components/Note";

interface Props {
  readonly className?: string;
  /** The `state` returned by useAction() */
  readonly state: ActionResponse | null;
}

/**
 * Inline error display of a form driven by useAction({ errorToast: false })
 * — the error shows where the form gives it context instead of as a toast.
 */
export const ActionErrorNote = ({ className, state }: Props) =>
  state && "error" in state && state.error ? (
    <Note type="error" message={state.error} className={className} />
  ) : null;
