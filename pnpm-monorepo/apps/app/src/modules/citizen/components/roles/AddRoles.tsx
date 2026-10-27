"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import Modal from "@/modules/common/components/Modal";
import { type Citizen, type Role } from "@sam-monorepo/database/browser";
import clsx from "clsx";

import { api } from "@/trpc/react";
import { useState } from "react";
import { BsExclamationOctagonFill } from "react-icons/bs";
import { FaPen } from "react-icons/fa";
import { UpdateRolesForm } from "./UpdateRolesForm";

interface Props {
  readonly className?: string;
  readonly citizenId: Citizen["id"];
  readonly assignedRoleIds: Role["id"][];
  readonly iconOnly?: boolean;
  /**
   * Runs after each save of the role assignments. The save refreshes the
   * page, but not the data that the client loaded itself.
   */
  readonly onSaved?: () => void;
}

export const AddRoles = ({
  className,
  citizenId,
  assignedRoleIds,
  iconOnly = false,
  onSaved,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    isPending,
    data: assignableRoles,
    error,
  } = api.roles.getAssignableRoles.useQuery(undefined, {
    enabled: isOpen,
  });

  return (
    <>
      <Button
        variant="tertiary"
        onClick={() => setIsOpen(true)}
        className={clsx(className)}
        title="Rollen hinzufügen oder entfernen"
      >
        <FaPen /> {!iconOnly && <>Bearbeiten</>}
      </Button>

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        className="w-120"
        heading={<h2>Rollen hinzufügen oder entfernen</h2>}
      >
        {isPending && (
          <p className="flex animate-pulse items-center justify-center gap-2 font-mono uppercase">
            <AsciiSpinner />
            Rollen werden geladen...
          </p>
        )}

        {error && (
          <p className="flex items-center justify-center gap-2 font-mono text-red-500 uppercase">
            <BsExclamationOctagonFill className="text-red-800" />
            Fehler beim Laden der Rollen
          </p>
        )}

        {assignableRoles && (
          <UpdateRolesForm
            citizenId={citizenId}
            assignedRoleIds={assignedRoleIds}
            assignableRoles={assignableRoles}
            onSaved={onSaved}
          />
        )}
      </Modal>
    </>
  );
};
