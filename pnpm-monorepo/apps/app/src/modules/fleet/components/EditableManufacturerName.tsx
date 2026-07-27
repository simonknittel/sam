"use client";

import { type Manufacturer } from "@/generated/prisma/browser";
import { EditableText } from "@/modules/common/components/form/EditableText";
import { updateManufacturerAction } from "../actions/updateManufacturer";

interface Props {
  readonly className?: string;
  readonly manufacturer: Pick<Manufacturer, "id" | "name">;
}

export const EditableManufacturerName = ({
  className,
  manufacturer,
}: Props) => {
  const action = (formData: FormData) => {
    const _formData = new FormData();
    _formData.set("id", manufacturer.id);
    _formData.set("name", (formData.get("value") as string) || "");

    return updateManufacturerAction(_formData);
  };

  return (
    <EditableText
      className={className}
      action={action}
      initialValue={manufacturer.name}
    />
  );
};
