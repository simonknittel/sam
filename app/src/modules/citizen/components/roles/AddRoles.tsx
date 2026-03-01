"use client";

import Button from "@/modules/common/components/Button";
import { TextInput } from "@/modules/common/components/form/TextInput";
import Modal from "@/modules/common/components/Modal";
import { type Entity, type Role, type Upload } from "@prisma/client";
import clsx from "clsx";
import Fuse, { type FuseResult } from "fuse.js";

import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BsExclamationOctagonFill } from "react-icons/bs";
import { FaPen, FaSpinner } from "react-icons/fa";
import { RoleCheckbox } from "./RoleCheckbox";
import { UpdateRolesForm } from "./UpdateRolesForm";

type RoleWithIcon = Role & { icon: Upload | null };

interface Props {
  readonly className?: string;
  readonly citizenId: Entity["id"];
  readonly assignedRoleIds: Role["id"][];
  readonly iconOnly?: boolean;
}

export const AddRoles = ({
  className,
  citizenId,
  assignedRoleIds,
  iconOnly = false,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const {
    isPending,
    data: assignableRoles,
    error,
  } = api.roles.getAssignableRoles.useQuery(undefined, {
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: isOpen,
  });

  const handleRequestClose = () => {
    setIsOpen(false);
    setQuery("");
    router.refresh();
  };

  const fuse = useMemo(() => {
    if (!assignableRoles) return null;
    return new Fuse<RoleWithIcon>(assignableRoles, {
      keys: ["name"],
      includeMatches: true,
      threshold: 0.2,
    });
  }, [assignableRoles]);

  const searchResults = useMemo(
    () => (query && fuse ? fuse.search(query) : []),
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
        {isPending && (
          <p className="font-mono uppercase flex gap-2 justify-center items-center animate-pulse">
            <FaSpinner className="animate-spin" />
            Rollen werden geladen...
          </p>
        )}

        {error && (
          <p className="font-mono uppercase flex gap-2 justify-center items-center text-red-500">
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
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                  className="hidden"
                />
              </div>
            </div>

            <UpdateRolesForm>
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
