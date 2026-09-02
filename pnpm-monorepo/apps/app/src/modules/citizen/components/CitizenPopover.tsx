"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { PopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import { api } from "@/trpc/react";
import type { Entity } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { useCallback, useState, type ReactNode } from "react";
import { BsExclamationOctagonFill } from "react-icons/bs";
import { ProfileContent } from "./ProfileContent";

interface Props {
  readonly children?: ReactNode;
  readonly citizenId: Entity["id"];
}

export const CitizenPopover = ({ children, citizenId }: Props) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const { isPending, data, error, refetch } =
    api.citizens.getCitizenById.useQuery(
      { id: citizenId },
      {
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        enabled: isEnabled,
      },
    );

  const handleOpenChange = useCallback((open: boolean) => {
    setIsEnabled(open);
  }, []);

  const handleRoleAssignmentsChanged = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <PopoverBaseUI
      title="Citizen-Details"
      trigger={children}
      onOpenChange={handleOpenChange}
      childrenClassName={clsx("w-[400px]", {
        /** The whole popup celebrates with the citizen: the colour clouds
        of the surface, and an isolated box for the confetti behind the
        profile. */
        "background-birthday relative isolate": data?.citizen.hasBirthdayToday,
      })}
      hoverOnly
    >
      {isPending && (
        <p className="font-mono uppercase flex gap-2 justify-center items-center animate-pulse">
          <AsciiSpinner />
          Citizen wird geladen...
        </p>
      )}

      {error && (
        <p className="font-mono uppercase flex gap-2 justify-center items-center text-red-500">
          <BsExclamationOctagonFill className="text-red-800" />
          Fehler beim Laden des Citizens
        </p>
      )}

      {data && (
        <ProfileContent
          profile={data}
          onRoleAssignmentsChanged={handleRoleAssignmentsChanged}
        />
      )}
    </PopoverBaseUI>
  );
};
