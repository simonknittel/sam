"use client";

import type { ReactNode } from "react";
import { FaEllipsisH, FaTimes } from "react-icons/fa";
import Button from "./Button";
import { PopoverBaseUI } from "./PopoverBaseUI";

interface Props {
  children?: ReactNode;
}

export const Actions = ({ children }: Readonly<Props>) => {
  return (
    <PopoverBaseUI
      title="Aktionen"
      /**
       * Base UI sets `data-popup-open` on the trigger while the menu is open.
       * The icon follows this attribute, thus the menu needs no own state.
       */
      trigger={
        <>
          <FaEllipsisH className="group-data-popup-open:hidden" />
          <FaTimes className="hidden group-data-popup-open:block" />
        </>
      }
      triggerClassName="group"
      triggerRender={<Button variant="secondary" iconOnly={true} />}
      triggerTitle="Aktionen"
      openOnHover={false}
      side="left"
      childrenClassName="flex flex-col items-start gap-2"
    >
      {children}
    </PopoverBaseUI>
  );
};
