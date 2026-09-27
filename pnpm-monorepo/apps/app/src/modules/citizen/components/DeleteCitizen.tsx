"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { Tile, TileVariant } from "@/modules/common/components/Tile";
import { type Citizen } from "@sam-monorepo/database/browser";
import { useRouter } from "next/navigation";
import { FaTrash } from "react-icons/fa";
import { deleteCitizen } from "../actions/deleteCitizen";

interface Props {
  readonly className?: string;
  readonly entity: Pick<Citizen, "id" | "handle">;
}

export const DeleteCitizen = ({ className, entity }: Props) => {
  const router = useRouter();

  return (
    <Tile
      heading="Danger Zone"
      variant={TileVariant.Danger}
      className={className}
    >
      <ConfirmActionButton
        action={deleteCitizen}
        hiddenFields={[{ name: "id", value: entity.id }]}
        trigger={(isPending) => (
          <Button2 disabled={isPending}>
            {isPending ? <AsciiSpinner /> : <FaTrash />}
            Löschen
          </Button2>
        )}
        title="Citizen löschen?"
        description={
          <>
            Willst du den Citizen{" "}
            <span className="font-bold">{entity.handle || entity.id}</span>{" "}
            löschen? Er verschwindet aus allen Listen, und Einträge zu ihm
            zeigen nur noch „Gelöschter Citizen“. Das lässt sich nicht
            rückgängig machen.
          </>
        }
        confirmLabel="Löschen"
        onSuccess={() => router.push("/app/spynet")}
      />
    </Tile>
  );
};
