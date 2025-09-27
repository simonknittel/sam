"use client";

import { EditableText } from "@/modules/common/components/form/EditableText";
import { type Series } from "@prisma/client";
import { updateSeries } from "../actions/updateSeries";

interface Props {
  readonly className?: string;
  readonly series: Pick<Series, "id" | "name">;
}

export const EditableSeriesName = ({ className, series }: Props) => {
  const action = (formData: FormData) => {
    const _formData = new FormData();
    _formData.set("id", series.id);
    _formData.set("name", (formData.get("value") as string) || "");

    return updateSeries(_formData);
  };

  return (
    <EditableText
      className={className}
      action={action}
      initialValue={series.name}
    />
  );
};
