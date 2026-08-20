"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import clsx from "clsx";
import { useTransition } from "react";
import { FaRegStar, FaStar } from "react-icons/fa";
import { toggleAppFavorite } from "../actions/toggleAppFavorite";
import { useAppsContext } from "./AppsContext";

interface Props {
  readonly className?: string;
  readonly appKey: string;
}

/**
 * The star flips immediately and the context keeps the optimistic state, so
 * the surrounding popover neither closes nor re-renders from the server. A
 * failed toggle reverts and reports itself through the action's error toast —
 * success stays silent, since the star already says it.
 */
export const AppFavoriteButton = ({ className, appKey }: Props) => {
  const { favoriteAppKeys, setAppFavorite } = useAppsContext();
  const [isPending, startTransition] = useTransition();

  const isFavorite = favoriteAppKeys.has(appKey);
  const label = isFavorite ? "Favorit entfernen" : "Als Favorit speichern";

  const handleClick = () => {
    setAppFavorite(appKey, !isFavorite);

    startTransition(async () => {
      const formData = new FormData();
      formData.append("appKey", appKey);

      const succeeded = await runAction(toggleAppFavorite, formData, {
        successToast: false,
      });

      if (!succeeded) setAppFavorite(appKey, isFavorite);
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      title={label}
      aria-label={label}
      className={clsx(
        "flex-none cursor-pointer disabled:cursor-progress transition motion-reduce:transition-none enabled:active:scale-95",
        {
          "text-amber-400 enabled:hover:text-amber-300 enabled:focus-visible:text-amber-300":
            isFavorite,
          "text-neutral-500 enabled:hover:text-interaction-500 enabled:focus-visible:text-interaction-500":
            !isFavorite,
        },
        className,
      )}
    >
      {isFavorite ? <FaStar /> : <FaRegStar />}
    </button>
  );
};
