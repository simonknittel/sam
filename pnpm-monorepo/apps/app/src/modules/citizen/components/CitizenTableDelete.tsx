"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { type Citizen } from "@sam-monorepo/database/browser";
import { useRouter } from "next/navigation";
import { FaTrash } from "react-icons/fa";
import { deleteCitizen } from "../actions/deleteCitizen";

interface Props {
  readonly entity: Pick<Citizen, "id">;
}

export const CitizenTableDelete = ({ entity }: Props) => {
  const router = useRouter();

  return (
    <ConfirmActionButton
      action={deleteCitizen}
      hiddenFields={[{ name: "id", value: entity.id }]}
      trigger={(isPending) => (
        <Button type="submit" disabled={isPending} variant="tertiary">
          {isPending ? <AsciiSpinner /> : <FaTrash />} Löschen
        </Button>
      )}
      title="Citizen löschen?"
      description="Willst du diesen Citizen löschen? Das lässt sich nicht rückgängig machen."
      confirmLabel="Löschen"
      onSuccess={() => router.refresh()}
    />
  );
};
