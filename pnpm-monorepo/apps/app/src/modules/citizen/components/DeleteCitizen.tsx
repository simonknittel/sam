"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { Tile, TileVariant } from "@/modules/common/components/Tile";
import { type Entity } from "@sam-monorepo/database/browser";
import { useRouter } from "next/navigation";
import { FaTrash } from "react-icons/fa";

interface Props {
  readonly className?: string;
  readonly entity: Pick<Entity, "id" | "handle">;
}

export const DeleteCitizen = ({ className, entity }: Props) => {
  const router = useRouter();

  const deleteCitizen = async (formData: FormData) => {
    const response = await fetch(`/api/spynet/citizen/${entity.id}`, {
      method: "DELETE",
    });

    if (!response.ok)
      return {
        error: "Beim Löschen ist ein Fehler aufgetreten.",
        requestPayload: formData,
      };

    return { success: "Erfolgreich gelöscht" };
  };

  return (
    <Tile
      heading="Danger Zone"
      variant={TileVariant.Danger}
      className={className}
    >
      <ConfirmActionButton
        action={deleteCitizen}
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
            komplett löschen? Alle Einträge zu diesem Citizen gehen dabei
            verloren.
          </>
        }
        confirmLabel="Löschen"
        onSuccess={() => router.push("/app/spynet")}
      />
    </Tile>
  );
};
