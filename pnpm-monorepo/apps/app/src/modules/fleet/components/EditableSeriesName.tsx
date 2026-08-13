"use client";

import { EditableInput } from "@/modules/common/components/form/EditableInput";
import { type Series } from "@sam-monorepo/database/browser";
import { updateSeries } from "../actions/updateSeries";

interface Props {
  readonly className?: string;
  readonly series: Pick<Series, "id" | "name">;
}

export const EditableSeriesName = ({ className, series }: Props) => {
  return (
    <EditableInput
      className={className}
      rowId={series.id}
      columnName="name"
      initialValue={series.name}
      action={updateSeries}
    />
  );
};
