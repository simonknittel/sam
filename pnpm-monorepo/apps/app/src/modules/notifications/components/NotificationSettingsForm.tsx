"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import clsx from "clsx";
import { debounce } from "lodash";
import { useEffect, type FormEvent, type ReactNode } from "react";
import { updateMyNotificationSettings } from "../actions/updateMyNotificationSettings";

interface Props {
  readonly children: ReactNode;
  readonly className?: string;
}

export const NotificationSettingsForm = ({ children, className }: Props) => {
  const submit = debounce((form: HTMLFormElement) => {
    const formData = new FormData(form);

    void runAction(updateMyNotificationSettings, formData);
  }, 1000);

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
