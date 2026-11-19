"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import { TextInput } from "@/modules/common/components/form/TextInput";
import { YesNoCheckbox } from "@/modules/common/components/form/YesNoCheckbox";
import type { TableOfContentsItem } from "@/modules/common/components/layouts/SidebarLayout/TableOfContents";
import { Tile } from "@/modules/common/components/Tile";
import { EventTemplateDescriptionHint } from "@/modules/event-templates/components/EventTemplateDescriptionHint";
import { DiscordPublishTargetFields } from "@/modules/events/components/DiscordPublishTargetFields";
import { EventCoverImageField } from "@/modules/events/components/EventCoverImageField";
import { EventDescriptionTextarea } from "@/modules/events/components/EventDescriptionField";
import { EventDescriptionPreview } from "@/modules/events/components/EventDescriptionPreview";
import { EventSwitchField } from "@/modules/events/components/EventSwitchField";
import { EventVisibilityFields } from "@/modules/events/components/EventVisibilityFields";
import { useEventDescription } from "@/modules/events/hooks/useEventDescription";
import { SETTINGS_SECTIONS } from "@/modules/events/utils/settingsSections";
import type {
  EventDiscordPublishTarget,
  EventVisibility,
} from "@sam-monorepo/database/browser";
import type { PublishableGuildChannel } from "@sam-monorepo/domain";
import {
  useId,
  useState,
  type FormEventHandler,
  type ReactNode,
  type Ref,
} from "react";
import { FaSave } from "react-icons/fa";
import { updateEventTemplate } from "../actions/updateEventTemplate";
import { updateEventTemplateDiscordPublishing } from "../actions/updateEventTemplateDiscordPublishing";
import { updateEventTemplateParticipation } from "../actions/updateEventTemplateParticipation";
import { EVENT_TEMPLATE_NAME_MAX_LENGTH } from "../utils/eventTemplateConstraints";

interface Template {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly coverImageId: string | null;
  readonly visibility: EventVisibility;
  readonly visibilityRoleIds: readonly string[];
  readonly participationEnabled: boolean;
  readonly applicationRequired: boolean;
  readonly discordPublishTarget: EventDiscordPublishTarget | null;
  readonly discordPublishChannelId: string | null;
  readonly discordPublishLocation: string | null;
}

interface Props {
  readonly template: Template;
  /**
   * The guild's voice and stage channels, loaded by the page — null when
   * Discord could not be asked.
   */
  readonly channels: readonly PublishableGuildChannel[] | null;
}

/**
 * The tiles of the template's own data and of everything it prefills into a
 * new event. Each tile saves only its own fields.
 *
 * The errors of the forms show as toasts: the refresh after a conflict, for
 * example a template that a different user deleted, can remove the forms.
 * The forms are controlled, thus they send with `submitWithoutReset`: React
 * puts a form with an `action` back to its default values after the action.
 */
export const EventTemplateSettings = ({ template, channels }: Props) => {
  /** The preview of the description is only for Discord, thus it is in the Discord tile */
  const { description, setDescription, textareaRef } = useEventDescription(
    template.description ?? "",
  );

  return (
    <>
      <MasterDataTile
        template={template}
        description={description}
        onDescriptionChange={setDescription}
        textareaRef={textareaRef}
      />

      <VisibilityTile template={template} />

      <ParticipationTile template={template} />

      <DiscordTile
        template={template}
        channels={channels}
        description={description}
      />
    </>
  );
};

interface MasterDataTileProps {
  readonly template: Template;
  readonly description: string;
  readonly onDescriptionChange: (description: string) => void;
  readonly textareaRef: Ref<HTMLTextAreaElement>;
}

const MasterDataTile = ({
  template,
  description,
  onDescriptionChange,
  textareaRef,
}: MasterDataTileProps) => {
  const { isPending, submitWithoutReset } = useAction(updateEventTemplate);

  return (
    <SettingsFormTile
      section={SETTINGS_SECTIONS.masterData}
      templateId={template.id}
      isPending={isPending}
      onSubmit={submitWithoutReset}
    >
      <TextInput
        name="name"
        label="Name"
        hint="Benennt die Vorlage und wird als Titel in das Event übernommen."
        maxLength={EVENT_TEMPLATE_NAME_MAX_LENGTH}
        defaultValue={template.name}
        required
      />

      <EventDescriptionTextarea
        hint={<EventTemplateDescriptionHint />}
        defaultValue={template.description ?? ""}
        description={description}
        onDescriptionChange={onDescriptionChange}
        ref={textareaRef}
        className="mt-4"
      />

      <EventCoverImageField
        name="coverImageId"
        defaultUploadId={template.coverImageId}
        emptyValue=""
        className="mt-4"
      />
    </SettingsFormTile>
  );
};

