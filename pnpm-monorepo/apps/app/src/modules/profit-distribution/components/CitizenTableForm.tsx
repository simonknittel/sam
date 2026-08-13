"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import clsx from "clsx";
import { debounce } from "lodash";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { updateParticipantAttribute } from "../actions/updateParticipantAttribute";

interface Props {
  readonly children: ReactNode;
  readonly className?: string;
  readonly cycleId: string;
}

export const CitizenTableForm = ({ children, className, cycleId }: Props) => {
  const formRef = useRef<HTMLFormElement>(null);

  const handleChange = useMemo(
    () =>
      debounce(() => {
        if (!formRef.current) return;

        const formData = new FormData(formRef.current);
        formData.append("cycleId", cycleId);

        void runAction(updateParticipantAttribute, formData);
      }, 1000),
    [cycleId],
  );

  useEffect(() => {
    return () => {
      handleChange.cancel();
    };
  }, [handleChange]);

  return (
    <form ref={formRef} onChange={handleChange} className={clsx(className)}>
      {children}
    </form>
  );
};
