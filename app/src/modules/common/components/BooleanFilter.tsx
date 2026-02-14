"use client";

import clsx from "clsx";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useId, type ComponentProps, type ReactNode } from "react";
import YesNoCheckbox from "./form/YesNoCheckbox";

interface Props {
  readonly className?: string;
  readonly identifier: string;
  readonly children: ReactNode;
}

export const BooleanFilter = ({ className, identifier, children }: Props) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const id = useId();

  const handleChange: ComponentProps<typeof YesNoCheckbox>["onChange"] = (
    event,
  ) => {
    const newSearchParams = new URLSearchParams(searchParams.toString());

    if (event.target.checked) {
      newSearchParams.set(identifier, "true");
    } else {
      newSearchParams.delete(identifier);
    }

    router.push(`${pathname}?${newSearchParams.toString()}`);
  };

  return (
    <div className={clsx(className, "flex items-center gap-2 overflow-hidden")}>
      <YesNoCheckbox
        id={id}
        checked={searchParams.get(identifier) === "true"}
        onChange={handleChange}
        className="flex-none"
        hideLabel
      />

      <label
        className="flex gap-2 items-center cursor-pointer overflow-hidden"
        htmlFor={id}
      >
        <span className="truncate">{children}</span>
      </label>
    </div>
  );
};
