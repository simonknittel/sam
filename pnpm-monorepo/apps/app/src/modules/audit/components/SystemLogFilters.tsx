import { DateRangeFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/DateRangeFilter";
import { MultiSelectComboboxFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/MultiSelectComboboxFilter";
import { RadioFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/RadioFilter";
import {
  AuditEventType,
  HIGH_VOLUME_AUDIT_EVENT_TYPES,
} from "../utils/AuditEventTypes";
import {
  SYSTEM_LOG_FROM_PARAM,
  SYSTEM_LOG_TO_PARAM,
  SYSTEM_LOG_VOLUME_PARAM,
  SystemLogVolume,
} from "../utils/systemLogFilterParams";

interface Creator {
  id: string;
  name: string | null;
}

interface Props {
  readonly creators: Creator[];
}

/**
 * Grouping the high-volume types apart is what tells someone browsing the
 * list that those entries behave differently, without the volume filter and
 * the type filter having to contradict each other: picking a type here
 * always shows it.
 */
const TYPE_GROUP_HIGH_VOLUME = "Hohes Volumen";
const TYPE_GROUP_DEFAULT = "Alle übrigen";

export const SystemLogFilters = ({ creators }: Props) => {
  const typeItems = [
    ...Object.values(AuditEventType).map((type) => ({
      value: type,
      label: type,
      group: HIGH_VOLUME_AUDIT_EVENT_TYPES.has(type)
        ? TYPE_GROUP_HIGH_VOLUME
        : TYPE_GROUP_DEFAULT,
    })),
  ];

  const creatorItems = [
    ...creators.map((creator) => ({
      value: creator.id,
      label: creator.name ?? creator.id,
    })),
  ];

  return (
    <>
      <DateRangeFilter
        fromName={SYSTEM_LOG_FROM_PARAM}
        toName={SYSTEM_LOG_TO_PARAM}
        label="ZEITRAUM"
        resetCursorPagination
      />

      <RadioFilter
        name={SYSTEM_LOG_VOLUME_PARAM}
        label="UMFANG"
        items={[
          {
            value: SystemLogVolume.WithoutHighVolume,
            label: "Reduziert",
            default: true,
          },
          {
            value: SystemLogVolume.All,
            label: "Alle",
          },
        ]}
        resetCursorPagination
      />

      <MultiSelectComboboxFilter
        name="type"
        label="TYPE"
        items={typeItems}
        placeholder="Alle"
        resetCursorPagination
      />

      <MultiSelectComboboxFilter
        name="createdById"
        label="USER"
        items={creatorItems}
        placeholder="Alle"
        resetCursorPagination
      />
    </>
  );
};
