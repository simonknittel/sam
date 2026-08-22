"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import { RadioGroup } from "@/modules/common/components/form/RadioGroup";
import { Select } from "@/modules/common/components/form/Select";
import { Textarea } from "@/modules/common/components/form/Textarea";
import { TextInput } from "@/modules/common/components/form/TextInput";
import { api } from "@/modules/common/utils/api";
import { createEvent } from "@/modules/events/actions/createEvent";
import { WikiRoleSelector } from "@/modules/wiki/components/WikiRoleSelector";
import { EventVisibility } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { useId, useState } from "react";
import { FaGlobe, FaLock, FaSave } from "react-icons/fa";
import { EventCoverImageField } from "../EventCoverImageField";
import { EventDateTimeField } from "../EventDateTimeField";

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

  return (
    <form action={formAction} className={clsx(className)}>
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

          {selectedTemplate && (
            <p className="mt-2 text-sm text-neutral-400">
              Aufstellung und Briefing der Vorlage werden übernommen. Die
              Aufstellung startet unbesetzt und unveröffentlicht. Alle Felder
              hier kannst du vor dem Speichern noch ändern.
            </p>
          )}
        </div>
      )}

      <div key={prefillKey}>
        <TextInput
          name="name"
          label="Titel"
          maxLength={128}
          defaultValue={getDefaultValueWithFallback(
            "name",
            selectedTemplate?.name ?? "",
          )}
          required
          autoFocus
        />

        <Textarea
          name="description"
          label="Kurzbeschreibung"
          hint="optional, max. 2.000 Zeichen, keine Formatierungsmöglichkeiten. Ausführlichere Informationen gehören ins Briefing des Events."
          maxLength={2000}
          defaultValue={getDefaultValueWithFallback(
            "description",
            selectedTemplate?.description ?? "",
          )}
          className="mt-4"
          classNameTextarea="h-40"
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
          defaultVisibility={
            selectedTemplate?.visibility ?? EventVisibility.PUBLIC
          }
          defaultRoleIds={selectedTemplate?.visibilityRoleIds ?? []}
        />
      </div>

      <Button2 type="submit" disabled={isPending} className="mt-4 ml-auto">
        {isPending ? <AsciiSpinner /> : <FaSave />}
        Speichern
      </Button2>

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

interface VisibilityFieldsProps {
  readonly defaultVisibility: EventVisibility;
  readonly defaultRoleIds: readonly string[];
}

const VisibilityFields = ({
  defaultVisibility,
  defaultRoleIds,
}: VisibilityFieldsProps) => {
  const [visibility, setVisibility] = useState<string>(defaultVisibility);

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
        onChange={setVisibility}
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
