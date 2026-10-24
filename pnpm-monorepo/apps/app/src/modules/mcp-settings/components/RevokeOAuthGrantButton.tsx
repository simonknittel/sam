"use client";

import Button from "@/modules/common/components/Button";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { FaUnlink } from "react-icons/fa";
import { revokeOAuthGrant } from "../actions/revokeOAuthGrant";

interface Props {
  readonly className?: string;
  readonly grantId: string;
  readonly displayName: string;
  readonly clientHost: string;
}

export const RevokeOAuthGrantButton = ({
  className,
  grantId,
  displayName,
  clientHost,
}: Props) => {
  return (
    <ConfirmActionButton
      className={className}
      action={revokeOAuthGrant}
      hiddenFields={[{ name: "grantId", value: grantId }]}
      trigger={(isPending) => (
        <Button
          type="submit"
          variant="tertiary"
          disabled={isPending}
          aria-label={`${displayName} trennen`}
        >
          <FaUnlink /> Trennen
        </Button>
      )}
      title="Client trennen?"
      description={
        <>
          <span className="font-bold wrap-break-word">{displayName}</span>{" "}
          <span className="break-all">({clientHost})</span> verliert sofort den
          Zugriff auf SAM. Für eine neue Verbindung musst du den Zugriff erneut
          erlauben.
        </>
      }
      confirmLabel="Trennen"
    />
  );
};
