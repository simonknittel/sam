"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { PopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import { api } from "@/trpc/react";
import type { Citizen } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";
import { BsExclamationOctagonFill } from "react-icons/bs";

/**
 * Each citizen link has a popover, but the profile shows only after a hover.
 * Thus its code (for example the role forms) loads only then, and not on
 * each page with a citizen link.
 *
 * `dynamic()` and the preload on open use the same loader. With a second
 * `import()`, the build makes a second chunk with the same code, and the
 * browser loads both. The React Compiler does not compile a component with
 * an `import()`, thus the loader is outside of the component.
 */
const loadProfileContent = () =>
  import("./ProfileContent").then((module) => module.ProfileContent);

const ProfileContent = dynamic(loadProfileContent, {
  loading: () => <ProfileLoading />,
});

interface Props {
  readonly children?: ReactNode;
  readonly citizenId: Citizen["id"];
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

  const handleOpenChange = (open: boolean) => {
    setIsEnabled(open);

    // Load the code of the profile at the same time as its data
    if (open) void loadProfileContent();
  };

  const handleRoleAssignmentsChanged = () => {
    void refetch();
  };

  return (
    <PopoverBaseUI
      title="Citizen-Details"
      trigger={children}
      onOpenChange={handleOpenChange}
      childrenClassName={clsx("w-100", {
        /** The whole popup celebrates with the citizen: the colour clouds
        of the surface, and an isolated box for the confetti behind the
        profile. */
        "relative isolate background-birthday": data?.citizen.hasBirthdayToday,
      })}
      hoverOnly
    >
      {isPending && <ProfileLoading />}

      {error && (
        <p className="flex items-center justify-center gap-2 font-mono text-red-500 uppercase">
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
    <p className="flex animate-pulse items-center justify-center gap-2 font-mono uppercase">
      <AsciiSpinner />
      Citizen wird geladen...
    </p>
  );
};
