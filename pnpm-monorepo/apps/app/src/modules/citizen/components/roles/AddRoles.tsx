"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import { TextInput } from "@/modules/common/components/form/TextInput";
import Modal from "@/modules/common/components/Modal";
import type { BadgeRole } from "@/modules/roles/queries/getRoles";
import { type Citizen, type Role } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import Fuse, { type FuseResult } from "fuse.js";

import { api } from "@/trpc/react";
import { useState } from "react";
import { BsExclamationOctagonFill } from "react-icons/bs";
import { FaPen } from "react-icons/fa";
import { RoleCheckbox } from "./RoleCheckbox";
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
  const [query, setQuery] = useState("");
  const {
    isPending,
    data: assignableRoles,
    error,
  } = api.roles.getAssignableRoles.useQuery(undefined, {
    enabled: isOpen,
  });

  const handleRequestClose = () => {
    setIsOpen(false);
    setQuery("");
  };

  const fuse = assignableRoles
    ? new Fuse<BadgeRole>(assignableRoles, {
        keys: ["name"],
        includeMatches: true,
        threshold: 0.2,
      })
    : null;

  const searchResults = query && fuse ? fuse.search(query) : [];

  const resultsById = new Map<Role["id"], FuseResult<BadgeRole>>(
    searchResults.map((result) => [result.item.id, result] as const),
  );

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
        onRequestClose={handleRequestClose}
        className="w-7xl"
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
          <>
            <div className="mb-4 flex justify-center border-b border-b-neutral-700 px-4 pb-4">
              <div className="w-full max-w-md text-center">
                <TextInput
                  label="Suche"
                  placeholder="Rolle suchen..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  autoFocus
                  className="hidden"
                />
              </div>
            </div>

            <UpdateRolesForm onSaved={onSaved}>
              <input type="hidden" name="citizenId" value={citizenId} />

              <div
                className="columns-3xs gap-8"
                style={{
                  columnRule: "1px solid #404040", // neutral-700
                }}
              >
                {assignableRoles?.map((role) => {
                  const result = resultsById.get(role.id);

                  return (
                    <RoleCheckbox
                      key={role.id}
                      role={role}
                      isChecked={assignedRoleIds.includes(role.id)}
                      isVisible={query ? result !== undefined : true}
                      match={result?.matches?.[0]}
                      query={query}
                    />
                  );
                })}
              </div>
            </UpdateRolesForm>
          </>
        )}
      </Modal>
    </>
  );
};
