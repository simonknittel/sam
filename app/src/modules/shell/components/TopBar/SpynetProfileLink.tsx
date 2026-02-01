"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { Link } from "@/modules/common/components/Link";
import { usePopover } from "@/modules/common/components/Popover";
import clsx from "clsx";
import { FaUserSecret } from "react-icons/fa";

interface Props {
  readonly className?: string;
  readonly entityId: string;
}

export const SpynetProfileLink = ({ className, entityId }: Props) => {
  const { closePopover } = usePopover();

  return (
    <Button2
      as={Link}
      href={`/app/spynet/citizen/${entityId}`}
      className={clsx(className)}
      onClick={closePopover}
      variant={Button2Variant.Primary}
    >
      <FaUserSecret />
      Spynet Profil
    </Button2>
  );
};
