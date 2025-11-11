"use client";

import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ChangeEventHandler } from "react";

interface Props {
  readonly confirmationStates: string[];
}

export const ConfirmationStateFilter = ({ confirmationStates }: Props) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const defaultValues =
    searchParams
      .get("filters")
      ?.split(",")
      .filter((filter) => filter.startsWith("confirmation-")) || [];

  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const newSearchParams = new URLSearchParams(window.location.search);

    let filters = newSearchParams.get("filters")?.split(",") || [];

    if (event.target.checked) {
      filters.push(event.target.value);
    } else {
      filters = filters.filter((filter) => filter !== event.target.value);
    }

    newSearchParams.set("filters", filters.join(","));

    router.push(`${pathname}?${newSearchParams.toString()}`);
  };

  return (
    <div className="flex flex-col items-start gap-2 px-4 py-2 rounded-secondary bg-neutral-800">
      {confirmationStates.includes("unconfirmed") && (
        <div className="flex justify-between items-center w-full gap-4">
          <label
            className="whitespace-nowrap cursor-pointer"
            htmlFor="confirmation-unconfirmed"
          >
            Unbestätigt
          </label>
          <YesNoCheckbox
            id="confirmation-unconfirmed"
            value="confirmation-unconfirmed"
            onChange={handleChange}
            defaultChecked={defaultValues.includes(`confirmation-unconfirmed`)}
            hideLabel
          />
        </div>
      )}

      {confirmationStates.includes("confirmed") && (
        <div className="flex justify-between items-center w-full gap-4">
          <label
            className="whitespace-nowrap cursor-pointer"
            htmlFor="confirmation-confirmed"
          >
            Bestätigt
          </label>
          <YesNoCheckbox
            id="confirmation-confirmed"
            value="confirmation-confirmed"
            onChange={handleChange}
            defaultChecked={defaultValues.includes(`confirmation-confirmed`)}
            hideLabel
          />
        </div>
      )}

      {confirmationStates.includes("false-report") && (
        <div className="flex justify-between items-center w-full gap-4">
          <label
            className="whitespace-nowrap cursor-pointer"
            htmlFor="confirmation-false-report"
          >
            Falschmeldung
          </label>
          <YesNoCheckbox
            id="confirmation-false-report"
            value="confirmation-false-report"
            onChange={handleChange}
            defaultChecked={defaultValues.includes(`confirmation-false-report`)}
            hideLabel
          />
        </div>
      )}
    </div>
  );
};
