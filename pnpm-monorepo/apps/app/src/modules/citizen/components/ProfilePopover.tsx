"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { api } from "@/trpc/react";
import type { Citizen } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import dynamic from "next/dynamic";
import { useState } from "react";
import { BsExclamationOctagonFill } from "react-icons/bs";

/**
 * Each citizen link and the account in the top bar have a popover, but the
 * profile shows only after the popover opens. Thus its code (for example the
 * role forms) loads only then, and not on each page.
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

/**
 * The state of a popover with the profile of a citizen: the data and the
 * code of the profile load only when the popover opens. Give `isOpen` and
 * `handleOpenChange` to the popover, and `query` to `ProfilePopoverContent`.
 */
export const useProfilePopover = (citizenId: Citizen["id"]) => {
  const [isOpen, setIsOpen] = useState(false);
  const query = api.citizens.getCitizenById.useQuery(
    { id: citizenId },
    {
      enabled: isOpen,
    },
  );

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);

    // Load the code of the profile at the same time as its data
    if (open) void loadProfileContent();
  };

  const popupClassName = clsx("w-100", {
    /** The whole popup celebrates with the citizen: the colour clouds of the
    surface, and an isolated box for the confetti behind the profile. */
    "relative isolate background-birthday":
      query.data?.citizen.hasBirthdayToday,
  });

  return { isOpen, handleOpenChange, popupClassName, query };
};

interface Props {
  readonly query: ReturnType<typeof useProfilePopover>["query"];
}

export const ProfilePopoverContent = ({ query }: Props) => {
  const { isPending, data, error, refetch } = query;

  const handleRoleAssignmentsChanged = () => {
    void refetch();
  };

  return (
    <>
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
    </>
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
