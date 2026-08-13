"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { PopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import type { ReactNode } from "react";
import { FaChevronDown } from "react-icons/fa";

interface Props {
  readonly name: string;
  readonly children?: ReactNode;
}

export const Filter = ({ name, children }: Props) => {
  return (
    <PopoverBaseUI
      trigger={
        <>
          <FaChevronDown /> {name}
        </>
      }
      triggerRender={<Button2 variant={Button2Variant.Secondary} />}
      openOnHover={false}
      side="bottom"
    >
      {children}
    </PopoverBaseUI>
  );
};
