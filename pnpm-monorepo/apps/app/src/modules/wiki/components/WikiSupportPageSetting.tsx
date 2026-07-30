"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import Note from "@/modules/common/components/Note";
import { useId } from "react";
import { FaSave } from "react-icons/fa";
import { updateWikiSupportPage } from "../actions/updateWikiSupportPage";
import type { WikiPageTargetOption } from "../utils/getEditableWikiPageTargets";
import { WikiPageSelect } from "./WikiPageSelect";

interface Props {
  readonly options: readonly WikiPageTargetOption[];
  readonly currentSupportPageId: string | null;
}

/**
 * Picks the wiki page the topbar's support icon links to.
 */
export const WikiSupportPageSetting = ({
  options,
  currentSupportPageId,
}: Props) => {
  const selectId = useId();
  const { state, formAction, isPending } = useAction(updateWikiSupportPage);

  return (
    <form action={formAction}>
      <label className="mb-1 block" htmlFor={selectId}>
        Support-Seite
      </label>
      <WikiPageSelect
        id={selectId}
        name="supportPageId"
        defaultValue={currentSupportPageId ?? ""}
        targets={options}
        emptyOptionLabel="Keine"
      />
      <p className="mt-1 text-xs text-white/40">
        Auf diese Seite verweist zukünftig das Fragezeichen-Symbol in der
        Kopfleiste.
      </p>

      <Button2 type="submit" disabled={isPending} className="mt-4 ml-auto">
        {isPending ? <AsciiSpinner /> : <FaSave />}
        Speichern
      </Button2>

      {state && "error" in state && state.error && (
        <Note type="error" message={state.error} className="mt-4" />
      )}
    </form>
  );
};
