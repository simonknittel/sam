"use client";

import { EditableInput } from "@/modules/common/components/form/EditableInput";
import { type Manufacturer } from "@sam-monorepo/database/browser";
import { updateManufacturerAction } from "../actions/updateManufacturer";

interface Props {
  readonly className?: string;
  readonly manufacturer: Pick<Manufacturer, "id" | "name">;
}

export const EditableManufacturerName = ({
  className,
  manufacturer,
}: Props) => {
  return (
    <EditableInput
      className={className}
      rowId={manufacturer.id}
      columnName="name"
      initialValue={manufacturer.name}
      action={updateManufacturerAction}
    />
  );
};
