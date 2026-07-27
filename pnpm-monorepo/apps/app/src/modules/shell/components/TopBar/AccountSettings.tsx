"use client";

import { Button2 } from "@/modules/common/components/Button2";
import { Link } from "@/modules/common/components/Link";
import { usePopover } from "@/modules/common/components/Popover";
import clsx from "clsx";
import { FaCog } from "react-icons/fa";

interface Props {
  readonly className?: string;
}

export const AccountSettings = ({ className }: Props) => {
  const { closePopover } = usePopover();

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
