"use client";

import type { ActionResponse } from "@/modules/actions/utils/createAction";
import { useAction } from "@/modules/actions/utils/useAction";
import type { Button2Variant } from "@/modules/common/components/Button2";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import type { ReactNode } from "react";

interface Props {
  readonly action: (formData: FormData) => Promise<ActionResponse>;
  /** A list gives one field for each value */
  readonly fields: Readonly<Record<string, string | readonly string[]>>;
  readonly variant?: Button2Variant;
  readonly icon: ReactNode;
  readonly children: ReactNode;
}

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
