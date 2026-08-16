import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import type { Role } from "@sam-monorepo/database/client";
import clsx from "clsx";
import { FaTrash } from "react-icons/fa";
import { deleteRole } from "../actions/deleteRole";

interface Props {
  readonly className?: string;
  readonly role: Pick<Role, "id" | "name">;
}

export const DeleteRole = ({ className, role }: Props) => {
  return (
    <section
      className={clsx(
        "rounded-primary bg-red-500/10 border border-red-500/30 p-4",
        className,
      )}
    >
      <h2 className="font-bold mb-2 text-lg font-mono uppercase text-red-500">
        Danger Zone
      </h2>

      <ConfirmActionButton
        action={deleteRole}
        hiddenFields={[{ name: "id", value: role.id }]}
        trigger={(isPending) => (
          <Button2 disabled={isPending}>
            {isPending ? <AsciiSpinner /> : <FaTrash />}
            Löschen
          </Button2>
        )}
        title="Rolle löschen?"
        description={
          <>
            Willst du die Rolle <span className="font-bold">{role.name}</span>{" "}
            wirklich löschen?
          </>
        }
        confirmLabel="Löschen"
      />
    </section>
  );
};
