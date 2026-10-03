import type { CitizenNote } from "@/modules/citizen/queries/citizenLogTableSelect";
import { getAllClassificationLevels } from "@/modules/spynet/queries/getAllClassificationLevels";
import clsx from "clsx";

interface Props {
  readonly className?: string;
  readonly note: CitizenNote;
}

export const ClassificationLevel = async ({ className, note }: Props) => {
  const allClassificationLevels = await getAllClassificationLevels();

  return (
    <p className={clsx(className, "flex items-center gap-2")}>
      {allClassificationLevels.find(
        (classificationLevel) =>
          classificationLevel.id === note.classificationLevelId,
      )?.name || "Geheimhaltungsstufe Unbekannt"}
    </p>
  );
};
