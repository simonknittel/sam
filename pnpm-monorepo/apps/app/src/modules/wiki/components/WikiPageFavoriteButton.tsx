"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { FaRegStar, FaStar } from "react-icons/fa";
import { toggleWikiPageFavorite } from "../actions/toggleWikiPageFavorite";

interface Props {
  readonly className?: string;
  readonly pageId: string;
  readonly isFavorite: boolean;
}

export const WikiPageFavoriteButton = ({
  className,
  pageId,
  isFavorite,
}: Props) => {
  const { formAction, isPending } = useAction(toggleWikiPageFavorite);

  return (
    <form action={formAction} className={className}>
      <input type="hidden" name="pageId" value={pageId} />

      <Button2
        type="submit"
        variant={Button2Variant.Secondary}
        disabled={isPending}
        title={isFavorite ? "Favorit entfernen" : "Als Favorit speichern"}
      >
        {isPending ? (
          <AsciiSpinner />
        ) : isFavorite ? (
          <FaStar className="text-amber-400" />
        ) : (
          <FaRegStar />
        )}
      </Button2>
    </form>
  );
};
