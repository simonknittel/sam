"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { deleteOrganizationMembership } from "@/modules/organizations/actions/deleteOrganizationMembership";
import {
  type Citizen,
  type Organization,
} from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { FaTrash } from "react-icons/fa";

interface Props {
  readonly className?: string;
  readonly organizationId: Organization["id"];
  readonly citizenId: Citizen["id"];
}

export const DeleteOrganizationMembership = ({
  className,
  organizationId,
  citizenId,
}: Props) => {
  return (
    <ConfirmActionButton
      action={deleteOrganizationMembership}
      hiddenFields={[
        { name: "organizationId", value: organizationId },
        { name: "citizenId", value: citizenId },
      ]}
      trigger={(isPending) => (
        <Button
          title="Citizen aus der Organisation entfernen"
          className={clsx(className, "h-auto")}
          disabled={isPending}
          variant="tertiary"
          type="submit"
        >
          {isPending ? <AsciiSpinner /> : <FaTrash />}
        </Button>
      )}
      title="Citizen aus der Organisation entfernen?"
      description="Willst du diesen Citizen aus der Organisation entfernen?"
      confirmLabel="Entfernen"
    />
  );
};
