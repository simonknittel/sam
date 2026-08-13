import { getAllClassificationLevels } from "@/modules/spynet/queries/getAllClassificationLevels";
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
      apiPath="/api/classification-level"
      records={classificationLevels}
    />
  );
};

export default ClassificationLevelsTile;
