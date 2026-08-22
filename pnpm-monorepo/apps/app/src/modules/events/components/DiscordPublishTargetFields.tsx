"use client";

import Note from "@/modules/common/components/Note";
import { RadioGroup } from "@/modules/common/components/form/RadioGroup";
import { Select } from "@/modules/common/components/form/Select";
import { TextInput } from "@/modules/common/components/form/TextInput";
import {
  DISCORD_EVENT_LOCATION_MAX_LENGTH,
  type PublishableGuildChannel,
} from "@/modules/discord/utils/guildScheduledEventPayload";
import { EventDiscordPublishTarget } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { useId, useState } from "react";
import { FaGlobe, FaMicrophone } from "react-icons/fa";

interface Props {
  readonly className?: string;
  /**
   * The guild's voice and stage channels, or null when Discord could not be
   * asked — the picker then says so instead of pretending the guild has
   * none.
   */
  readonly channels: readonly PublishableGuildChannel[] | null;
  readonly defaultTarget?: EventDiscordPublishTarget;
  readonly defaultChannelId?: string | null;
  readonly defaultLocation?: string | null;
  /** Shown as the location's placeholder, i.e. what an empty field means */
  readonly locationPlaceholder: string;
}

/**
 * Where the published event points on Discord. Discord only accepts a voice
 * or stage channel of the guild, or a free-text location for an "external"
 * event — the app's own event page by default.
 *
 * Only the fields of the selected target are rendered, so a submission never
 * carries a channel and a location at once.
 */
export const DiscordPublishTargetFields = ({
  className,
  channels,
  defaultTarget = EventDiscordPublishTarget.EXTERNAL,
  defaultChannelId,
  defaultLocation,
  locationPlaceholder,
}: Props) => {
  const [target, setTarget] = useState<string>(defaultTarget);
  const channelSelectId = useId();

  return (
    <div className={clsx(className)}>
      <RadioGroup
        name="discordPublishTarget"
        items={[
          {
            value: EventDiscordPublishTarget.EXTERNAL,
            label: "Externer Ort",
            icon: <FaGlobe />,
            hint: "Ein frei wählbarer Ort, standardmäßig der Link zum Event in dieser App.",
          },
          {
            value: EventDiscordPublishTarget.CHANNEL,
            label: "Sprachkanal",
            icon: <FaMicrophone />,
            hint: "Ein Sprach- oder Bühnenkanal des Discord-Servers.",
          },
        ]}
        value={target}
        onChange={setTarget}
      />

      {target === EventDiscordPublishTarget.CHANNEL &&
        (channels === null ? (
          <Note
            type="warning"
            message="Die Kanäle konnten nicht von Discord geladen werden. Versuche es später erneut oder wähle einen externen Ort."
            className="mt-2 max-w-none!"
          />
        ) : channels.length === 0 ? (
          <Note
            type="warning"
            message="Der Bot sieht keine Sprach- oder Bühnenkanäle auf dem Discord-Server."
            className="mt-2 max-w-none!"
          />
        ) : (
          <div className="mt-2">
            <label htmlFor={channelSelectId} className="mb-2 block">
              Kanal
            </label>

            <Select
              id={channelSelectId}
              name="discordPublishChannelId"
              defaultValue={defaultChannelId ?? undefined}
              required
            >
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name}
                </option>
              ))}
            </Select>
          </div>
        ))}

      {target === EventDiscordPublishTarget.EXTERNAL && (
        <TextInput
          name="discordPublishLocation"
          label="Ort"
          hint={`optional, max. ${DISCORD_EVENT_LOCATION_MAX_LENGTH} Zeichen. Leer lassen für den Link zum Event.`}
          maxLength={DISCORD_EVENT_LOCATION_MAX_LENGTH}
          placeholder={locationPlaceholder}
          defaultValue={defaultLocation ?? ""}
          className="mt-4"
        />
      )}
    </div>
  );
};
