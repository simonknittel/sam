import { Actions } from "@/modules/common/components/Actions";
import { Tile } from "@/modules/common/components/Tile";
import { getAllClassificationLevels } from "@/modules/spynet/queries/getAllClassificationLevels";
import Create from "./Create";
import Delete from "./Delete";
import Update from "./Update";

interface Props {
  className?: string;
}

const ClassificationLevelsTile = async ({ className }: Readonly<Props>) => {
  const classificationLevels = await getAllClassificationLevels();

  const sortedClassificationLevels = classificationLevels.toSorted((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <Tile heading="Geheimhaltungsstufen" cta={<Create />} className={className}>
      <p className="mb-4 text-sm">
        Jeder Notiz kann eine Geheimhaltungsstufe zugewiesen werden. Anhand
        dieser können Berechtigungen vergeben werden.
      </p>

      {sortedClassificationLevels.map((classificationLevel) => (
        <div
          key={classificationLevel.id}
          className="flex justify-between gap-2 py-2 items-center"
        >
          <div className="flex flex-col">
            <p className="font-bold">{classificationLevel.name}</p>
            <p className="text-neutral-500 text-sm">{classificationLevel.id}</p>
          </div>

          <div className="flex gap-4 items-center">
            <Actions>
              <Update classificationLevel={classificationLevel} />
              <Delete classificationLevel={classificationLevel} />
            </Actions>
          </div>
        </div>
      ))}

      {sortedClassificationLevels.length <= 0 && (
        <p className="text-neutral-500 italic">
          Keine Geheimhaltungsstufen vorhanden
        </p>
      )}
    </Tile>
  );
};

export default ClassificationLevelsTile;
