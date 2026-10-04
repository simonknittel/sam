"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { Textarea } from "@/modules/common/components/form/Textarea";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import { FaCheck } from "react-icons/fa";
import { resolveWikiPageReport } from "../actions/resolveWikiPageReport";

interface Props {
  readonly className?: string;
  readonly reportId: string;
}

/** Inline resolve form on the report detail page. */
export const ResolveWikiPageReportForm = ({ className, reportId }: Props) => {
  /**
   * An error shows as a toast: when a different manager resolved the report
   * before, the refreshed page has no form anymore
   */
  const { formAction } = useAction(resolveWikiPageReport);

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

      <SubmitButton icon={<FaCheck />} className="mt-4 ml-auto">
        Als bearbeitet markieren
      </SubmitButton>
    </form>
  );
};
