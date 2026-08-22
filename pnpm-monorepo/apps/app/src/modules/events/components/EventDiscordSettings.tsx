"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/modules/common/components/AlertDialog";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { DiscordButton } from "@/modules/common/components/DiscordButton";
import Note from "@/modules/common/components/Note";
import { Tile } from "@/modules/common/components/Tile";
import { formatDate } from "@/modules/common/utils/formatDate";
import type { PublishableGuildChannel } from "@/modules/discord/utils/guildScheduledEventPayload";
import { EventVisibility } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { useId } from "react";
import { FaDiscord, FaTrash } from "react-icons/fa";
import { publishEventToDiscord } from "../actions/publishEventToDiscord";
import { unpublishEventFromDiscord } from "../actions/unpublishEventFromDiscord";
import { DiscordPublishTargetFields } from "./DiscordPublishTargetFields";

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
        <dt className="text-neutral-500 font-mono uppercase text-xs">Ort</dt>
        <dd className="break-words">{location}</dd>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <DiscordButton
          path={`events/${discordGuildId}/${discordPublishedId}`}
        />

        <ConfirmActionButton
          action={unpublishEventFromDiscord}
          hiddenFields={[{ name: "eventId", value: event.id }]}
          trigger={(isPending) => (
            <Button2
              type="button"
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
  const { state, formAction, isPending } = useAction(publishEventToDiscord, {
    errorToast: false,
  });
  const formId = useId();
  const isRestricted = event.visibility === EventVisibility.RESTRICTED;

  return (
    <Tile heading="Discord" className={clsx(className)}>
      <form action={formAction} id={formId}>
        <input type="hidden" name="eventId" value={event.id} />

        <p className="text-neutral-500 text-sm">
          Veröffentliche das Event als Termin auf dem Discord-Server. Titel,
          Beschreibung, Zeitraum und Titelbild werden danach automatisch
          aktualisiert; Anmeldungen werden nicht übertragen.
        </p>

        <DiscordPublishTargetFields
          channels={channels}
          locationPlaceholder={defaultLocation}
          className="mt-4"
        />

        {isRestricted ? (
          <RestrictedPublishConfirmation
            formId={formId}
            isPending={isPending}
            eventName={event.name}
          />
        ) : (
          <Button2 type="submit" disabled={isPending} className="mt-4 ml-auto">
            {isPending ? <AsciiSpinner /> : <FaDiscord />}
            Auf Discord veröffentlichen
          </Button2>
        )}

        <ActionErrorNote className="mt-4" state={state} />
      </form>
    </Tile>
  );
};

interface RestrictedPublishConfirmationProps {
  readonly formId: string;
  readonly isPending: boolean;
  readonly eventName: string;
}

/**
 * A restricted event is visible to selected roles in the app but to the
 * whole guild on Discord, so publishing one takes an explicit confirmation.
 */
const RestrictedPublishConfirmation = ({
  formId,
  isPending,
  eventName,
}: RestrictedPublishConfirmationProps) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button2 type="button" disabled={isPending} className="mt-4 ml-auto">
        {isPending ? <AsciiSpinner /> : <FaDiscord />}
        Auf Discord veröffentlichen
      </Button2>
    </AlertDialogTrigger>

    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          Eingeschränktes Event veröffentlichen?
        </AlertDialogTitle>
        <AlertDialogDescription>
          Das Event <span className="font-bold">{eventName}</span> ist in dieser
          App nur für ausgewählte Rollen sichtbar. Auf Discord sehen es alle
          Mitglieder des Servers — inklusive Titel, Beschreibung und Zeitraum.
        </AlertDialogDescription>
      </AlertDialogHeader>

      <AlertDialogFooter>
        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
        <AlertDialogAction type="submit" form={formId}>
          Trotzdem veröffentlichen
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
