"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import clsx from "clsx";
import { useTopLoader } from "nextjs-toploader";
import { useQueryStates } from "nuqs";
import { useEffect, useTransition } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { cursorPaginationParsers } from "./cursorPaginationParsers";

interface Props {
  readonly className?: string;
  readonly nextCursor: string | null;
  readonly prevCursor: string | null;
}

export const CursorPaginationControls = ({
  className,
  nextCursor,
  prevCursor,
}: Props) => {
  const [isLoading, startTransition] = useTransition();

  const [, setPagination] = useQueryStates(cursorPaginationParsers, {
    shallow: false,
    startTransition,
    history: "push",
  });

  const loader = useTopLoader();

  useEffect(() => {
    if (isLoading) {
      loader.start();
    }
  }, [loader, isLoading]);

  if (!nextCursor && !prevCursor) return null;

  return (
    <div className={clsx("flex items-center justify-center gap-2", className)}>
      <Button2
        type="button"
        variant={Button2Variant.Secondary}
        disabled={!prevCursor}
        onClick={() =>
          void setPagination({
            cursor: prevCursor,
            direction: "prev",
          })
        }
      >
        <FaChevronLeft />
        Zurück
      </Button2>

      <Button2
        type="button"
        variant={Button2Variant.Secondary}
        disabled={!nextCursor}
        onClick={() =>
          void setPagination({
            cursor: nextCursor,
            direction: "next",
          })
        }
      >
        Weiter
        <FaChevronRight />
      </Button2>
    </div>
  );
};
