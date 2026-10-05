"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { Button2Variant } from "@/modules/common/components/Button2";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import { FaRegStar, FaStar } from "react-icons/fa";
import { updateWikiPageFavorite } from "../actions/updateWikiPageFavorite";

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
  const { formAction } = useAction(updateWikiPageFavorite);

  return (
    <form action={formAction} className={className}>
      <input type="hidden" name="pageId" value={pageId} />
      {!isFavorite && <input type="hidden" name="isFavorite" value="1" />}

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
