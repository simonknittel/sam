"use client";

import { EditableInput } from "@/modules/common/components/form/EditableInput";
import { type Ship } from "@sam-monorepo/database/browser";
import { updateShipAction } from "../actions/updateShipAction";

interface Props {
  readonly className?: string;
  readonly shipId: Ship["id"];
  readonly name: string;
}

export const EditableShipName = ({ className, shipId, name }: Props) => {
  return (
    <EditableInput
      className={className}
      rowId={shipId}
      columnName="name"
      initialValue={name}
      action={updateShipAction}
    />
  );
};
