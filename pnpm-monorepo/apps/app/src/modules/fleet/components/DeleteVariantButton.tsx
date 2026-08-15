"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import Note from "@/modules/common/components/Note";
import { type Variant } from "@sam-monorepo/database/browser";
import { FaTrash } from "react-icons/fa";
import { deleteVariant } from "../actions/deleteVariant";

interface Props {
  readonly className?: string;
  readonly variant: Pick<Variant, "id" | "name">;
  readonly shipCount: number;
}

export const DeleteVariantButton = ({
  className,
  variant,
  shipCount,
}: Props) => {
  return (
    <ConfirmActionButton
      className={className}
      action={deleteVariant}
      hiddenFields={[{ name: "id", value: variant.id }]}
      trigger={(isPending) => (
        <Button variant="tertiary" disabled={isPending}>
          {isPending ? <AsciiSpinner /> : <FaTrash />} Löschen
        </Button>
      )}
      title="Variante löschen?"
      description={<>Willst du &quot;{variant.name}&quot; löschen?</>}
      confirmLabel="Löschen"
      confirmDisabled={shipCount > 0}
    >
      {shipCount > 0 && (
        <Note
          type="error"
          message={
            <p>
              Diese Variante kann nicht gelöscht werden. Sie wird von{" "}
              {shipCount} Schiffen verwendet. Kontaktiere <em>ind3x</em> um sie
              mit einer anderen zu kombinieren/ersetzen oder zu löschen.
            </p>
          }
        />
      )}
    </ConfirmActionButton>
  );
};
