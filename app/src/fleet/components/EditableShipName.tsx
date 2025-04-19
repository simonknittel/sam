"use client";

import { EditableText } from "@/common/components/form/EditableText";
import { type Ship } from "@prisma/client";
import { updateShipAction } from "../actions/updateShipAction";

interface Props {
  readonly className?: string;
  readonly shipId: Ship["id"];
  readonly name: string;
}

export const EditableShipName = ({ className, shipId, name }: Props) => {
  const action = (formData: FormData) => {
    const _formData = new FormData();
    _formData.set("id", shipId);
    _formData.set("name", (formData.get("value") as string) || "");

    return updateShipAction(_formData);
  };

  return (
    <EditableText className={className} action={action} initialValue={name} />
  );
};
