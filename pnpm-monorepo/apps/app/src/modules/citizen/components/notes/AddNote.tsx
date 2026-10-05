"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { Select } from "@/modules/common/components/form/Select";
import {
  type Citizen,
  type ClassificationLevel,
  type NoteType,
} from "@sam-monorepo/database/browser";
import { useState } from "react";
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
  /** Controlled, because a success clears only the text */
  const [content, setContent] = useState("");
  const { isPending, submitWithoutReset } = useAction(createCitizenLog, {
    onSuccess: () => setContent(""),
  });

  return (
    <form onSubmit={submitWithoutReset}>
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
        value={content}
        onChange={(event) => setContent(event.target.value)}
        required
      />

      <div className="mt-1 grid grid-cols-3 gap-1">
        {classificationLevels.length > 1 && (
          <Select
            name="classificationLevelId"
            aria-label="Geheimhaltungsstufe"
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
          <Button2
            type="submit"
            disabled={isPending}
            title="Speichern"
            variant={Button2Variant.Secondary}
          >
            {isPending ? <AsciiSpinner /> : <FaSave />}
            Speichern
          </Button2>
        </div>
      </div>
    </form>
  );
};
