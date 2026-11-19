"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { useSubmitConfirmation } from "@/modules/common/components/AlertDialog";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { FormSection } from "@/modules/common/components/form/FormSection";
import { Select } from "@/modules/common/components/form/Select";
import { TextInput } from "@/modules/common/components/form/TextInput";
import { YesNoCheckbox } from "@/modules/common/components/form/YesNoCheckbox";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import { createEvent } from "@/modules/events/actions/createEvent";
import { EventDescriptionTextarea } from "@/modules/events/components/EventDescriptionField";
import { EventDescriptionHint } from "@/modules/events/components/EventDescriptionHint";
import { EventDescriptionPreview } from "@/modules/events/components/EventDescriptionPreview";
import { useEventDescription } from "@/modules/events/hooks/useEventDescription";
import { api } from "@/trpc/react";
import {
  EventVisibility,
  type EventDiscordPublishTarget,
} from "@sam-monorepo/database/browser";
import { EVENT_NAME_MAX_LENGTH } from "@sam-monorepo/domain";
import clsx from "clsx";
import { useId, useState } from "react";
import { FaSave } from "react-icons/fa";
import { DiscordPublishTargetFields } from "../DiscordPublishTargetFields";
import { EventCoverImageField } from "../EventCoverImageField";
import { EventDateTimeField } from "../EventDateTimeField";
import { EventSwitchField } from "../EventSwitchField";
import { EventVisibilityFields } from "../EventVisibilityFields";
import { RestrictedDiscordPublishDialog } from "../RestrictedDiscordPublishDialog";

/** The "no template" option of the picker */
const NO_TEMPLATE = "";

/**
 * A new event goes to Discord too, unless the user switches it off. A
 * template decides itself: one without a publish preference does not
 * publish, so that the template never publishes behind the back of the
 * organizer.
 */
