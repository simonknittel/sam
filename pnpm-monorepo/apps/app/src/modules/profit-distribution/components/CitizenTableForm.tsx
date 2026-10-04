"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import clsx from "clsx";
import { debounce } from "lodash";
import { useEffect, useMemo, type FormEvent, type ReactNode } from "react";
import { updateParticipantAttribute } from "../actions/updateParticipantAttribute";

interface Props {
  readonly children: ReactNode;
  readonly className?: string;
  readonly cycleId: string;
}

export const CitizenTableForm = ({ children, className, cycleId }: Props) => {
  const submit = useMemo(
    () =>
      debounce((form: HTMLFormElement) => {
        const formData = new FormData(form);
        formData.append("cycleId", cycleId);

        void runAction(updateParticipantAttribute, formData);
      }, 1000),
    [cycleId],
  );

  /**
   * A change that waits for the debounce is saved when the form unmounts (for
   * example on a navigation), and not lost.
   */
  useEffect(() => {
    return () => {
      submit.flush();
    };
  }, [submit]);

  const handleChange = (event: FormEvent<HTMLFormElement>) => {
    submit(event.currentTarget);
  };

  return (
    <form onChange={handleChange} className={clsx(className)}>
      {children}
    </form>
  );
};
