import { RadioFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/RadioFilter";
import { TaskListStatus } from "../utils/TaskListStatus";

export const Filters = () => {
  return (
    <>
      <RadioFilter
        name="status"
        label="Status"
        items={[
          { value: TaskListStatus.Open, label: "Offen", default: true },
          { value: TaskListStatus.New, label: "Neu" },
          { value: TaskListStatus.Closed, label: "Geschlossen" },
        ]}
        resetCursorPagination
      />

      <RadioFilter
        name="accepted"
        label="Angenommen von"
        items={[
          { value: "all", label: "Alle", default: true },
          { value: "yes", label: "Mir" },
        ]}
        resetCursorPagination
      />

      <RadioFilter
        name="created_by"
        label="Erstellt von"
        items={[
          { value: "others", label: "Alle", default: true },
          { value: "me", label: "Mir" },
        ]}
        resetCursorPagination
      />
    </>
  );
};
