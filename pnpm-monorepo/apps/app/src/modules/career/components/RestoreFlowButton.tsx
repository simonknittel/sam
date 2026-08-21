"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { TextInput } from "@/modules/common/components/form/TextInput";
import { SLUG_MAX_LENGTH } from "@/modules/common/utils/slugify";
import { FaTrashRestore } from "react-icons/fa";
import { restoreFlow } from "../actions/restoreFlow";

interface Props {
  readonly flowId: string;
  readonly name: string;
  readonly slug: string;
}

export const RestoreFlowButton = ({ flowId, name, slug }: Props) => {
  return (
    <ConfirmActionButton
      action={restoreFlow}
      hiddenFields={[{ name: "flowId", value: flowId }]}
      trigger={(isPending) => (
        <Button2
          type="button"
          variant={Button2Variant.IconOnly}
          tooltip="Wiederherstellen"
          disabled={isPending}
        >
          {isPending ? <AsciiSpinner /> : <FaTrashRestore />}
        </Button2>
      )}
      title="Karrierebaum wiederherstellen?"
      description={`„${name}“ erscheint mit seinen Knoten und Berechtigungen wieder am Ende der Liste. Da ein gelöschter Karrierebaum seinen Slug freigibt, kann dieser inzwischen vergeben sein — dann wähle hier einen anderen.`}
      confirmLabel="Wiederherstellen"
    >
      {(formId) => (
        <TextInput
          form={formId}
          name="slug"
          label="Slug"
          defaultValue={slug}
          maxLength={SLUG_MAX_LENGTH}
          required
        />
      )}
    </ConfirmActionButton>
  );
};
