import { MultiSelectComboboxFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/MultiSelectComboboxFilter";
import { AuditEventType } from "../utils/AuditEventTypes";

interface Creator {
  id: string;
  name: string | null;
}

interface Props {
  readonly creators: Creator[];
}

export const SystemLogFilters = ({ creators }: Props) => {
  const typeItems = [
    ...Object.values(AuditEventType).map((type) => ({
      value: type,
      label: type,
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
