"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import {
  ConfirmationStatus,
  type OrganizationMembershipHistoryEntry,
} from "@sam-monorepo/database/browser";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { FaCheck, FaTimes } from "react-icons/fa";

interface Props {
  readonly entry: OrganizationMembershipHistoryEntry;
  readonly compact?: boolean;
}

export const ConfirmMembership = ({ entry, compact }: Props) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | false>(false);

  const handleConfirm = async (confirmed: string) => {
    setIsLoading(confirmed);

    try {
      const response = await fetch(
        `/api/spynet/organization/${entry.organizationId}/membership/${entry.citizenId}/confirm`,
        {
          method: "PATCH",
          body: JSON.stringify({
            id: entry.id,
            confirmed,
          }),
        },
      );

      if (response.ok) {
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
          onClick={() => void handleConfirm(ConfirmationStatus.CONFIRMED)}
          disabled={isLoading === ConfirmationStatus.CONFIRMED}
          title="Bestätigen"
        >
          {isLoading === ConfirmationStatus.CONFIRMED ? (
            <AsciiSpinner />
          ) : (
            <FaCheck />
          )}
        </Button>
        /
        <Button
          variant="tertiary"
          className="h-auto"
          onClick={() => void handleConfirm(ConfirmationStatus.FALSE_REPORT)}
          disabled={isLoading === ConfirmationStatus.FALSE_REPORT}
          title="Falschmeldung"
        >
          {isLoading === ConfirmationStatus.FALSE_REPORT ? (
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
        onClick={() => void handleConfirm(ConfirmationStatus.CONFIRMED)}
        disabled={isLoading === ConfirmationStatus.CONFIRMED}
      >
        {isLoading === ConfirmationStatus.CONFIRMED ? (
          <AsciiSpinner />
        ) : (
          <FaCheck />
        )}
        Bestätigen
      </Button>

      <Button
        variant="tertiary"
        className="h-auto"
        onClick={() => void handleConfirm(ConfirmationStatus.FALSE_REPORT)}
        disabled={isLoading === ConfirmationStatus.FALSE_REPORT}
      >
        {isLoading === ConfirmationStatus.FALSE_REPORT ? (
          <AsciiSpinner />
        ) : (
          <FaTimes />
        )}
        Falschmeldung
      </Button>
    </>
  );
};
