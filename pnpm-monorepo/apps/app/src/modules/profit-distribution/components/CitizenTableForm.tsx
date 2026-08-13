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

  useEffect(() => {
    return () => {
      submit.cancel();
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
