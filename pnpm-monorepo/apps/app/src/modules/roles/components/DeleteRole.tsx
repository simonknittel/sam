import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { Tile, TileVariant } from "@/modules/common/components/Tile";
import type { Role } from "@sam-monorepo/database/client";
import { FaTrash } from "react-icons/fa";
import { deleteRole } from "../actions/deleteRole";

interface Props {
  readonly className?: string;
  readonly role: Pick<Role, "id" | "name">;
}

export const DeleteRole = ({ className, role }: Props) => {
  return (
    <Tile
      heading="Danger Zone"
      variant={TileVariant.Danger}
      className={className}
    >
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
    </Tile>
  );
};
