"use client";

import type { ActionResponse } from "@/modules/actions/utils/createAction";
import { runAction } from "@/modules/actions/utils/runAction";
import clsx from "clsx";
import { debounce } from "lodash";
import { useEffect, type FormEvent, type ReactNode } from "react";

interface Props {
  readonly children: ReactNode;
  readonly className?: string;
  readonly action: (formData: FormData) => Promise<ActionResponse>;
}

export const NotificationSettingsForm = ({
  children,
  className,
  action,
}: Props) => {
  const submit = debounce((form: HTMLFormElement) => {
    const formData = new FormData(form);

    void runAction(action, formData);
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
