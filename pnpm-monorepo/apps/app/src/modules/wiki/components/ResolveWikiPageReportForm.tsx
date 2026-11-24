"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { Textarea } from "@/modules/common/components/form/Textarea";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import { WIKI_REPORT_TEXT_MAXIMUM_LENGTH } from "@sam-monorepo/domain";
import { FaCheck } from "react-icons/fa";
import { resolveWikiPageReport } from "../actions/resolveWikiPageReport";

interface Props {
  readonly className?: string;
  readonly reportId: string;
}

export const ResolveWikiPageReportForm = ({ className, reportId }: Props) => {
  const { formAction } = useAction(resolveWikiPageReport);

  return (
    <form action={formAction} className={className}>
      <input type="hidden" name="reportId" value={reportId} />

      <Textarea
        name="resolutionComment"
        label="Kommentar (optional)"
        maxLength={WIKI_REPORT_TEXT_MAXIMUM_LENGTH}
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
