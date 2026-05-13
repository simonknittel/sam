"use client";

import { type Entity, type Organization } from "@/generated/prisma/browser";
import Button from "@/modules/common/components/Button";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { FaSpinner, FaTrash } from "react-icons/fa";

interface Props {
  readonly className?: string;
  readonly organizationId: Organization["id"];
  readonly citizenId: Entity["id"];
}

export const DeleteOrganizationMembership = ({
  className,
  organizationId,
  citizenId,
}: Props) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);

    try {
      const confirmation = window.confirm(
        `Willst du diesen Citizen aus der Organisation entfernen?`,
      );

      if (!confirmation) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(
        `/api/spynet/organization/${organizationId}/membership/${citizenId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        toast.error("Beim Entfernen ist ein Fehler aufgetreten.");
        return;
      }

      router.refresh();
      toast.success("Erfolgreich entfernt");
    } catch (error) {
      toast.error("Beim Entfernen ist ein Fehler aufgetreten.");
      console.error(error);
    }

    setIsLoading(false);
  };

  return (
    <Button
      title="Citizen aus der Organisation entfernen"
      className={clsx(className, "h-auto self-center")}
      onClick={() => void handleClick()}
      disabled={isLoading}
      variant="tertiary"
      type="button"
    >
      {isLoading ? <FaSpinner className="animate-spin" /> : <FaTrash />}
    </Button>
  );
};
