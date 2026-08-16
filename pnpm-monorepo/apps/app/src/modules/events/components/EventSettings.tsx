"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { RadioGroup } from "@/modules/common/components/form/RadioGroup";
import { Textarea } from "@/modules/common/components/form/Textarea";
import { TextInput } from "@/modules/common/components/form/TextInput";
import { Link } from "@/modules/common/components/Link";
import { deleteEvent } from "@/modules/events/actions/deleteEvent";
import { updateEvent } from "@/modules/events/actions/updateEvent";
import { WikiRoleSelector } from "@/modules/wiki/components/WikiRoleSelector";
import { EventVisibility } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaGlobe, FaLock, FaSave, FaTrash } from "react-icons/fa";
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
}

export const EventSettings = ({ className, event }: Props) => {
  const router = useRouter();
  const { state, formAction, isPending, getDefaultValueWithFallback } =
    useAction(updateEvent, {
      errorToast: false,
    });
  const [visibility, setVisibility] = useState<string>(event.visibility);

  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      <section className="rounded-primary bg-neutral-800/50 p-4">
        <h2 className="font-bold mb-2 text-lg font-mono uppercase">
          Event bearbeiten
        </h2>

        <form action={formAction}>
          <input type="hidden" name="eventId" value={event.id} />

          <TextInput
            name="name"
            label="Titel"
            maxLength={128}
            defaultValue={getDefaultValueWithFallback("name", event.name)}
            required
          />

          <Textarea
            name="description"
            label="Beschreibung"
            hint={
              <>
                optional, max. 2.000 Zeichen,{" "}
                <Link
                  href="https://github.github.com/gfm/"
                  target="_blank"
                  className="text-brand-red-500 hover:text-brand-red-300 focus-visible:text-brand-red-300"
                >
                  GitHub Flavored Markdown-Support
                </Link>
              </>
            }
            maxLength={2000}
            defaultValue={getDefaultValueWithFallback(
              "description",
              event.description ?? "",
            )}
            className="mt-4"
            classNameTextarea="h-40"
          />

          <EventDateTimeField
            name="startTime"
            label="Start"
            defaultValue={getDefaultValueWithFallback(
              "startTime",
              event.startTime,
            )}
            className="mt-4"
            required
          />

          <EventDateTimeField
            name="endTime"
            label="Ende"
            defaultValue={getDefaultValueWithFallback("endTime", event.endTime)}
            className="mt-4"
            required
          />

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
      </section>

      <section className="rounded-primary bg-neutral-800/50 p-4">
        <h2 className="font-bold mb-2 text-lg font-mono uppercase">
          Event löschen
        </h2>

        <p className="mb-4">
          Das Event verschwindet aus allen Listen und ist nicht mehr aufrufbar.
        </p>

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
      </section>
    </div>
  );
};
