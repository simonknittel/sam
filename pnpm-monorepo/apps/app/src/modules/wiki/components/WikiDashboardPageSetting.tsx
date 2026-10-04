"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import { useId } from "react";
import { FaSave } from "react-icons/fa";
import { updateWikiDashboardPage } from "../actions/updateWikiDashboardPage";
import type { WikiPageTargetOption } from "../utils/getWikiPageTargets";
import { WikiPageSelect } from "./WikiPageSelect";

interface Props {
  readonly options: readonly WikiPageTargetOption[];
  readonly currentPageId: string | null;
}

/**
 * Picks the wiki page whose content is shown on the app dashboard.
 */
export const WikiDashboardPageSetting = ({ options, currentPageId }: Props) => {
  const selectId = useId();
  const { state, formAction } = useAction(updateWikiDashboardPage, {
    errorToast: false,
  });

  return (
    <form action={formAction}>
      <label className="mb-1 block" htmlFor={selectId}>
        Seite
      </label>
      <WikiPageSelect
        id={selectId}
        name="pageId"
        defaultValue={currentPageId ?? ""}
        targets={options}
        emptyOptionLabel="Keine"
      />

      <SubmitButton icon={<FaSave />} className="mt-4 ml-auto">
        Speichern
      </SubmitButton>

      <ActionErrorNote className="mt-4" state={state} />
    </form>
  );
};
