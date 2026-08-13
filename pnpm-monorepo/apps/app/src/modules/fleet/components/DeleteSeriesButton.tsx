"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { type Series } from "@sam-monorepo/database/browser";
import { FaTrash } from "react-icons/fa";
import { deleteSeries } from "../actions/deleteSeries";

interface Props {
  readonly className?: string;
  readonly series: Pick<Series, "id" | "name">;
}

export const DeleteSeriesButton = ({ className, series }: Props) => {
  return (
    <ConfirmActionButton
      className={className}
      action={deleteSeries}
      hiddenFields={[{ name: "id", value: series.id }]}
      trigger={(isPending) => (
        <Button variant="tertiary" disabled={isPending}>
          {isPending ? <AsciiSpinner /> : <FaTrash />} Löschen
        </Button>
      )}
      title="Schiff löschen?"
      description={<>Willst du &quot;{series.name}&quot; löschen?</>}
      confirmLabel="Löschen"
    />
  );
};
