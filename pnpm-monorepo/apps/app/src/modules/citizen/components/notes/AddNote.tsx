"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { Button2Variant } from "@/modules/common/components/Button2";
import { Select } from "@/modules/common/components/form/Select";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import {
  type Citizen,
  type ClassificationLevel,
  type NoteType,
} from "@sam-monorepo/database/browser";
import { FaSave } from "react-icons/fa";
import { createCitizenLog } from "../../actions/createCitizenLog";
import { Formatting } from "./Formatting";

interface Props {
  readonly entityId: Citizen["id"];
  readonly noteTypeId: NoteType["id"];
  readonly classificationLevels: ClassificationLevel[];
}

export const AddNote = ({
  entityId,
  noteTypeId,
  classificationLevels,
}: Props) => {
  const { formAction, getDefaultValueWithFallback } =
    useAction(createCitizenLog);

  return (
    <form action={formAction}>
      <input type="hidden" name="citizenId" value={entityId} />
      <input type="hidden" name="type" value="note" />
      <input type="hidden" name="noteTypeId" value={noteTypeId} />

      <div className="mb-1 flex justify-end">
        <Formatting />
      </div>

      <textarea
        className="field-sizing-content min-h-32 w-full rounded-l bg-neutral-800 p-2"
        name="content"
        aria-label="Neue Notiz"
        defaultValue={getDefaultValueWithFallback("content", "")}
        required
      />

      <div className="mt-1 grid grid-cols-3 gap-1">
        {classificationLevels.length > 1 && (
          <Select
            name="classificationLevelId"
            aria-label="Geheimhaltungsstufe"
            defaultValue={getDefaultValueWithFallback(
              "classificationLevelId",
              undefined,
            )}
            required
            className="bg-neutral-800!"
          >
            {classificationLevels.map((classificationLevel) => (
              <option
                key={classificationLevel.id}
                value={classificationLevel.id}
              >
                {classificationLevel.name}
              </option>
            ))}
          </Select>
        )}

        {classificationLevels.length === 1 && classificationLevels[0] && (
          <input
            type="hidden"
            name="classificationLevelId"
            value={classificationLevels[0].id}
          />
        )}

        <div className="col-start-3 flex items-center justify-end gap-4">
          <SubmitButton
            icon={<FaSave />}
            title="Speichern"
            variant={Button2Variant.Secondary}
          >
            Speichern
          </SubmitButton>
        </div>
      </div>
    </form>
  );
};
