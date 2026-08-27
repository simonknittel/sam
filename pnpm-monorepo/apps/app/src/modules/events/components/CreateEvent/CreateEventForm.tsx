"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import { RadioGroup } from "@/modules/common/components/form/RadioGroup";
import { Select } from "@/modules/common/components/form/Select";
import { TextInput } from "@/modules/common/components/form/TextInput";
import { YesNoCheckbox } from "@/modules/common/components/form/YesNoCheckbox";
import { api } from "@/modules/common/utils/api";
import { createEvent } from "@/modules/events/actions/createEvent";
import {
  EventDescriptionField,
  EventDescriptionPreviewLayout,
} from "@/modules/events/components/EventDescriptionField";
import { EventDescriptionHint } from "@/modules/events/components/EventDescriptionHint";
import { WikiRoleSelector } from "@/modules/wiki/components/WikiRoleSelector";
import {
  EventVisibility,
  type EventDiscordPublishTarget,
} from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { useId, useState } from "react";
import { FaGlobe, FaLock, FaSave } from "react-icons/fa";
import { EVENT_DESCRIPTION_MAX_LENGTH } from "../../utils/discordEventDescription";
import { EVENT_NAME_MAX_LENGTH } from "../../utils/eventConstraints";
import { DiscordPublishTargetFields } from "../DiscordPublishTargetFields";
import { EventCoverImageField } from "../EventCoverImageField";
import { EventDateTimeField } from "../EventDateTimeField";
import { RestrictedDiscordPublishDialog } from "../RestrictedDiscordPublishDialog";

/** The "no template" option of the picker */
const NO_TEMPLATE = "";

interface Props {
  readonly className?: string;
  readonly onSuccess?: () => void;
  /** Preselects a template, e.g. from a template's "Verwenden" button */
  readonly templateId?: string;
}

