"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import clsx from "clsx";
import { useRef } from "react";
import { updateOAuthGrantAdminMode } from "../actions/updateOAuthGrantAdminMode";

interface Props {
  readonly className?: string;
  readonly grantId: string;
  readonly displayName: string;
  readonly isEnabled: boolean;
}

export const OAuthGrantAdminModeSwitch = ({
  className,
  grantId,
  displayName,
  isEnabled,
}: Props) => {
  const formRef = useRef<HTMLFormElement>(null);
  const { formAction, isPending } = useAction(updateOAuthGrantAdminMode);

  return (
    /**
     * `relative`: the input of the checkbox has an absolute position. Without
     * a positioned ancestor in the scroll container of the table, the input
     * makes the page wider on small screens.
     */
    <div className={clsx("relative flex items-center", className)}>
      {/**
       * The checkbox is not in the form: React resets a form after its
       * action, and the checkbox must show the state of the server
       */}
      <form ref={formRef} action={formAction}>
        <input type="hidden" name="grantId" value={grantId} />
        <input type="hidden" name="enabled" value={String(!isEnabled)} />
      </form>

      <YesNoCheckbox
        hideLabel
        aria-label={`Admin-Modus für ${displayName}`}
        checked={isEnabled}
        disabled={isPending}
        onChange={() => formRef.current?.requestSubmit()}
      />
    </div>
  );
};