interface TemplateTileProps {
  readonly template: Template;
}

/**
 * The visibility of the events that the template creates, not who may see
 * the template — that is the tab "Freigabe"
 */
const VisibilityTile = ({ template }: TemplateTileProps) => {
  const { isPending, submitWithoutReset } = useAction(updateEventTemplate);
  const [visibility, setVisibility] = useState<string>(template.visibility);

  return (
    <SettingsFormTile
      section={SETTINGS_SECTIONS.visibility}
      templateId={template.id}
      isPending={isPending}
      onSubmit={submitWithoutReset}
    >
      <p className="text-sm text-neutral-400">
        Gilt für die Events aus dieser Vorlage. Wer die Vorlage selbst sehen
        darf, legt die Freigabe fest.
      </p>

      <EventVisibilityFields
        label="Sichtbarkeit des Events"
        visibility={visibility}
        onVisibilityChange={setVisibility}
        defaultRoleIds={template.visibilityRoleIds}
        className="mt-4"
      />
    </SettingsFormTile>
  );
};

const ParticipationTile = ({ template }: TemplateTileProps) => {
  const { isPending, submitWithoutReset } = useAction(
    updateEventTemplateParticipation,
  );

  return (
    <SettingsFormTile
      section={SETTINGS_SECTIONS.participation}
      templateId={template.id}
      isPending={isPending}
      onSubmit={submitWithoutReset}
    >
      <EventSwitchField
        name="participationEnabled"
        label="Teilnahme"
        hint="Bei Events aus dieser Vorlage können sich Mitglieder anmelden und für Posten der Aufstellung eingetragen werden."
        defaultChecked={template.participationEnabled}
      />

      <EventSwitchField
        name="applicationRequired"
        label="Teilnahmeanfragen"
        hint="Bei Events aus dieser Vorlage fragen Mitglieder die Teilnahme an, und ein Manager nimmt jede Anfrage an oder lehnt sie ab."
        defaultChecked={template.applicationRequired}
        className="mt-4"
      />
    </SettingsFormTile>
  );
};

interface DiscordTileProps {
  readonly template: Template;
  readonly channels: Props["channels"];
  readonly description: string;
}

const DiscordTile = ({ template, channels, description }: DiscordTileProps) => {
  const { isPending, submitWithoutReset } = useAction(
    updateEventTemplateDiscordPublishing,
  );
  const [isPublishing, setIsPublishing] = useState(
    template.discordPublishTarget !== null,
  );
  const checkboxId = useId();

  return (
    <SettingsFormTile
      section={SETTINGS_SECTIONS.discord}
      templateId={template.id}
      isPending={isPending}
      onSubmit={submitWithoutReset}
      footer={
        <EventDescriptionPreview description={description} className="mt-6" />
      }
    >
      <label htmlFor={checkboxId} className="block">
        Auf Discord veröffentlichen
      </label>
      <p className="mt-1 text-xs text-white/40">
        Events aus dieser Vorlage werden zusätzlich als Termin auf dem
        Discord-Server angelegt.
      </p>

      <YesNoCheckbox
        id={checkboxId}
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
    </SettingsFormTile>
  );
};

interface SettingsFormTileProps {
  readonly section: TableOfContentsItem;
  readonly templateId: string;
  readonly isPending: boolean;
  readonly onSubmit: FormEventHandler<HTMLFormElement>;
  readonly children: ReactNode;
  /** Below the form, for example a preview */
  readonly footer?: ReactNode;
}

/** A tile with a form that saves the fields of the tile */
const SettingsFormTile = ({
  section,
  templateId,
  isPending,
  onSubmit,
  children,
  footer,
}: SettingsFormTileProps) => {
  return (
    <Tile id={section.id} heading={section.label}>
      <form onSubmit={onSubmit}>
        <input type="hidden" name="templateId" value={templateId} />

        {children}

        <Button2 type="submit" disabled={isPending} className="mt-4 ml-auto">
          {isPending ? <AsciiSpinner /> : <FaSave />}
          Speichern
        </Button2>
      </form>

      {footer}
    </Tile>
  );
};
