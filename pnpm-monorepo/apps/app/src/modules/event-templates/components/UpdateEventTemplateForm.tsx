"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import { DiscordFormattingHint } from "@/modules/common/components/form/DiscordFormattingHint";
import { RadioGroup } from "@/modules/common/components/form/RadioGroup";
import { Textarea } from "@/modules/common/components/form/Textarea";
import { TextInput } from "@/modules/common/components/form/TextInput";
import { YesNoCheckbox } from "@/modules/common/components/form/YesNoCheckbox";
import type { PublishableGuildChannel } from "@/modules/discord/utils/guildScheduledEventPayload";
import { DiscordPublishTargetFields } from "@/modules/events/components/DiscordPublishTargetFields";
import { EventCoverImageField } from "@/modules/events/components/EventCoverImageField";
import { WikiRoleSelector } from "@/modules/wiki/components/WikiRoleSelector";
import {
  EventVisibility,
  type EventDiscordPublishTarget,
} from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { useId, useState } from "react";
import { FaGlobe, FaLock, FaSave } from "react-icons/fa";
import { updateEventTemplate } from "../actions/updateEventTemplate";
import {
  EVENT_TEMPLATE_DESCRIPTION_MAX_LENGTH,
  EVENT_TEMPLATE_NAME_MAX_LENGTH,
} from "../utils/eventTemplateConstraints";

interface Props {
  readonly className?: string;
  readonly template: {
    readonly id: string;
    readonly name: string;
    readonly description: string | null;
    readonly coverImageId: string | null;
    readonly visibility: EventVisibility;
    readonly visibilityRoleIds: readonly string[];
    readonly discordPublishTarget: EventDiscordPublishTarget | null;
    readonly discordPublishChannelId: string | null;
    readonly discordPublishLocation: string | null;
  };
  /**
   * The guild's voice and stage channels, loaded by the page — null when
   * Discord could not be asked.
   */
  readonly channels: readonly PublishableGuildChannel[] | null;
}

/**
 * The template's own data plus everything it prefills into a new event. The
 * visibility here describes the future event, not who may see the template —
 * that is the Freigabe tab.
 */
export const UpdateEventTemplateForm = ({
  className,
  template,
  channels,
}: Props) => {
  const { state, formAction, isPending } = useAction(updateEventTemplate, {
    errorToast: false,
  });
  const [visibility, setVisibility] = useState<string>(template.visibility);
  const [isPublishing, setIsPublishing] = useState(
    template.discordPublishTarget !== null,
  );
  const discordCheckboxId = useId();

  return (
    <form action={formAction} className={clsx(className)}>
      <input type="hidden" name="templateId" value={template.id} />

      <TextInput
        name="name"
        label="Name"
        hint="Benennt die Vorlage und wird als Titel in das Event übernommen."
        maxLength={EVENT_TEMPLATE_NAME_MAX_LENGTH}
        defaultValue={template.name}
        required
      />

      <Textarea
        name="description"
        label="Kurzbeschreibung"
        hint={
          <>
            optional, max. 1.000 Zeichen. <DiscordFormattingHint />. Wird als
            Kurzbeschreibung in das Event übernommen.
          </>
        }
        maxLength={EVENT_TEMPLATE_DESCRIPTION_MAX_LENGTH}
        defaultValue={template.description ?? ""}
        className="mt-4"
        classNameTextarea="h-40"
      />

      <EventCoverImageField
        name="coverImageId"
        defaultUploadId={template.coverImageId}
        emptyValue=""
        className="mt-4"
      />

      <p className="mt-4">Sichtbarkeit des Events</p>
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
          defaultValue={[...template.visibilityRoleIds]}
          className="mt-2"
        />
      )}

      <label htmlFor={discordCheckboxId} className="mt-4 block">
        Auf Discord veröffentlichen
      </label>
      <p className="text-xs mt-1 text-white/40">
        Events aus dieser Vorlage werden zusätzlich als Termin auf dem
        Discord-Server angelegt.
      </p>

      <YesNoCheckbox
        id={discordCheckboxId}
        className="mt-2"
        checked={isPublishing}
        onChange={(changeEvent) => setIsPublishing(changeEvent.target.checked)}
      />

      {isPublishing && (
        <DiscordPublishTargetFields
          channels={channels}
          defaultTarget={template.discordPublishTarget ?? undefined}
          defaultChannelId={template.discordPublishChannelId}
          defaultLocation={template.discordPublishLocation}
          locationPlaceholder="Link zum Event in dieser App"
          className="mt-2"
        />
      )}

      <Button2 type="submit" disabled={isPending} className="mt-4 ml-auto">
        {isPending ? <AsciiSpinner /> : <FaSave />}
        Speichern
      </Button2>

      <ActionErrorNote className="mt-4" state={state} />
    </form>
  );
};
