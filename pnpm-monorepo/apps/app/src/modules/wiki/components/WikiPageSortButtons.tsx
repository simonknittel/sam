"use client";

import clsx from "clsx";
import { unstable_rethrow } from "next/navigation";
import { useTransition } from "react";
import toast from "react-hot-toast";
import { FaArrowDown, FaArrowUp } from "react-icons/fa";
import { updateWikiPageSortOrder } from "../actions/updateWikiPageSortOrder";

interface Props {
  readonly className?: string;
  readonly pageId: string;
}

/**
 * Compact icon-only buttons swapping the page's position with its
 * previous/next sibling. Rendered inside the sidebar tree rows.
 */
export const WikiPageSortButtons = ({ className, pageId }: Props) => {
  const [isPending, startTransition] = useTransition();

  const move = (direction: "up" | "down") => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("id", pageId);
        formData.set("direction", direction);
        const response = await updateWikiPageSortOrder(formData);
        if ("error" in response) {
          toast.error(response.error);
          console.error(response);
        }
      } catch (error) {
        unstable_rethrow(error);
        toast.error(
          "Ein unbekannter Fehler ist aufgetreten. Bitte versuche es später erneut.",
        );
        console.error(error);
      }
    });
  };

  return (
    <span className={clsx("flex items-center", className)}>
      <button
        type="button"
        onClick={() => move("up")}
        disabled={isPending}
        title="In der Reihenfolge nach oben verschieben"
        className="p-1 text-neutral-500 cursor-pointer hover:text-interaction-500 focus-visible:text-interaction-500 disabled:opacity-50"
      >
        <FaArrowUp className="size-3" />
      </button>
      <button
        type="button"
        onClick={() => move("down")}
        disabled={isPending}
        title="In der Reihenfolge nach unten verschieben"
        className="p-1 text-neutral-500 cursor-pointer hover:text-interaction-500 focus-visible:text-interaction-500 disabled:opacity-50"
      >
        <FaArrowDown className="size-3" />
      </button>
    </span>
  );
};
