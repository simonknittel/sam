"use client";

import type { ActionResponse } from "@/modules/actions/utils/createAction";
import { useAction } from "@/modules/actions/utils/useAction";
import type { Button2Variant } from "@/modules/common/components/Button2";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import type { ReactNode } from "react";

interface Props {
  readonly action: (formData: FormData) => Promise<ActionResponse>;
  /**
   * The validated parameters of the authorization request and, for the
   * approval, the settings of the consent. A list gives one field for each
   * value.
   */
  readonly fields: Readonly<Record<string, string | readonly string[]>>;
  readonly variant?: Button2Variant;
  readonly icon: ReactNode;
  readonly children: ReactNode;
}

/**
 * One decision of the consent page. On success, the action sends the browser
 * to the client. An error shows as a toast.
 */
export const ConsentDecisionForm = ({
  action,
  fields,
  variant,
  icon,
  children,
}: Props) => {
  const { formAction } = useAction(action);

  return (
    <form action={formAction}>
      {Object.entries(fields).flatMap(([name, value]) =>
        (typeof value === "string" ? [value] : value).map((item) => (
          <input
            key={`${name}=${item}`}
            type="hidden"
            name={name}
            value={item}
          />
        )),
      )}

      <SubmitButton variant={variant} icon={icon}>
        {children}
      </SubmitButton>
    </form>
  );
};
