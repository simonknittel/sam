"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { Textarea } from "@/modules/common/components/form/Textarea";
import { FaBan } from "react-icons/fa";
import { banUserAction } from "../actions/banUser";

interface Props {
  readonly userId: string;
}

export const BanUser = ({ userId }: Props) => {
  return (
    <ConfirmActionButton
      action={banUserAction}
      hiddenFields={[{ name: "userId", value: userId }]}
      trigger={(isPending) => (
        <Button2
          variant={Button2Variant.IconOnly}
          disabled={isPending}
          title="Benutzer sperren"
        >
          {isPending ? <AsciiSpinner /> : <FaBan />}{" "}
          <span className="sr-only">Sperren</span>
        </Button2>
      )}
      title="Benutzer sperren?"
      description="Der Benutzer wird sofort abgemeldet und kann sich nicht mehr anmelden."
      confirmLabel="Sperren"
    >
      {(formId) => (
        <div>
          <Textarea
            label="Grund (optional)"
            name="reason"
            maxLength={500}
            form={formId}
            autoFocus
          />
        </div>
      )}
    </ConfirmActionButton>
  );
};
