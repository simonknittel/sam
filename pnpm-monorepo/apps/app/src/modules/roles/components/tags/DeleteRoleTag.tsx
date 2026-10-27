"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { Tile, TileVariant } from "@/modules/common/components/Tile";
import type { ManagedRoleTag } from "@sam-monorepo/application";
import { FaTrash } from "react-icons/fa";
import { deleteRoleTag } from "../../actions/deleteRoleTag";

interface Props {
  readonly tag: Pick<ManagedRoleTag, "id" | "name">;
}

export const DeleteRoleTag = ({ tag }: Props) => {
  return (
    <Tile heading="Danger Zone" variant={TileVariant.Danger}>
      <ConfirmActionButton
        action={deleteRoleTag}
        hiddenFields={[{ name: "tagId", value: tag.id }]}
        trigger={(isPending) => (
          <Button2 type="submit" disabled={isPending}>
            {isPending ? <AsciiSpinner /> : <FaTrash />}
            Löschen
          </Button2>
        )}
        title="Tag löschen?"
        description={
          <>
            Willst du den Tag <span className="font-bold">{tag.name}</span>{" "}
            wirklich löschen? Die Rollen bleiben, sie verlieren nur den Tag.
          </>
        }
        confirmLabel="Löschen"
      />
    </Tile>
  );
};
