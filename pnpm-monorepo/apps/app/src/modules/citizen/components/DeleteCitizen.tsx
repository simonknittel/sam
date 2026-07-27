"use client";

import { type Entity } from "@/generated/prisma/browser";
import Button from "@/modules/common/components/Button";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { FaSpinner, FaTrash } from "react-icons/fa";

interface Props {
  readonly className?: string;
  readonly entity: Entity;
}

export const DeleteCitizen = ({ className, entity }: Props) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);

    try {
      const confirmation = window.confirm(
        `Willst du diesen Citizen komplett löschen?`,
      );

      if (!confirmation) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(`/api/spynet/citizen/${entity.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/app/spynet");
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
      className={clsx(className)}
    >
      {isLoading ? <FaSpinner className="animate-spin" /> : <FaTrash />}
      Löschen
    </Button>
  );
};
