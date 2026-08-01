"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import { Textarea } from "@/modules/common/components/form/Textarea";
import { FaCheck } from "react-icons/fa";
import { resolveWikiPageReport } from "../actions/resolveWikiPageReport";

interface Props {
  readonly className?: string;
  readonly reportId: string;
}

/** Inline resolve form on the report detail page. */
export const ResolveWikiPageReportForm = ({ className, reportId }: Props) => {
  const { state, formAction, isPending } = useAction(resolveWikiPageReport, {
    errorToast: false,
  });

  return (
    <form action={formAction} className={className}>
      <input type="hidden" name="reportId" value={reportId} />

      <Textarea
        name="resolutionComment"
        label="Kommentar (optional)"
        maxLength={2048}
      />

      <p className="mt-2 text-sm text-neutral-400">
        Das Bearbeiten ändert nichts an der Seite selbst — Sichtbarkeit o.ä. bei
        Bedarf separat anpassen.
      </p>

      <Button2 type="submit" disabled={isPending} className="mt-4 ml-auto">
        {isPending ? <AsciiSpinner /> : <FaCheck />}
        Als bearbeitet markieren
      </Button2>

      <ActionErrorNote className="mt-4" state={state} />
    </form>
  );
};
