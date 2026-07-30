"use client";

import clsx from "clsx";
import { debounce } from "lodash";
import { useTranslations } from "next-intl";
import { unstable_rethrow } from "next/navigation";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import toast from "react-hot-toast";
import { updateParticipantAttribute } from "../actions/updateParticipantAttribute";

interface Props {
  readonly children: ReactNode;
  readonly className?: string;
  readonly cycleId: string;
}

export const CitizenTableForm = ({ children, className, cycleId }: Props) => {
  const t = useTranslations();
  const formRef = useRef<HTMLFormElement>(null);

  const handleChange = useMemo(
    () =>
      debounce(() => {
        if (!formRef.current) return;

        const formData = new FormData(formRef.current);
        formData.append("cycleId", cycleId);

        updateParticipantAttribute(formData)
          .then((response) => {
            if ("error" in response) {
              toast.error(response.error);
              console.error(response);
              return response;
            }

            toast.success(response.success);
          })
          .catch((error) => {
            unstable_rethrow(error);
            toast.error(t("Common.internalServerError"));
            console.error(error);
          });
      }, 1000),
    [t, cycleId],
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
