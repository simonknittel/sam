"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { useSubmitConfirmation } from "@/modules/common/components/AlertDialog";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { DiscordButton } from "@/modules/common/components/DiscordButton";
import Note from "@/modules/common/components/Note";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import { Tile } from "@/modules/common/components/Tile";
import { formatDate } from "@/modules/common/utils/formatDate";
import {
  getGuildScheduledEventPath,
  type PublishableGuildChannel,
} from "@/modules/discord/utils/guildScheduledEventPayload";
import { EventVisibility } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { FaDiscord, FaTrash } from "react-icons/fa";
import { publishEventToDiscord } from "../actions/publishEventToDiscord";
import { unpublishEventFromDiscord } from "../actions/unpublishEventFromDiscord";
import { DiscordPublishTargetFields } from "./DiscordPublishTargetFields";
import { RestrictedDiscordPublishDialog } from "./RestrictedDiscordPublishDialog";

interface Props {
  readonly className?: string;
  readonly event: {
    readonly id: string;
    readonly name: string;
    readonly visibility: EventVisibility;
    readonly discordPublishedId: string | null;
    readonly discordPublishedAt: Date | null;
    readonly discordPublishedChannelId: string | null;
    readonly discordPublishedLocation: string | null;
  };
  readonly channels: readonly PublishableGuildChannel[] | null;
  /** Prefilled into the location field, i.e. what an empty field means */
  readonly defaultLocation: string;
  /** Server-side env, needed to link to the event on Discord */
  readonly discordGuildId: string;
}

/**
 * Publishing the event to the Discord guild as a guild scheduled event.
 * While it is published, the app keeps title, description, times and cover
 * image in sync; participants stay separate on both sides.
 */
export const EventDiscordSettings = ({
  className,
  event,
  channels,
  defaultLocation,
  discordGuildId,
}: Props) => {
  if (event.discordPublishedId)
    return (
      <PublishedState
        className={className}
        event={event}
        channels={channels}
        discordPublishedId={event.discordPublishedId}
        discordGuildId={discordGuildId}
      />
    );

  return (
    <UnpublishedState
      className={className}
      event={event}
      channels={channels}
      defaultLocation={defaultLocation}
    />
  );
};

interface PublishedStateProps extends Pick<
  Props,
  "className" | "channels" | "discordGuildId"
> {
  readonly event: Props["event"];
  readonly discordPublishedId: string;
}

const PublishedState = ({
  className,
  event,
  channels,
  discordPublishedId,
  discordGuildId,
}: PublishedStateProps) => {
  /**
   * The channel list is only there to turn the stored id into a name; a
   * channel the bot can no longer see falls back to the raw id.
   */
  const location = event.discordPublishedChannelId
    ? `Sprachkanal: ${
        channels?.find(
          (channel) => channel.id === event.discordPublishedChannelId,
        )?.name ?? event.discordPublishedChannelId
      }`
    : event.discordPublishedLocation;

  return (
    <Tile heading="Discord" className={clsx(className)}>
      <Note
        type="success"
        message={
          <p>
            Das Event ist auf Discord veröffentlicht
            {event.discordPublishedAt
              ? ` (seit ${formatDate(event.discordPublishedAt)})`
              : ""}
            . Titel, Beschreibung, Zeitraum und Titelbild werden dort
            automatisch aktualisiert.
          </p>
        }
        className="max-w-none!"
      />

      <dl className="mt-4">
        <dt className="font-mono text-xs text-neutral-500 uppercase">Ort</dt>
        <dd className="wrap-break-word">{location}</dd>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <DiscordButton
          path={getGuildScheduledEventPath(discordGuildId, discordPublishedId)}
        />

        <ConfirmActionButton
          action={unpublishEventFromDiscord}
          hiddenFields={[{ name: "eventId", value: event.id }]}
          trigger={(isPending) => (
            <Button2
              type="submit"
              variant={Button2Variant.Secondary}
              disabled={isPending}
            >
              {isPending ? <AsciiSpinner /> : <FaTrash />}
              Von Discord entfernen
            </Button2>
          )}
          title="Von Discord entfernen?"
          description={
            <>
              Das Event <span className="font-bold">{event.name}</span> wird auf
              Discord gelöscht. Anmeldungen auf Discord gehen dabei verloren;
              das Event in dieser App bleibt bestehen.
            </>
          }
          confirmLabel="Entfernen"
        />
      </div>
    </Tile>
  );
};

interface UnpublishedStateProps extends Pick<
  Props,
  "className" | "channels" | "defaultLocation"
> {
  readonly event: Props["event"];
}

const UnpublishedState = ({
  className,
  event,
  channels,
  defaultLocation,
}: UnpublishedStateProps) => {
  /**
   * The errors show as toasts, not in the form: the error "already
   * published" refreshes the page, which then shows the published state.
   */
  const { formAction } = useAction(publishEventToDiscord);
  const restrictedConfirmation = useSubmitConfirmation(
    event.visibility === EventVisibility.RESTRICTED,
  );

  return (
    <Tile heading="Discord" className={clsx(className)}>
      <form action={formAction} onSubmit={restrictedConfirmation.onSubmit}>
        <input type="hidden" name="eventId" value={event.id} />

        <p className="text-sm text-neutral-500">
          Veröffentliche das Event als Termin auf dem Discord-Server. Titel,
          Beschreibung, Zeitraum und Titelbild werden danach automatisch
          aktualisiert; Anmeldungen werden nicht übertragen.
        </p>

        <DiscordPublishTargetFields
          channels={channels}
          locationPlaceholder={defaultLocation}
          className="mt-4"
        />

        <SubmitButton icon={<FaDiscord />} className="mt-4 ml-auto">
          Auf Discord veröffentlichen
        </SubmitButton>

        <RestrictedDiscordPublishDialog
          isOpen={restrictedConfirmation.isOpen}
          onClose={restrictedConfirmation.close}
          description={
            <>
              Das Event <span className="font-bold">{event.name}</span> ist in
              dieser App nur für ausgewählte Rollen sichtbar. Auf Discord sehen
              es alle Mitglieder des Servers — inklusive Titel, Beschreibung und
              Zeitraum.
            </>
          }
          confirmLabel="Trotzdem veröffentlichen"
        />
      </form>
    </Tile>
  );
};
