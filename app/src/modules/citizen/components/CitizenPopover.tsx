"use client";

import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import { CopyToClipboard } from "@/modules/common/components/CopyToClipboard";
import { Link } from "@/modules/common/components/Link";
import { PopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import { SingleRoleBadge } from "@/modules/roles/components/SingleRoleBadge";
import { api } from "@/trpc/react";
import type { Entity } from "@prisma/client";
import { useCallback, useState, type ReactNode } from "react";
import { BsExclamationOctagonFill } from "react-icons/bs";
import { FaSpinner } from "react-icons/fa";
import { AddRoles } from "./roles/AddRoles";

interface Props {
  readonly children?: ReactNode;
  readonly citizenId: Entity["id"];
}

export const CitizenPopover = ({ children, citizenId }: Props) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const { isPending, data, error } = api.citizens.getCitizenById.useQuery(
    { id: citizenId },
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      enabled: isEnabled,
    },
  );
  const authentication = useAuthentication();
  const isCitizenCurrentUser =
    authentication && authentication.session.entity
      ? citizenId === authentication.session.entity.id
      : false;

  const handleOpenChange = useCallback((open: boolean) => {
    setIsEnabled(open);
  }, []);

  return (
    <PopoverBaseUI
      trigger={children}
      onOpenChange={handleOpenChange}
      childrenClassName="w-[400px]"
    >
      {isPending && (
        <p className="font-mono uppercase flex gap-2 justify-center items-center animate-pulse">
          <FaSpinner className="animate-spin" />
          Citizen wird geladen...
        </p>
      )}

      {error && (
        <p className="font-mono uppercase flex gap-2 justify-center items-center text-red-500">
          <BsExclamationOctagonFill className="text-red-800" />
          Fehler beim Laden des Citizens
        </p>
      )}

      {data?.citizen && (
        <>
          <div className="pb-2">
            <p className="opacity-50 font-mono uppercase text-xs">Citizen</p>

            <p
              className="font-mono uppercase text-lg font-bold flex items-center gap-2"
              title={data.citizen.handle || data.citizen.id}
            >
              {isCitizenCurrentUser && (
                <>
                  <span
                    className="inline-block rounded-full size-3 bg-green-500 relative"
                    title="Dies bist du"
                  >
                    <span className="absolute inline-block rounded-full size-3 bg-green-500 animate-ping motion-reduce:hidden" />
                  </span>{" "}
                </>
              )}
              {data.citizen.handle || data.citizen.id}
              <CopyToClipboard value={data.citizen.handle || data.citizen.id} />
            </p>

            <Link
              href={`/app/spynet/citizen/${data.citizen.id}`}
              className="text-interaction-500 hover:underline focus-visible:underline font-mono uppercase text-xs"
              prefetch={false}
            >
              Spynet öffnen
            </Link>
          </div>

          <div className="border-t border-neutral-700 pt-2">
            <div className="flex flex-wrap gap-1">
              {data.citizen.roleAssignments.map((roleAssignment) => (
                <SingleRoleBadge
                  key={roleAssignment.roleId}
                  roleId={roleAssignment.roleId}
                  citizenId={data.citizen.id}
                />
              ))}
            </div>

            {data.canUpdateAnyRoleAssignment && (
              <AddRoles
                citizenId={data.citizen.id}
                assignedRoleIds={data.citizen.roleAssignments.map(
                  (role) => role.roleId,
                )}
                className="mt-1"
              />
            )}
          </div>

          {/* TODO: Show active organization memberships */}
          {/* <div className="border-t border-neutral-700 pt-2">Organisationen</div> */}
        </>
      )}
    </PopoverBaseUI>
  );
};
