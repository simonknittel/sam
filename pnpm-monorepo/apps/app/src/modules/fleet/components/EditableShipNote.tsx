"use client";

import { EditableInput } from "@/modules/common/components/form/EditableInput";
import { type Ship } from "@sam-monorepo/database/browser";
import { updateShipAction } from "../actions/updateShipAction";

/** The length of `shipNoteSchema` of the application */
const MAXIMUM_NOTE_LENGTH = 255;

interface Props {
  readonly className?: string;
  readonly shipId: Ship["id"];
  readonly note: string;
}

export const EditableShipNote = ({ className, shipId, note }: Props) => {
  return (
    <EditableInput
      className={className}
      rowId={shipId}
      columnName="note"
      initialValue={note}
      action={updateShipAction}
      required={false}
      maxLength={MAXIMUM_NOTE_LENGTH}
      twoLines
    />
  );
};
