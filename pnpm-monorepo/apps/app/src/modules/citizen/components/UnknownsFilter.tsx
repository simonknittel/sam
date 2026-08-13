"use client";

import { FilterCheckboxList } from "@/modules/common/components/FilterCheckboxList";

interface Props {
  readonly showDiscordId?: boolean;
  readonly showTeamspeakId?: boolean;
}

export const UnknownsFilter = ({
  showDiscordId = false,
  showTeamspeakId = false,
}: Props) => {
  return (
    <FilterCheckboxList
      className="items-start"
      prefix="unknown"
      items={[
        { id: "handle", label: "Handles" },
        ...(showDiscordId ? [{ id: "discord-id", label: "Discord IDs" }] : []),
        ...(showTeamspeakId
          ? [{ id: "teamspeak-id", label: "TeamSpeak IDs" }]
          : []),
      ]}
    />
  );
};
