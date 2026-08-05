"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
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
  const { state, formAction, isPending } = useAction(updateWikiDashboardPage, {
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

      <Button2 type="submit" disabled={isPending} className="mt-4 ml-auto">
        {isPending ? <AsciiSpinner /> : <FaSave />}
        Speichern
      </Button2>

      <ActionErrorNote className="mt-4" state={state} />
    </form>
  );
};
