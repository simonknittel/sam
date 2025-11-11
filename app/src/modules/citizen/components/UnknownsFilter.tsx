"use client";

import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ChangeEventHandler } from "react";

interface Props {
  readonly showDiscordId?: boolean;
  readonly showTeamspeakId?: boolean;
}

export const UnknownsFilter = ({
  showDiscordId = false,
  showTeamspeakId = false,
}: Props) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const defaultValues =
    searchParams
      .get("filters")
      ?.split(",")
      .filter((filter) => filter.startsWith("unknown-")) || [];

  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const newSearchParams = new URLSearchParams(window.location.search);

    let filters = newSearchParams.get("filters")?.split(",") || [];

    if (event.target.checked) {
      filters.push(event.target.value);
    } else {
      filters = filters.filter((filter) => filter !== event.target.value);
    }

    newSearchParams.set("filters", filters.join(","));

    router.push(`${pathname}?${newSearchParams.toString()}`);
  };

  return (
    <div className="flex flex-col items-start gap-2 px-4 py-2 rounded-secondary bg-neutral-800">
      <div className="flex justify-between items-center w-full gap-4">
        <label
          className="whitespace-nowrap cursor-pointer"
          htmlFor="unknown-handle"
        >
          Handles
        </label>
        <YesNoCheckbox
          id="unknown-handle"
          value="unknown-handle"
          onChange={handleChange}
          defaultChecked={defaultValues.includes(`unknown-handle`)}
          hideLabel
        />
      </div>

      {showDiscordId && (
        <div className="flex justify-between items-center w-full gap-4">
          <label
            className="whitespace-nowrap cursor-pointer"
            htmlFor="unknown-discord-id"
          >
            Discord IDs
          </label>
          <YesNoCheckbox
            id="unknown-discord-id"
            value="unknown-discord-id"
            onChange={handleChange}
            defaultChecked={defaultValues.includes(`unknown-discord-id`)}
            hideLabel
          />
        </div>
      )}

      {showTeamspeakId && (
        <div className="flex justify-between items-center w-full gap-4">
          <label
            className="whitespace-nowrap cursor-pointer"
            htmlFor="unknown-teamspeak-id"
          >
            TeamSpeak IDs
          </label>
          <YesNoCheckbox
            id="unknown-teamspeak-id"
            value="unknown-teamspeak-id"
            onChange={handleChange}
            defaultChecked={defaultValues.includes(`unknown-teamspeak-id`)}
            hideLabel
          />
        </div>
      )}
    </div>
  );
};
