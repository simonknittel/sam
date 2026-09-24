import { Tile } from "@/modules/common/components/Tile";
import { SeasonalEventKey } from "@sam-monorepo/domain";
import { getMySeasonalThemeSettings } from "../queries/getMySeasonalThemeSettings";
import { formatSeasonalThemeRangeLabel } from "../utils/formatSeasonalThemeRangeLabel";
import { SEASONAL_THEMES } from "../utils/SEASONAL_THEMES";
import {
  SeasonalThemeSettingsForm,
  type SeasonalThemeSettingRow,
} from "./SeasonalThemeSettingsForm";

interface Props {
  readonly className?: string;
}

/**
 * The switches of the seasonal events. The list comes from the registry of
 * the themes, thus a new event appears here without a change.
 */
export const SeasonalThemeSettings = async ({ className }: Props) => {
  const settings = await getMySeasonalThemeSettings();

  // Opt-out model: the existence of a row means the event is switched off.
  const switchedOffEventKeys = new Set(
    settings?.map((setting) => setting.eventKey) ?? [],
  );

  const rows: SeasonalThemeSettingRow[] = Object.values(SeasonalEventKey).map(
    (eventKey) => ({
      eventKey,
      title: SEASONAL_THEMES[eventKey].title,
      dateRangeLabel: formatSeasonalThemeRangeLabel(eventKey),
      enabled: !switchedOffEventKeys.has(eventKey),
    }),
  );

  return (
    <Tile
      className={className}
      heading="Saisonale Events"
      subheading="Zu besonderen Anlässen schmückt sich die App mit Dekorationen und einer eigenen Schrift und begrüßt dich auf dem Dashboard. Hier schaltest du einzelne Anlässe für dich aus."
    >
      <SeasonalThemeSettingsForm rows={rows} />
    </Tile>
  );
};
