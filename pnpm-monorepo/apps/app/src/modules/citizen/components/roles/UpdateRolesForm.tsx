"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import clsx from "clsx";
import { debounce } from "lodash";
import { useEffect, type FormEvent, type ReactNode } from "react";
import { updateRoleAssignments } from "../../actions/updateRoleAssignment";

interface Props {
  readonly children: ReactNode;
  readonly className?: string;
  /** Runs after each successful save */
  readonly onSaved?: () => void;
}

export const UpdateRolesForm = ({ children, className, onSaved }: Props) => {
  const submit = debounce(async (form: HTMLFormElement) => {
    const formData = new FormData(form);

    if (await runAction(updateRoleAssignments, formData)) onSaved?.();
  }, 1000);

  /**
   * The dialog removes the form when it closes. Thus a change that waits for
   * the debounce is saved then, and not lost.
   */
  useEffect(() => {
    return () => {
      void submit.flush();
    };
  }, [submit]);

  const handleChange = (event: FormEvent<HTMLFormElement>) => {
    void submit(event.currentTarget);
  };

  return (
    <form onChange={handleChange} className={clsx(className)}>
      {children}
    </form>
  );
};
