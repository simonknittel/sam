"use client";

import Button from "@/modules/common/components/Button";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { FaTrash } from "react-icons/fa";
import { deleteUpload } from "../actions/deleteUpload";
import {
  UPLOAD_USAGE_TYPE_LABELS,
  type UploadUsage,
} from "../utils/uploadUsage";

interface Props {
  readonly className?: string;
  readonly uploadId: string;
  readonly fileName: string;
  /** Where the upload is currently embedded; empty means it is unused. */
  readonly usages: readonly UploadUsage[];
}

/**
 * Deleting is allowed even while the upload is still embedded somewhere —
 * the dialog names every one of those places instead, because scrubbing the
 * content is not an option: the wiki's live collaboration documents live on
 * a separate server and would resurrect it.
 */
export const DeleteUploadButton = ({
  className,
  uploadId,
  fileName,
  usages,
}: Props) => {
  return (
    <ConfirmActionButton
      className={className}
      action={deleteUpload}
      hiddenFields={[{ name: "id", value: uploadId }]}
      trigger={(isPending) => (
        <Button
          type="button"
          variant="tertiary"
          disabled={isPending}
          aria-label={`"${fileName}" löschen`}
        >
          <FaTrash /> Löschen
        </Button>
      )}
      title="Upload löschen?"
      description={
        <>
          &bdquo;{fileName}&ldquo; wird endgültig gelöscht &ndash; aus der
          Datenbank und aus dem Speicher.
        </>
      }
      confirmLabel="Löschen"
    >
      {usages.length > 0 ? (
        <div className="text-sm">
          <p className="text-yellow-500">
            ⚠️ Die Datei wird aktuell an {usages.length}{" "}
            {usages.length === 1 ? "Stelle" : "Stellen"} verwendet. Dort bleibt
            sie eingebunden und wird danach nicht mehr angezeigt:
          </p>

          <ul className="mt-2 flex list-inside list-disc flex-col gap-1">
            {usages.map((usage) => (
              <li key={usage.key}>
                <span className="text-neutral-500">
                  {UPLOAD_USAGE_TYPE_LABELS[usage.type]}:
                </span>{" "}
                {usage.label}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-neutral-500">
          Die Datei wird derzeit nirgendwo verwendet.
        </p>
      )}
    </ConfirmActionButton>
  );
};
