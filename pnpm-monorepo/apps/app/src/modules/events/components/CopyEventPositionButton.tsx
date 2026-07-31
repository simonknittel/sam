"use client";

import Button from "@/modules/common/components/Button";
import { Tooltip } from "@/modules/common/components/Tooltip";
import clsx from "clsx";
import toast from "react-hot-toast";
import { FaRegCopy } from "react-icons/fa";
import { getSubtreeDepth, getSubtreeSize } from "../utils/positionTree";
import { useLineupClipboard } from "./LineupClipboardContext";
import type { PositionType } from "./Position";

const LABEL = "Posten kopieren";

interface Props {
  readonly className?: string;
  readonly position: PositionType;
}

export const CopyEventPositionButton = ({ className, position }: Props) => {
  const { copy } = useLineupClipboard();

  const handleClick = () => {
    copy({
      positionId: position.id,
      positionName: position.name,
      eventId: position.eventId,
      subtreeDepth: getSubtreeDepth(position),
    });

    const subtreeSize = getSubtreeSize(position);
    toast.success(
      subtreeSize > 1
        ? `„${position.name}“ und ${subtreeSize - 1} untergeordnete Posten kopiert.`
        : `„${position.name}“ kopiert.`,
    );
  };

  return (
    <Tooltip
      asChild
      triggerChildren={
        <Button
          type="button"
          onClick={handleClick}
          variant="tertiary"
          className={clsx("px-2 w-auto", className)}
          aria-label={LABEL}
          iconOnly
        >
          <FaRegCopy className="text-lg" />
        </Button>
      }
    >
      {LABEL}
    </Tooltip>
  );
};
