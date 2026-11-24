"use client";

import type { ActionResponse } from "@/modules/actions/utils/createAction";
import Note from "@/modules/common/components/Note";

interface Props {
  readonly className?: string;
  readonly state: ActionResponse | null;
}

/** For a form with `useAction({ errorToast: false })` */
export const ActionErrorNote = ({ className, state }: Props) =>
  state && "error" in state && state.error ? (
    <div role="alert" className={className}>
      <Note type="error" message={state.error} />
    </div>
  ) : null;
