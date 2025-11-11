"use client";

import { env } from "@/env";
import Button from "@/modules/common/components/Button";
import { TextInput } from "@/modules/common/components/form/TextInput";
import Modal from "@/modules/common/components/Modal";
import { underlineCharacters } from "@/modules/common/utils/underlineCharacters";
import { type Entity, type Role, type Upload } from "@prisma/client";
import clsx from "clsx";
import Fuse, { type FuseResult } from "fuse.js";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaPen } from "react-icons/fa";
import { RoleCheckbox } from "./RoleCheckbox";
import { UpdateRolesForm } from "./UpdateRolesForm";

interface Props {
  readonly className?: string;
  readonly entity: Entity;
  readonly allRoles: (Role & {
    icon: Upload | null;
  })[];
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

  const fuse = new Fuse(allRoles, {
    keys: ["name"],
    includeMatches: true,
  });

  const filteredRoles = query
    ? fuse.search(query).map((result) => result)
    : allRoles.map((role) => ({ item: role, matches: [] as FuseResult<typeof role>["matches"] }));

  return (
    <>
      <Button
        variant="tertiary"
        onClick={() => setIsOpen(true)}
        className={clsx(className)}
        title="Bearbeiten"
      >
        <FaPen /> {!iconOnly && <>Bearbeiten</>}
      </Button>

      <Modal
        isOpen={isOpen}
        onRequestClose={handleRequestClose}
        className="w-[1280px]"
        heading={<h2>Bearbeiten</h2>}
      >
        <div className="mb-4 flex justify-center">
          <div className="w-full max-w-md">
            <TextInput
              label="Suche"
              placeholder="Rollenname eingeben..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
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
            {filteredRoles.map((result) => {
              const role = result.item;
              return (
                <div
                  key={role.id}
                  className="py-2 flex justify-between items-center break-inside-avoid-column"
                >
                  <span className="flex gap-2 items-center overflow-hidden">
                    {role.icon && (
                      <div className="flex-none aspect-square w-6 h-6 flex items-center justify-center rounded-secondary overflow-hidden">
                        <Image
                          src={`https://${env.NEXT_PUBLIC_R2_PUBLIC_URL}/${role.icon.id}`}
                          alt=""
                          width={24}
                          height={24}
                          className="max-w-full max-h-full"
                          unoptimized={["image/svg+xml", "image/gif"].includes(
                            role.icon.mimeType,
                          )}
                          loading="lazy"
                        />
                      </div>
                    )}

                    <span className="truncate">
                      {query && result.matches?.[0]
                        ? underlineCharacters(role.name, result.matches[0].indices)
                        : role.name}
                    </span>
                  </span>

                  <RoleCheckbox
                    role={role}
                    isChecked={assignedRoleIds.includes(role.id)}
                  />
                </div>
              );
            })}
          </div>
        </UpdateRolesForm>
      </Modal>
    </>
  );
};
