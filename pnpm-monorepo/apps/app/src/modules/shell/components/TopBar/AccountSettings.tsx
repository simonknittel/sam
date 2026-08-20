"use client";

import { Button2 } from "@/modules/common/components/Button2";
import { Link } from "@/modules/common/components/Link";
import { usePopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import clsx from "clsx";
import { FaCog } from "react-icons/fa";

interface Props {
  readonly className?: string;
}

export const AccountSettings = ({ className }: Props) => {
  const { closePopover } = usePopoverBaseUI();

  return (
    <Button2
      as={Link}
      href="/app/account"
      className={clsx(className)}
      onClick={closePopover}
    >
      <FaCog />
      Einstellungen
    </Button2>
  );
};
