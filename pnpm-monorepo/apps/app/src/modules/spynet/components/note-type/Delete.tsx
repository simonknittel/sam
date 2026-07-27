"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import { type NoteType } from "@sam-monorepo/database/browser";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { FaTrash } from "react-icons/fa";

interface Props {
  noteType: NoteType;
}

const Delete = ({ noteType }: Readonly<Props>) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);

    try {
      const confirmation = window.confirm(`Löschen bestätigen`);

      if (!confirmation) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(`/api/note-type/${noteType.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
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
      onClick={() => void handleClick()}
      disabled={isLoading}
      variant="tertiary"
    >
      {isLoading ? <AsciiSpinner /> : <FaTrash />} Löschen
    </Button>
  );
};

export default Delete;
