"use client";

import { type EntityLog } from "@/generated/prisma/browser";
import Button from "@/modules/common/components/Button";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { FaCheck, FaSpinner, FaTimes } from "react-icons/fa";

interface Props {
  readonly log: EntityLog;
  readonly compact?: boolean;
}

const ConfirmLog = ({ log, compact }: Props) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | false>(false);
  const utils = api.useUtils();

  const handleConfirm = async (confirmed: string) => {
    setIsLoading(confirmed);

    try {
      const response = await fetch(
        `/api/spynet/citizen/${log.entityId}/log/${log.id}/confirm`,
        {
          method: "PATCH",
          body: JSON.stringify({
            confirmed,
          }),
        },
      );

      if (response.ok) {
        await utils.entityLog.getHistory.invalidate({
          entityId: log.entityId,
          // @ts-expect-error Don't know how to improve this
          type: log.type,
        });
        router.refresh();
        toast.success("Erfolgreich gespeichert");
      } else {
        toast.error("Beim Speichern ist ein Fehler aufgetreten.");
      }
    } catch (error) {
      toast.error("Beim Speichern ist ein Fehler aufgetreten.");
      console.error(error);
    }

    setIsLoading(false);
  };

  if (compact) {
    return (
      <>
        <Button
          variant="tertiary"
          className="h-auto"
          onClick={() => void handleConfirm("confirmed")}
          disabled={isLoading === "confirmed"}
          title="Bestätigen"
        >
          {isLoading === "confirmed" ? (
            <FaSpinner className="animate-spin" />
          ) : (
            <FaCheck />
          )}
        </Button>
        /
        <Button
          variant="tertiary"
          className="h-auto"
          onClick={() => void handleConfirm("false-report")}
          disabled={isLoading === "false-report"}
          title="Falschmeldung"
        >
          {isLoading === "false-report" ? (
            <FaSpinner className="animate-spin" />
          ) : (
            <FaTimes />
          )}
        </Button>
      </>
    );
  }

  return (
    <>
      <Button
        variant="tertiary"
        className="h-auto"
        onClick={() => void handleConfirm("confirmed")}
        disabled={isLoading === "confirmed"}
      >
        {isLoading === "confirmed" ? (
          <FaSpinner className="animate-spin" />
        ) : (
          <FaCheck />
        )}
        Bestätigen
      </Button>

      <Button
        variant="tertiary"
        className="h-auto"
        onClick={() => void handleConfirm("false-report")}
        disabled={isLoading === "false-report"}
      >
        {isLoading === "false-report" ? (
          <FaSpinner className="animate-spin" />
        ) : (
          <FaTimes />
        )}
        Falschmeldung
      </Button>
    </>
  );
};

export default ConfirmLog;