const isPublishingByDefault = (
  template: {
    readonly discordPublishTarget: EventDiscordPublishTarget | null;
  } | null,
) => (template ? template.discordPublishTarget !== null : true);

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
  const { state, formAction, getDefaultValueWithFallback } = useAction(
    createEvent,
    {
      errorToast: false,
      onSuccess,
    },
  );
  const templateSelectId = useId();
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    templateId ?? NO_TEMPLATE,
  );

  /**
   * Fetched lazily: the form only mounts while the modal is open. Templates
   * are the viewer's own plus those shared with them for reading.
   */
  const { data: templates } =
    api.events.getUsableEventTemplates.useQuery(undefined);

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
   * Visibility and publishing are read by the submission (a restricted
   * event published to Discord takes a confirmation), so unlike the other
   * prefilled fields they live here rather than in their own section. The
   * template switch resets them the way React documents it — adjusting
   * state during render instead of an effect.
   */
  const [visibility, setVisibility] = useState<string>(
    selectedTemplate?.visibility ?? EventVisibility.PUBLIC,
  );
  const [isPublishing, setIsPublishing] = useState(
    isPublishingByDefault(selectedTemplate),
  );
  /** Only for the summary of the participation section: the switches are uncontrolled */
  const [participationEnabled, setParticipationEnabled] = useState(
    selectedTemplate?.participationEnabled ?? true,
  );
  const [applicationRequired, setApplicationRequired] = useState(
    selectedTemplate?.applicationRequired ?? false,
  );
  const [previousPrefillKey, setPreviousPrefillKey] = useState(prefillKey);
  if (prefillKey !== previousPrefillKey) {
    setPreviousPrefillKey(prefillKey);
    setVisibility(selectedTemplate?.visibility ?? EventVisibility.PUBLIC);
    setIsPublishing(isPublishingByDefault(selectedTemplate));
    setParticipationEnabled(selectedTemplate?.participationEnabled ?? true);
    setApplicationRequired(selectedTemplate?.applicationRequired ?? false);
  }

  /**
   * React resets the form after an error to the defaults. A checkbox sends no
   * value while it is clear, thus the default comes from the submitted form
   * as a whole, not from the field (see `getDefaultValueWithFallback()`).
   */
  const submittedForm =
    state && "requestPayload" in state ? state.requestPayload : null;

  const restrictedConfirmation = useSubmitConfirmation(
    visibility === EventVisibility.RESTRICTED && isPublishing,
  );

  /** The preview of the description is only for Discord, thus it is in the Discord section */
  const defaultDescription = getDefaultValueWithFallback(
    "description",
    selectedTemplate?.description ?? "",
  );
  const { description, setDescription, textareaRef } =
    useEventDescription(defaultDescription);

  return (
    <form
      action={formAction}
      onSubmit={restrictedConfirmation.onSubmit}
      className={clsx(className)}
    >
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

        <EventDescriptionTextarea
          hint={<EventDescriptionHint />}
          defaultValue={defaultDescription}
          description={description}
          onDescriptionChange={setDescription}
          ref={textareaRef}
          className="mt-4"
        />

        {selectedTemplate?.coverImageId ? (
          <TemplateCoverField uploadId={selectedTemplate.coverImageId} />
        ) : (
          <EventCoverImageField name="coverImageId" className="mt-4" />
        )}
      </div>

      {/* A phone has no room for two date fields side by side */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <EventDateTimeField
          name="startTime"
          label="Start"
          defaultValue={getDefaultValueWithFallback("startTime", "")}
          className="min-w-0"
          required
        />

        <EventDateTimeField
          name="endTime"
          label="Ende"
          defaultValue={getDefaultValueWithFallback("endTime", "")}
          className="min-w-0"
          required
        />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <FormSection
          heading="Sichtbarkeit"
          summary={
            visibility === EventVisibility.RESTRICTED
              ? "Eingeschränkt"
              : "Öffentlich"
          }
        >
          <EventVisibilityFields
            key={`visibility-${prefillKey}`}
            label="Sichtbarkeit"
            visibility={visibility}
            onVisibilityChange={setVisibility}
            defaultRoleIds={selectedTemplate?.visibilityRoleIds ?? []}
          />
        </FormSection>

        <FormSection
          heading="Teilnahme"
          summary={
            participationEnabled
              ? applicationRequired
                ? "Mit Teilnahmeanfragen"
                : "Aktiviert"
              : "Deaktiviert"
          }
        >
          <EventSwitchField
            key={`participation-${prefillKey}`}
            name="participationEnabled"
            label="Teilnahme"
            hint="Mitglieder können sich anmelden und für Posten der Aufstellung eingetragen werden. Ohne Teilnahme sind die Aufstellung und die Teilnehmer ausgeblendet."
            defaultChecked={
              submittedForm
                ? submittedForm.get("participationEnabled") === "true"
                : (selectedTemplate?.participationEnabled ?? true)
            }
            onCheckedChange={setParticipationEnabled}
          />

          <EventSwitchField
            key={`application-${prefillKey}`}
            name="applicationRequired"
            label="Teilnahmeanfragen"
            hint="Mitglieder fragen die Teilnahme an, und ein Manager nimmt jede Anfrage an oder lehnt sie ab. Manager und eingeladene Mitglieder können sich direkt anmelden."
            defaultChecked={
              submittedForm
                ? submittedForm.get("applicationRequired") === "true"
                : (selectedTemplate?.applicationRequired ?? false)
            }
            onCheckedChange={setApplicationRequired}
          />
        </FormSection>

        <FormSection
          heading="Discord"
          summary={isPublishing ? "Veröffentlichen" : "Nicht veröffentlichen"}
        >
          <DiscordPublishFields
            key={`discord-${prefillKey}`}
            isPublishing={isPublishing}
            onIsPublishingChange={setIsPublishing}
            defaultTarget={selectedTemplate?.discordPublishTarget ?? null}
            defaultChannelId={selectedTemplate?.discordPublishChannelId ?? null}
            defaultLocation={selectedTemplate?.discordPublishLocation ?? null}
          />

          <EventDescriptionPreview description={description} />
        </FormSection>
      </div>

      <SubmitButton icon={<FaSave />} className="mt-4 ml-auto">
        Speichern
      </SubmitButton>

      <RestrictedDiscordPublishDialog
        isOpen={restrictedConfirmation.isOpen}
        onClose={restrictedConfirmation.close}
        description="Das Event ist in dieser App nur für ausgewählte Rollen sichtbar. Auf Discord sehen es alle Mitglieder des Servers — inklusive Titel, Beschreibung und Zeitraum."
        confirmLabel="Erstellen und veröffentlichen"
      />

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
 * Publishing the new event to Discord right after creation (see
 * `isPublishingByDefault()`). A template with a publish preference prefills
 * the target.
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
   * Fetched lazily like the templates above, and only while publishing is
   * on — a manager who switches it off never waits on Discord.
   */
  const { data: channels, isPending } =
    api.events.getPublishableDiscordChannels.useQuery(undefined, {
      enabled: isPublishing,
    });

  return (
    <div>
      <label htmlFor={checkboxId} className="block">
        Auf Discord veröffentlichen
      </label>
      <p className="mt-1 text-xs text-white/40">
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
    </div>
  );
};
