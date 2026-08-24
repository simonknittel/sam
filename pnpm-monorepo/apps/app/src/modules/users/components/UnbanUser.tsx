"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { FaUnlock } from "react-icons/fa";
import { unbanUserAction } from "../actions/unbanUser";

interface Props {
  readonly userId: string;
}

export const UnbanUser = ({ userId }: Props) => {
  return (
    <ConfirmActionButton
      action={unbanUserAction}
      hiddenFields={[{ name: "userId", value: userId }]}
      trigger={(isPending) => (
        <Button2
          variant={Button2Variant.IconOnly}
          disabled={isPending}
          tooltip="Benutzer entsperren"
        >
          {isPending ? <AsciiSpinner /> : <FaUnlock />}
        </Button2>
      )}
      title="Benutzer entsperren?"
      description="Der Benutzer kann sich danach wieder anmelden."
      confirmLabel="Entsperren"
    />
  );
};
