"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import { useId } from "react";
import { FaSave } from "react-icons/fa";
import { updateWikiPageLink } from "../actions/updateWikiPageLink";
import type { WikiPageTargetOption } from "../utils/getWikiPageTargets";
import { WIKI_PAGE_LINKS, type WikiPageLinkKey } from "../utils/wikiPageLinks";
import { WikiPageSelect } from "./WikiPageSelect";

interface Props {
  readonly linkKey: WikiPageLinkKey;
  readonly options: readonly WikiPageTargetOption[];
  readonly currentPageId: string | null;
}

/**
 * Picks the wiki page one of the `WIKI_PAGE_LINKS` entries points to.
 */
export const WikiPageLinkSetting = ({
  linkKey,
  options,
  currentPageId,
}: Props) => {
  const selectId = useId();
  const { state, formAction } = useAction(updateWikiPageLink, {
    errorToast: false,
  });
  const link = WIKI_PAGE_LINKS[linkKey];

  return (
    <form action={formAction}>
      <input type="hidden" name="key" value={linkKey} />

      <label className="mb-1 block" htmlFor={selectId}>
        {link.label}
      </label>
      <WikiPageSelect
        id={selectId}
        name="pageId"
        defaultValue={currentPageId ?? ""}
        targets={options}
        emptyOptionLabel="Keine"
      />
      <p className="mt-1 text-xs text-white/40">{link.description}</p>

      <SubmitButton icon={<FaSave />} className="mt-4 ml-auto">
        Speichern
      </SubmitButton>

      <ActionErrorNote className="mt-4" state={state} />
    </form>
  );
};
