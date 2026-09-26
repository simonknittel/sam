"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { PopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import { api } from "@/trpc/react";
import type { Entity } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import dynamic from "next/dynamic";
import { useCallback, useState, type ReactNode } from "react";
import { BsExclamationOctagonFill } from "react-icons/bs";

/**
 * Each citizen link has a popover, but the profile shows only after a hover.
 * Thus its code (for example the role forms) loads only then, and not on
 * each page with a citizen link.
 */
const ProfileContent = dynamic(
  () => import("./ProfileContent").then((mod) => mod.ProfileContent),
  { loading: () => <ProfileLoading /> },
);

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
        enabled: isEnabled,
      },
    );

  const handleOpenChange = useCallback((open: boolean) => {
    setIsEnabled(open);

    // Load the code of the profile at the same time as its data
    if (open) void import("./ProfileContent");
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
      {isPending && <ProfileLoading />}

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

const ProfileLoading = () => {
  return (
    <p className="font-mono uppercase flex gap-2 justify-center items-center animate-pulse">
      <AsciiSpinner />
      Citizen wird geladen...
    </p>
  );
};
