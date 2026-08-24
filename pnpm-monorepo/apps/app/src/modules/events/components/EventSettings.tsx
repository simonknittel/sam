"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { RadioGroup } from "@/modules/common/components/form/RadioGroup";
import { Textarea } from "@/modules/common/components/form/Textarea";
import { TextInput } from "@/modules/common/components/form/TextInput";
import { Tile, TileVariant } from "@/modules/common/components/Tile";
import { deleteEvent } from "@/modules/events/actions/deleteEvent";
import { updateEvent } from "@/modules/events/actions/updateEvent";
import { EventDescriptionHint } from "@/modules/events/components/EventDescriptionHint";
import { WikiRoleSelector } from "@/modules/wiki/components/WikiRoleSelector";
import { EventVisibility } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { FaGlobe, FaLock, FaSave, FaTrash } from "react-icons/fa";
import {
  EVENT_DESCRIPTION_MAX_LENGTH,
  EVENT_NAME_MAX_LENGTH,
} from "../utils/eventConstraints";
import { EventDateTimeField } from "./EventDateTimeField";

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
   * The Discord publishing card, rendered by the page: it needs a live
   * channel list from Discord and therefore stays a Server Component.
   */
  readonly discordCard?: ReactNode;
}

export const EventSettings = ({ className, event, discordCard }: Props) => {
  const router = useRouter();
  const { state, formAction, isPending, getDefaultValueWithFallback } =
    useAction(updateEvent, {
      errorToast: false,
    });
  const [visibility, setVisibility] = useState<string>(event.visibility);

  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      <Tile heading="Event bearbeiten">
        <form action={formAction}>
          <input type="hidden" name="eventId" value={event.id} />

          <TextInput
            name="name"
            label="Titel"
            maxLength={EVENT_NAME_MAX_LENGTH}
            defaultValue={getDefaultValueWithFallback("name", event.name)}
            required
          />

          <Textarea
            name="description"
            label="Kurzbeschreibung"
            hint={<EventDescriptionHint />}
            maxLength={EVENT_DESCRIPTION_MAX_LENGTH}
            defaultValue={getDefaultValueWithFallback(
              "description",
              event.description ?? "",
            )}
            className="mt-4"
            classNameTextarea="h-40"
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

          <p className="mt-4">Sichtbarkeit</p>
          <RadioGroup
            name="visibility"
            items={[
              {
                value: EventVisibility.PUBLIC,
                label: "Öffentlich",
                icon: <FaGlobe />,
                hint: "Alle mit Events-Berechtigung können das Event sehen.",
              },
              {
                value: EventVisibility.RESTRICTED,
                label: "Eingeschränkt",
                icon: <FaLock />,
                hint: "Nur ausgewählte Rollen sowie die Organisatoren können das Event sehen.",
              },
            ]}
            value={visibility}
            onChange={setVisibility}
            className="mt-2"
          />

          {visibility === EventVisibility.RESTRICTED && (
            <WikiRoleSelector
              inputName="visibilityRole[]"
              defaultValue={event.visibilityRoleIds}
              className="mt-2"
            />
          )}

          <Button2 type="submit" disabled={isPending} className="mt-4 ml-auto">
            {isPending ? <AsciiSpinner /> : <FaSave />}
            Speichern
          </Button2>

          <ActionErrorNote className="mt-4" state={state} />
        </form>
      </Tile>

      {discordCard}

      <Tile heading="Danger Zone" variant={TileVariant.Danger}>
        <ConfirmActionButton
          action={deleteEvent}
          hiddenFields={[{ name: "eventId", value: event.id }]}
          trigger={(isDeletePending) => (
            <Button2 type="button" disabled={isDeletePending}>
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
