"use client";

import Button from "@/modules/common/components/Button";
import { TextInput } from "@/modules/common/components/form/TextInput";
import Modal from "@/modules/common/components/Modal";
import { type Entity, type Role, type Upload } from "@prisma/client";
import clsx from "clsx";
import Fuse, { type FuseResult } from "fuse.js";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { FaPen } from "react-icons/fa";
import { RoleCheckbox } from "./RoleCheckbox";
import { UpdateRolesForm } from "./UpdateRolesForm";

type RoleWithIcon = Role & { icon: Upload | null };

interface Props {
  readonly className?: string;
  readonly entity: Entity;
  readonly allRoles: RoleWithIcon[];
  readonly assignedRoleIds: Role["id"][];
  readonly iconOnly?: boolean;
}

export const AddRoles = ({
  className,
  entity,
  allRoles,
  assignedRoleIds,
  iconOnly = false,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleRequestClose = () => {
    setIsOpen(false);
    setQuery("");
    router.refresh();
  };

  const fuse = useMemo(
    () =>
      new Fuse<RoleWithIcon>(allRoles, {
        keys: ["name"],
        includeMatches: true,
        threshold: 0.2,
      }),
    [allRoles],
  );

  const searchResults = useMemo(
    () => (query ? fuse.search(query) : []),
    [fuse, query],
  );

  const resultsById = useMemo(
    () =>
      new Map<Role["id"], FuseResult<RoleWithIcon>>(
        searchResults.map((result) => [result.item.id, result] as const),
      ),
    [searchResults],
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
        className="w-[1280px]"
        heading={<h2>Rollen hinzufügen oder entfernen</h2>}
      >
        <div className="mb-4 flex justify-center border-b border-b-neutral-700 px-4 pb-4">
          <div className="w-full max-w-md text-center">
            <TextInput
              label="Suche"
              placeholder="Rolle suchen..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="hidden"
            />
          </div>
        </div>

        <UpdateRolesForm>
          <input type="hidden" name="citizenId" value={entity.id} />

          <div
            className="columns-3xs gap-8"
            style={{
              columnRule: "1px solid #404040", // neutral-700
            }}
          >
            {allRoles.map((role) => {
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
      </Modal>
    </>
  );
};
