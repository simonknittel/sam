"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { TextInput } from "@/modules/common/components/form/TextInput";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import { Tile, TileVariant } from "@/modules/common/components/Tile";
import { deleteEvent } from "@/modules/events/actions/deleteEvent";
import { updateEvent } from "@/modules/events/actions/updateEvent";
import { EventDescriptionTextarea } from "@/modules/events/components/EventDescriptionField";
import { EventDescriptionHint } from "@/modules/events/components/EventDescriptionHint";
import { EventDescriptionPreview } from "@/modules/events/components/EventDescriptionPreview";
import { useEventDescription } from "@/modules/events/hooks/useEventDescription";
import { type EventVisibility } from "@sam-monorepo/database/browser";
import { EVENT_NAME_MAX_LENGTH } from "@sam-monorepo/domain";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { FaSave, FaTrash } from "react-icons/fa";
import { SETTINGS_SECTIONS } from "../utils/settingsSections";
import { EventDateTimeField } from "./EventDateTimeField";
import { EventVisibilityFields } from "./EventVisibilityFields";

interface Props {
  readonly className?: string;
  readonly event: {
    readonly id: string;
    readonly name: string;
    readonly description: string | null;
    /** Europe/Berlin wall time in datetime-local format */
    readonly startTime: string;
    /** Europe/Berlin wall time in datetime-local format */
    readonly endTime: string;
    readonly visibility: EventVisibility;
    readonly visibilityRoleIds: string[];
  };
  /**
   * The tile of the participation and the application switches, rendered by
   * the page: it needs the count of the active sign-ups and the rules of the
   * positions
   */
  readonly participationTile: ReactNode;
  /**
   * The Discord publishing, rendered by the page: it needs a live channel
   * list from Discord and therefore stays a Server Component. The Discord
   * tile shows it above the preview of the description.
   */
  readonly discordPublishing: ReactNode;
  /**
   * The "Aktionen" tile, rendered by the page: its contents are permission
   * gated, and the page shows the same tile on events that are over — where
   * the settings form itself is gone.
   */
  readonly actionsTile?: ReactNode;
}

/**
 * The tiles of the settings page of an event. Each tile saves only its own
 * fields.
 */
export const EventSettings = ({
  className,
  event,
  participationTile,
  discordPublishing,
  actionsTile,
}: Props) => {
  const router = useRouter();
  /**
   * The errors show as toasts: the refresh after a conflict, for example an
   * event that a different manager deleted, can remove this form.
   */
  const { formAction, getDefaultValueWithFallback } = useAction(updateEvent);

  /** The preview of the description is only for Discord, thus it is in the Discord tile */
  const defaultDescription = getDefaultValueWithFallback(
    "description",
    event.description ?? "",
  );
  const { description, setDescription, textareaRef } =
    useEventDescription(defaultDescription);

  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      <Tile
        id={SETTINGS_SECTIONS.masterData.id}
        heading={SETTINGS_SECTIONS.masterData.label}
      >
        <form action={formAction}>
          <input type="hidden" name="eventId" value={event.id} />

          <TextInput
            name="name"
            label="Titel"
            maxLength={EVENT_NAME_MAX_LENGTH}
            defaultValue={getDefaultValueWithFallback("name", event.name)}
            required
          />

          <EventDescriptionTextarea
            hint={<EventDescriptionHint />}
            defaultValue={defaultDescription}
            description={description}
            onDescriptionChange={setDescription}
            ref={textareaRef}
            className="mt-4"
          />

          <div className="mt-4 flex flex-col gap-4 md:flex-row">
            <EventDateTimeField
              name="startTime"
              label="Start"
              defaultValue={getDefaultValueWithFallback(
                "startTime",
                event.startTime,
              )}
              className="flex-1"
              required
            />

            <EventDateTimeField
              name="endTime"
              label="Ende"
              defaultValue={getDefaultValueWithFallback(
                "endTime",
                event.endTime,
              )}
              className="flex-1"
              required
            />
          </div>

          <SubmitButton icon={<FaSave />} className="mt-4 ml-auto">
            Speichern
          </SubmitButton>
        </form>
      </Tile>

      <VisibilityTile event={event} />

      {participationTile}

      <Tile
        id={SETTINGS_SECTIONS.discord.id}
        heading={SETTINGS_SECTIONS.discord.label}
      >
        {discordPublishing}

        <EventDescriptionPreview
          description={description}
          eventId={event.id}
          className="mt-6"
        />
      </Tile>

      {actionsTile}

      <Tile
        id={SETTINGS_SECTIONS.dangerZone.id}
        heading={SETTINGS_SECTIONS.dangerZone.label}
        variant={TileVariant.Danger}
      >
        <ConfirmActionButton
          action={deleteEvent}
          hiddenFields={[{ name: "eventId", value: event.id }]}
          trigger={(isDeletePending) => (
            <Button2 type="submit" disabled={isDeletePending}>
              {isDeletePending ? <AsciiSpinner /> : <FaTrash />}
              Event löschen
            </Button2>
          )}
          title="Event löschen?"
          description={
            <>
              Willst du das Event{" "}
              <span className="font-bold">{event.name}</span> löschen?
            </>
          }
          confirmLabel="Löschen"
          onSuccess={() => router.push("/app/events")}
        />
      </Tile>
    </div>
  );
};

interface VisibilityTileProps {
  readonly event: Props["event"];
}

/** Its own form: `updateEvent()` changes only the fields that it gets */
const VisibilityTile = ({ event }: VisibilityTileProps) => {
  const { formAction } = useAction(updateEvent);
  const [visibility, setVisibility] = useState<string>(event.visibility);

  return (
    <Tile
      id={SETTINGS_SECTIONS.visibility.id}
      heading={SETTINGS_SECTIONS.visibility.label}
    >
      <form action={formAction}>
        <input type="hidden" name="eventId" value={event.id} />

        <EventVisibilityFields
          label="Sichtbarkeit"
          visibility={visibility}
          onVisibilityChange={setVisibility}
          defaultRoleIds={event.visibilityRoleIds}
        />

        <SubmitButton icon={<FaSave />} className="mt-4 ml-auto">
          Speichern
        </SubmitButton>
      </form>
    </Tile>
  );
};
