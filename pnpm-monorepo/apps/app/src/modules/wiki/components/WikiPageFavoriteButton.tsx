"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { Button2Variant } from "@/modules/common/components/Button2";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
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
  const { formAction } = useAction(toggleWikiPageFavorite);

  return (
    <form action={formAction} className={className}>
      <input type="hidden" name="pageId" value={pageId} />

      <SubmitButton
        variant={Button2Variant.IconOnly}
        tooltip={isFavorite ? "Favorit entfernen" : "Als Favorit speichern"}
        icon={
          isFavorite ? <FaStar className="text-amber-400" /> : <FaRegStar />
        }
      />
    </form>
  );
};
