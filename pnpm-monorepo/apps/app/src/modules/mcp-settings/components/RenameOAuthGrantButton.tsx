"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import { useState } from "react";
import { FaPen, FaSave } from "react-icons/fa";
import { renameOAuthGrant } from "../actions/renameOAuthGrant";
import { GrantCustomNameInput } from "./GrantCustomNameInput";

interface Props {
  readonly className?: string;
  readonly grantId: string;
  readonly displayName: string;
  readonly clientName: string;
  readonly customName: string | null;
}

export const RenameOAuthGrantButton = ({
  className,
  grantId,
  displayName,
  clientName,
  customName,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const { formAction, getDefaultValueWithFallback } = useAction(
    renameOAuthGrant,
    { onSuccess: () => setIsOpen(false) },
  );

  return (
    <>
      <Button2
        className={className}
        type="button"
        variant={Button2Variant.IconOnly}
        onClick={() => setIsOpen(true)}
        tooltip={`${displayName} umbenennen`}
      >
        <FaPen />
      </Button2>

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        className="w-120"
        heading={<h2>Client umbenennen</h2>}
      >
        <form action={formAction}>
          <input type="hidden" name="grantId" value={grantId} />

          <GrantCustomNameInput
            name="customName"
            defaultValue={getDefaultValueWithFallback(
              "customName",
              customName ?? "",
            )}
            clientName={clientName}
          />

          <SubmitButton icon={<FaSave />} className="mt-4 ml-auto">
            Speichern
          </SubmitButton>
        </form>
      </Modal>
    </>
  );
};
