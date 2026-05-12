import {
  type ClassificationLevel,
  type NoteType,
} from "@/generated/prisma/client";
import Button from "@/modules/common/components/Button";
import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import clsx from "clsx";
import { useState } from "react";
import { FaPlus, FaTrash } from "react-icons/fa";
import { usePermissionsContext } from "../../PermissionsContext";

interface Props {
  readonly className?: string;
  readonly noteTypes: NoteType[];
  readonly classificationLevels: ClassificationLevel[];
}

export const NoteSection = ({
  className,
  noteTypes,
  classificationLevels,
}: Props) => {
  const { permissionStrings } = usePermissionsContext();

  const [rules, setRules] = useState<string[]>(
    permissionStrings.filter((permissionString) =>
      permissionString.startsWith("note;"),
    ),
  );

  const handleCreate = () => {
    setRules((rules) => [...rules, `note`]);
  };

  const handleDelete = (ruleToRemove: string) => {
    setRules((rules) => rules.filter((rule) => rule !== ruleToRemove));
  };

  return (
    <div className={clsx(className)}>
      <h4 className="font-bold">Notizen</h4>

      <div className="border border-neutral-700 p-4 rounded-secondary mt-2">
        <div className="grid grid-cols-5 gap-2 font-bold">
          <span>Notizart</span>
          <span>Geheimhaltungsstufe</span>
          <span>Nicht Bestätigte</span>
          <span>Aktion</span>
        </div>

        {rules.length > 0 ? (
          rules.map((rule) => (
            <Rule
              key={rule}
              ruleString={rule}
              noteTypes={noteTypes}
              classificationLevels={classificationLevels}
              handleDelete={() => handleDelete(rule)}
            />
          ))
        ) : (
          <p className="text-neutral-500 italic mt-2">
            Bisher gibt es keine Regeln.
          </p>
        )}

        <Button variant="tertiary" onClick={handleCreate}>
          <FaPlus /> Regel erstellen
        </Button>
      </div>
    </div>
  );
};

type RuleProps = Readonly<{
  ruleString: string;
  noteTypes: NoteType[];
  classificationLevels: ClassificationLevel[];
  handleDelete: () => void;
}>;

const Rule = ({
  ruleString,
  noteTypes,
  classificationLevels,
  handleDelete,
}: RuleProps) => {
  const [resource, _operation = "", ...attributeStrings] =
    ruleString.split(";");
  if (!resource) throw new Error("Invalid rule");
  const attributes = attributeStrings.map((attributeString) => {
    const [key, value] = attributeString.split("=");
    if (!key || !value) throw new Error("Invalid attribute");
    return { key, value };
  });

  const [operation, setOperation] = useState<string>(_operation || "");

  const [alsoUnconfirmed, setAlsoUnconfirmed] = useState<boolean>(
    attributes.some((attribute) => attribute.key === "alsoUnconfirmed"),
  );

  const [noteTypeId, setNoteTypeId] = useState<string>(
    attributes.find((attribute) => attribute.key === "noteTypeId")?.value || "",
  );

  const [classificationLevelId, setClassificationLevelId] = useState<string>(
    attributes.find((attribute) => attribute.key === "classificationLevelId")
      ?.value || "",
  );

  let inputName = `note;${operation}`;
  if (noteTypeId) inputName += `;noteTypeId=${noteTypeId}`;
  if (classificationLevelId)
    inputName += `;classificationLevelId=${classificationLevelId}`;
  if (alsoUnconfirmed) inputName += `;alsoUnconfirmed=true`;

  return (
    <div className="grid grid-cols-5 gap-2 mt-2">
      {operation && <input type="hidden" name={inputName} />}

      <select
        defaultValue={noteTypeId}
        required
        className="bg-neutral-900 rounded-secondary px-4 h-11"
        onChange={(event) => setNoteTypeId(event.target.value)}
      >
        <option disabled hidden value=""></option>
        <option value="*">Alle</option>

        {noteTypes.map((noteType) => (
          <option key={noteType.id} value={noteType.id}>
            {noteType.name}
          </option>
        ))}
      </select>

      <select
        defaultValue={classificationLevelId}
        required
        className="bg-neutral-900 rounded-secondary px-4 h-11"
        onChange={(event) => setClassificationLevelId(event.target.value)}
      >
        <option disabled hidden value=""></option>
        <option value="*">Alle</option>

        {classificationLevels.map((classificationLevel) => (
          <option key={classificationLevel.id} value={classificationLevel.id}>
            {classificationLevel.name}
          </option>
        ))}
      </select>

      <div className="flex items-center">
        <YesNoCheckbox
          defaultChecked={alsoUnconfirmed}
          onChange={(event) => setAlsoUnconfirmed(event.target.checked)}
        />
      </div>

      <select
        required
        className="bg-neutral-900 rounded-secondary px-4 h-11"
        defaultValue={operation}
        onChange={(event) => setOperation(event.target.value)}
      >
        <option disabled hidden value=""></option>
        <option value="manage">Alle</option>
        <option value="create">Erstellen</option>
        <option value="read">Lesen</option>
        <option value="readRedacted">Lesen (Redacted)</option>
        <option value="update">Bearbeiten</option>
        <option value="delete">Löschen</option>
        <option value="confirm">Bestätigen</option>
      </select>

      <div className="flex items-center justify-end">
        <Button variant="tertiary" onClick={() => handleDelete()}>
          <FaTrash /> Löschen
        </Button>
      </div>
    </div>
  );
};
