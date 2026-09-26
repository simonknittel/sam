"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Note from "@/modules/common/components/Note";
import { api } from "@/trpc/react";
import type { ReactNode } from "react";
import type { WikiPageTargetOption } from "../utils/getWikiPageTargets";
import { useWikiPageHrefMode } from "./WikiPageHrefModeProvider";

interface Props {
  /** The page to move — it and its subtree are left out */
  readonly excludeSubtreeOf?: string;
  readonly children: (targets: WikiPageTargetOption[]) => ReactNode;
}

/**
 * Loads the pages the viewer manages in the current scope (global wiki,
 * briefing or variant embed) for the create and move dialogs, and renders
 * the dialog content with them. Mounted only while a dialog is open, so the
 * pages do not send the list with every navigation. Nothing stays cached
 * after the dialog closes: the dialogs select their default from the list
 * once, so it must include the pages created or moved in the meantime.
 */
export const WikiPageTargetsLoader = ({
  excludeSubtreeOf,
  children,
}: Props) => {
  const { container, variantId } = useWikiPageHrefMode();
  const { data, isError } = api.wiki.getPageTargets.useQuery(
    {
      permission: "manage",
      container: container ?? undefined,
      variantId: variantId ?? undefined,
      excludeSubtreeOf,
    },
    { gcTime: 0 },
  );

  if (isError)
    return (
      <Note
        type="error"
        message="Die Seiten konnten nicht geladen werden. Bitte versuche es erneut."
      />
    );

  if (!data)
    return (
      <div className="flex justify-center items-center p-8">
        <AsciiSpinner className="text-5xl text-neutral-500" />
      </div>
    );

  return children(data);
};
