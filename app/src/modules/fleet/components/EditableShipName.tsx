"use client";

import { type Ship } from "@/generated/prisma/browser";
import { EditableText } from "@/modules/common/components/form/EditableText";
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
