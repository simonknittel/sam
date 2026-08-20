import { getAllClassificationLevels } from "@/modules/spynet/queries/getAllClassificationLevels";
import { createClassificationLevel } from "../../actions/createClassificationLevel";
import { deleteClassificationLevel } from "../../actions/deleteClassificationLevel";
import { updateClassificationLevel } from "../../actions/updateClassificationLevel";
import { SettingsRecordTile } from "../settings-record/SettingsRecordTile";

interface Props {
  readonly className?: string;
}

const ClassificationLevelsTile = async ({ className }: Props) => {
  const classificationLevels = await getAllClassificationLevels();

  return (
    <SettingsRecordTile
      className={className}
      heading="Geheimhaltungsstufen"
      description="Jeder Notiz kann eine Geheimhaltungsstufe zugewiesen werden. Anhand dieser können Berechtigungen vergeben werden."
      emptyLabel="Keine Geheimhaltungsstufen vorhanden"
      actions={{
        create: createClassificationLevel,
        update: updateClassificationLevel,
        delete: deleteClassificationLevel,
      }}
      records={classificationLevels}
    />
  );
};

export default ClassificationLevelsTile;
