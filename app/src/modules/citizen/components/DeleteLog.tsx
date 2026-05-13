"use client";

import { type EntityLog } from "@/generated/prisma/browser";
import Button from "@/modules/common/components/Button";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { FaSpinner, FaTrash } from "react-icons/fa";

interface Props {
  readonly log: EntityLog;
}

export const DeleteLog = ({ log }: Props) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const utils = api.useUtils();

  const handleClick = async () => {
    setIsLoading(true);

    try {
      const confirmation = window.confirm(`Willst du diesen Eintrag löschen?`);

      if (!confirmation) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(
        `/api/spynet/citizen/${log.entityId}/log/${log.id}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        await utils.entityLog.getHistory.invalidate({
          entityId: log.entityId,
          // @ts-expect-error Don't know how to improve this
          type: log.type,
        });
        router.refresh();
        toast.success("Erfolgreich gelöscht");
      } else {
        toast.error("Beim Löschen ist ein Fehler aufgetreten.");
      }
    } catch (error) {
      toast.error("Beim Löschen ist ein Fehler aufgetreten.");
      console.error(error);
    }

    setIsLoading(false);
  };

  return (
    <Button
      title="Eintrag löschen"
      className="h-auto self-center"
      onClick={() => void handleClick()}
      disabled={isLoading}
      variant="tertiary"
      type="button"
    >
      {isLoading ? <FaSpinner className="animate-spin" /> : <FaTrash />} Löschen
    </Button>
  );
};
