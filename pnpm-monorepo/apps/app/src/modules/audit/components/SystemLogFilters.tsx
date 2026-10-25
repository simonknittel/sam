import { DateRangeFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/DateRangeFilter";
import { MultiSelectComboboxFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/MultiSelectComboboxFilter";
import { RadioFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/RadioFilter";
import {
  AuditEventAccess,
  type AuditEventCreator,
} from "@sam-monorepo/application";
import { AuditEventDefinitions } from "../utils/AuditEventTypes";
import {
  SYSTEM_LOG_ACCESS_PARAM,
  SYSTEM_LOG_FROM_PARAM,
  SYSTEM_LOG_ORIGIN_PARAM,
  SYSTEM_LOG_TO_PARAM,
  SYSTEM_LOG_VOLUME_PARAM,
  SystemLogOrigin,
  SystemLogVolume,
} from "../utils/systemLogFilterParams";

interface Props {
  readonly creators: AuditEventCreator[];
}

export const SystemLogFilters = ({ creators }: Props) => {
  // A selected type always shows, also a high-volume type or a read type
  const typeItems = Object.values(AuditEventDefinitions).map(
    ({ type, app }) => ({ value: type, label: type, group: app }),
  );

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

      <RadioFilter
        name={SYSTEM_LOG_ORIGIN_PARAM}
        label="QUELLE"
        items={[
          {
            value: SystemLogOrigin.All,
            label: "Alle",
            default: true,
          },
          {
            value: SystemLogOrigin.Mcp,
            label: "MCP",
          },
        ]}
        resetCursorPagination
      />

      <RadioFilter
        name={SYSTEM_LOG_ACCESS_PARAM}
        label="ZUGRIFF"
        items={[
          {
            value: AuditEventAccess.Write,
            label: "Schreiben",
            default: true,
          },
          {
            value: AuditEventAccess.Read,
            label: "Lesen",
          },
          {
            value: AuditEventAccess.All,
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
