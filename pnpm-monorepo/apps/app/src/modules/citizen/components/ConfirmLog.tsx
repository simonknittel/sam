"use client";

import { ConfirmationValue } from "@/modules/citizen/utils/citizenLogConfirmation";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import { api } from "@/trpc/react";
import { type CitizenLog } from "@sam-monorepo/database/browser";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { FaCheck, FaTimes } from "react-icons/fa";

interface Props {
  readonly log: Pick<CitizenLog, "id" | "citizenId" | "type">;
  readonly compact?: boolean;
}

const ConfirmLog = ({ log, compact }: Props) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<ConfirmationValue | false>(false);
  const utils = api.useUtils();

  const handleConfirm = async (
    confirmed: ConfirmationValue.Confirmed | ConfirmationValue.FalseReport,
  ) => {
    setIsLoading(confirmed);

    try {
      const response = await fetch(
        `/api/spynet/citizen/${log.citizenId}/log/${log.id}/confirm`,
        {
          method: "PATCH",
          body: JSON.stringify({
            confirmed,
          }),
        },
      );

      if (response.ok) {
        await utils.citizenLog.getHistory.invalidate({
          citizenId: log.citizenId,
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
          onClick={() => void handleConfirm(ConfirmationValue.Confirmed)}
          disabled={isLoading === ConfirmationValue.Confirmed}
          title="Bestätigen"
        >
          {isLoading === ConfirmationValue.Confirmed ? (
            <AsciiSpinner />
          ) : (
            <FaCheck />
          )}
        </Button>
        /
        <Button
          variant="tertiary"
          className="h-auto"
          onClick={() => void handleConfirm(ConfirmationValue.FalseReport)}
          disabled={isLoading === ConfirmationValue.FalseReport}
          title="Falschmeldung"
        >
          {isLoading === ConfirmationValue.FalseReport ? (
            <AsciiSpinner />
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
        onClick={() => void handleConfirm(ConfirmationValue.Confirmed)}
        disabled={isLoading === ConfirmationValue.Confirmed}
      >
        {isLoading === ConfirmationValue.Confirmed ? (
          <AsciiSpinner />
        ) : (
          <FaCheck />
        )}
        Bestätigen
      </Button>

      <Button
        variant="tertiary"
        className="h-auto"
        onClick={() => void handleConfirm(ConfirmationValue.FalseReport)}
        disabled={isLoading === ConfirmationValue.FalseReport}
      >
        {isLoading === ConfirmationValue.FalseReport ? (
          <AsciiSpinner />
        ) : (
          <FaTimes />
        )}
        Falschmeldung
      </Button>
    </>
  );
};

export default ConfirmLog;
