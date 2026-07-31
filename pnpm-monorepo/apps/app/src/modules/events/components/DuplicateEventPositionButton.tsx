"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import { Tooltip } from "@/modules/common/components/Tooltip";
import type { EventPosition } from "@sam-monorepo/database/browser";
import { FaClone } from "react-icons/fa";
import { pasteEventPosition } from "../actions/pasteEventPosition";

const LABEL = "Posten duplizieren";

interface Props {
  readonly className?: string;
  readonly position: EventPosition;
}

/**
 * Duplicating is pasting a position right below itself, so it never needs an
 * additional level and can't exceed the maximum nesting.
 */
export const DuplicateEventPositionButton = ({
  className,
  position,
}: Props) => {
  const { isPending, formAction } = useAction(pasteEventPosition);

  return (
    <form action={formAction} className={className}>
      <input type="hidden" name="sourcePositionId" value={position.id} />
      <input type="hidden" name="targetPositionId" value={position.id} />
      <input type="hidden" name="placement" value="after" />

      <Tooltip
        asChild
        triggerChildren={
          <Button
            type="submit"
            disabled={isPending}
            variant="tertiary"
            className="px-2 w-auto"
            aria-label={LABEL}
            iconOnly
          >
            {isPending ? <AsciiSpinner /> : <FaClone className="text-lg" />}
          </Button>
        }
      >
        {LABEL}
      </Tooltip>
    </form>
  );
};
