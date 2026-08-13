"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import clsx from "clsx";
import { debounce } from "lodash";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { updateMyNotificationSettings } from "../actions/updateMyNotificationSettings";

interface Props {
  readonly children: ReactNode;
  readonly className?: string;
}

export const NotificationSettingsForm = ({ children, className }: Props) => {
  const formRef = useRef<HTMLFormElement>(null);

  const handleChange = useMemo(
    () =>
      debounce(() => {
        if (!formRef.current) return;

        const formData = new FormData(formRef.current);

        void runAction(updateMyNotificationSettings, formData);
      }, 1000),
    [],
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
