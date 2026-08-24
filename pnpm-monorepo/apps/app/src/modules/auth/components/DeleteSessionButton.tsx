"use client";

import Button from "@/modules/common/components/Button";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { FaTrash } from "react-icons/fa";
import { deleteSession } from "../actions/deleteSession";

const LABEL = "Sitzung löschen";
const CURRENT_SESSION_HINT =
  "Die aktuelle Sitzung kann hier nicht gelöscht werden. Melde dich stattdessen ab.";

interface Props {
  readonly className?: string;
  readonly sessionId: string;
  readonly isCurrent: boolean;
}

export const DeleteSessionButton = ({
  className,
  sessionId,
  isCurrent,
}: Props) => {
  /**
   * A disabled button swallows its own hover events, so the explanation
   * hangs off the wrapper instead.
   */
  if (isCurrent)
    return (
      <span className={className} title={CURRENT_SESSION_HINT}>
        <Button type="button" variant="tertiary" disabled aria-label={LABEL}>
          <FaTrash /> Löschen
        </Button>
      </span>
    );

  return (
    <ConfirmActionButton
      className={className}
      action={deleteSession}
      hiddenFields={[{ name: "id", value: sessionId }]}
      trigger={(isPending) => (
        <Button
          type="button"
          variant="tertiary"
          disabled={isPending}
          aria-label={LABEL}
        >
          <FaTrash /> Löschen
        </Button>
      )}
      title="Sitzung löschen?"
      description="Das Gerät hinter dieser Sitzung wird abgemeldet und muss sich neu anmelden."
      confirmLabel="Löschen"
    />
  );
};