export const CreateEventForm = ({
  className,
  onSuccess,
  templateId,
}: Props) => {
  const { state, formAction, isPending, getDefaultValueWithFallback } =
    useAction(createEvent, {
      errorToast: false,
      onSuccess,
    });
  const templateSelectId = useId();
  const formId = useId();
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    templateId ?? NO_TEMPLATE,
  );

  /**
   * Fetched lazily: the form only mounts while the modal is open. Templates
   * are the viewer's own plus those shared with them for reading.
   */
  const { data: templates } = api.events.getUsableEventTemplates.useQuery(
    undefined,
    { refetchOnWindowFocus: false, refetchOnReconnect: false },
  );

  const selectedTemplate =
    templates?.find((template) => template.id === selectedTemplateId) ?? null;

  /**
   * The prefilled fields are uncontrolled, so switching templates has to
   * remount them for the new defaults to land (React only reads
   * `defaultValue` on mount). Keying the block by the template id does that;
   * anything the user already typed is deliberately replaced, since picking
   * a template is an explicit "start from this" action.
   */
  const prefillKey = selectedTemplate?.id ?? NO_TEMPLATE;

  /**
   * Visibility and publishing are read by the submit button (a restricted
   * event published to Discord takes a confirmation), so unlike the other
   * prefilled fields they live here rather than in their own section. The
   * template switch resets them the way React documents it — adjusting
   * state during render instead of an effect, like `RadioGroup` does.
   */
  const [visibility, setVisibility] = useState<string>(
    selectedTemplate?.visibility ?? EventVisibility.PUBLIC,
  );
  const [isPublishing, setIsPublishing] = useState(
    selectedTemplate?.discordPublishTarget != null,
  );
  const [previousPrefillKey, setPreviousPrefillKey] = useState(prefillKey);
  if (prefillKey !== previousPrefillKey) {
    setPreviousPrefillKey(prefillKey);
    setVisibility(selectedTemplate?.visibility ?? EventVisibility.PUBLIC);
    setIsPublishing(selectedTemplate?.discordPublishTarget != null);
  }

  const needsRestrictedConfirmation =
    visibility === EventVisibility.RESTRICTED && isPublishing;

  return (
    <form action={formAction} id={formId} className={clsx(className)}>
      {templates && templates.length > 0 && (
        <div className="mb-4">
          <label htmlFor={templateSelectId} className="mb-1 block">
            Vorlage (optional)
          </label>

          <Select
            id={templateSelectId}
            name="templateId"
            value={selectedTemplateId}
            onChange={(event) => setSelectedTemplateId(event.target.value)}
          >
            <option value={NO_TEMPLATE}>Ohne Vorlage</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div key={prefillKey}>
        <TextInput
          name="name"
          label="Titel"
          maxLength={EVENT_NAME_MAX_LENGTH}
          defaultValue={getDefaultValueWithFallback(
            "name",
            selectedTemplate?.name ?? "",
          )}
          required
          autoFocus
        />

        <EventDescriptionField
          hint={<EventDescriptionHint />}
          maxLength={EVENT_DESCRIPTION_MAX_LENGTH}
          defaultValue={getDefaultValueWithFallback(
            "description",
            selectedTemplate?.description ?? "",
          )}
          previewLayout={EventDescriptionPreviewLayout.Below}
          className="mt-4"
        />

        {selectedTemplate?.coverImageId ? (
          <TemplateCoverField uploadId={selectedTemplate.coverImageId} />
        ) : (
          <EventCoverImageField name="coverImageId" className="mt-4" />
        )}
      </div>

      <EventDateTimeField
        name="startTime"
        label="Start"
        defaultValue={getDefaultValueWithFallback("startTime", "")}
        className="mt-4"
        required
      />

      <EventDateTimeField
        name="endTime"
        label="Ende"
        defaultValue={getDefaultValueWithFallback("endTime", "")}
        className="mt-4"
        required
      />

      <div key={`visibility-${prefillKey}`}>
        <VisibilityFields
          visibility={visibility}
          onVisibilityChange={setVisibility}
          defaultRoleIds={selectedTemplate?.visibilityRoleIds ?? []}
        />
      </div>

      <div key={`discord-${prefillKey}`}>
        <DiscordPublishFields
          isPublishing={isPublishing}
          onIsPublishingChange={setIsPublishing}
          defaultTarget={selectedTemplate?.discordPublishTarget ?? null}
          defaultChannelId={selectedTemplate?.discordPublishChannelId ?? null}
          defaultLocation={selectedTemplate?.discordPublishLocation ?? null}
        />
      </div>

      {needsRestrictedConfirmation ? (
        <RestrictedDiscordPublishDialog
          formId={formId}
          trigger={
            <Button2
              type="button"
              disabled={isPending}
              className="mt-4 ml-auto"
            >
              {isPending ? <AsciiSpinner /> : <FaSave />}
              Speichern
            </Button2>
          }
          description="Das Event ist in dieser App nur für ausgewählte Rollen sichtbar. Auf Discord sehen es alle Mitglieder des Servers — inklusive Titel, Beschreibung und Zeitraum."
          confirmLabel="Erstellen und veröffentlichen"
        />
      ) : (
        <Button2 type="submit" disabled={isPending} className="mt-4 ml-auto">
          {isPending ? <AsciiSpinner /> : <FaSave />}
          Speichern
        </Button2>
      )}

      <ActionErrorNote className="mt-4" state={state} />
    </form>
  );
};

interface TemplateCoverFieldProps {
  readonly uploadId: string;
}

/**
 * The template's cover is not an upload of the submitter's own, so it cannot
 * travel as an upload id — the action copies it into a fresh upload when
 * this flag is set. Replacing it means uploading a cover, which submits an
 * id and wins over the flag.
 */
const TemplateCoverField = ({ uploadId }: TemplateCoverFieldProps) => {
  const [keepTemplateCover, setKeepTemplateCover] = useState(true);

  if (!keepTemplateCover)
    return <EventCoverImageField name="coverImageId" className="mt-4" />;

  return (
    <div className="mt-4">
      <input type="hidden" name="keepTemplateCover" value="1" />

      <EventCoverImageField
        name="templateCoverPreview"
        defaultUploadId={uploadId}
        className="pointer-events-none opacity-90"
      />

      <button
        type="button"
        onClick={() => setKeepTemplateCover(false)}
        className="mt-2 cursor-pointer text-sm text-interaction-500 hover:underline focus-visible:underline"
      >
        Titelbild der Vorlage ersetzen oder entfernen
      </button>
    </div>
  );
};

interface DiscordPublishFieldsProps {
  readonly isPublishing: boolean;
  readonly onIsPublishingChange: (isPublishing: boolean) => void;
  readonly defaultTarget: EventDiscordPublishTarget | null;
  readonly defaultChannelId: string | null;
  readonly defaultLocation: string | null;
}

/**
 * Publishing the new event to Discord right after creation, off by default.
 * A template that carries a publish preference switches it on and prefills
 * the target; clearing the checkbox still wins, so the template never
 * publishes behind the organizer's back.
 */
const DiscordPublishFields = ({
  isPublishing,
  onIsPublishingChange,
  defaultTarget,
  defaultChannelId,
  defaultLocation,
}: DiscordPublishFieldsProps) => {
  const checkboxId = useId();

  /**
   * Fetched lazily like the templates above, and only while the section is
   * open — a manager who does not publish never waits on Discord.
   */
  const { data: channels, isPending } =
    api.events.getPublishableDiscordChannels.useQuery(undefined, {
      enabled: isPublishing,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    });

  return (
    <>
      <label htmlFor={checkboxId} className="mt-4 block">
        Auf Discord veröffentlichen
      </label>
      <p className="text-xs mt-1 text-white/40">
        Legt das Event zusätzlich als Termin auf dem Discord-Server an.
        Anmeldungen werden nicht übertragen.
      </p>

      <YesNoCheckbox
        id={checkboxId}
        className="mt-2"
        checked={isPublishing}
        onChange={(changeEvent) =>
          onIsPublishingChange(changeEvent.target.checked)
        }
      />

      {isPublishing &&
        (isPending ? (
          <AsciiSpinner className="mt-2 text-brand-red-500" />
        ) : (
          <DiscordPublishTargetFields
            channels={channels ?? null}
            defaultTarget={defaultTarget ?? undefined}
            defaultChannelId={defaultChannelId}
            defaultLocation={defaultLocation}
            locationPlaceholder="Link zum Event in dieser App"
            className="mt-2"
          />
        ))}
    </>
  );
};

interface VisibilityFieldsProps {
  readonly visibility: string;
  readonly onVisibilityChange: (visibility: string) => void;
  readonly defaultRoleIds: readonly string[];
}

const VisibilityFields = ({
  visibility,
  onVisibilityChange,
  defaultRoleIds,
}: VisibilityFieldsProps) => {
  return (
    <>
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
        onChange={onVisibilityChange}
        className="mt-2"
      />

      {visibility === EventVisibility.RESTRICTED && (
        <WikiRoleSelector
          inputName="visibilityRole[]"
          defaultValue={[...defaultRoleIds]}
          className="mt-2"
        />
      )}
    </>
  );
};
