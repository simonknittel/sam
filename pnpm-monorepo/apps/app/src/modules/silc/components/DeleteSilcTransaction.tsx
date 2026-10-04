"use client";

import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { type SilcTransaction } from "@sam-monorepo/database/browser";
import { FaTrash } from "react-icons/fa";
import { deleteSilcTransaction } from "../actions/deleteSilcTransaction";

interface Props {
  readonly className?: string;
  readonly id: SilcTransaction["id"];
}

export const DeleteSilcTransaction = ({ className, id }: Props) => {
  return (
    <ConfirmActionButton
      className={className}
      action={deleteSilcTransaction}
      hiddenFields={[{ name: "id", value: id }]}
      trigger={(isPending) => (
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center text-xs text-brand-red-500 hover:cursor-pointer hover:text-brand-red-300"
          title="Löschen"
        >
          <FaTrash />
        </button>
      )}
      title="Transaktion löschen?"
      description="Willst du diesen Eintrag löschen?"
      confirmLabel="Löschen"
    />
  );
};
