import type { TableColumn } from "@/modules/common/components/TableTile";

const DATE_COLUMN_WIDTH = 140;

/**
 * The columns that the notes table and the table of the other logs share:
 * the citizen at the start, the confirmation, the authors and the actions at
 * the end
 */
export const CITIZEN_LOG_TABLE_COLUMNS = {
  citizen: {
    key: "citizen",
    label: "Citizen",
    track: "minmax(160px,1fr)",
    minWidth: 160,
  },
  end: [
    {
      key: "confirmation",
      label: "Bestätigungsstatus",
      track: "minmax(170px,1fr)",
      minWidth: 170,
    },
    {
      key: "confirmedAt",
      label: "Bestätigt am",
      track: `${DATE_COLUMN_WIDTH}px`,
      minWidth: DATE_COLUMN_WIDTH,
    },
    {
      key: "confirmedBy",
      label: "Bestätigt von",
      track: "minmax(130px,1fr)",
      minWidth: 130,
    },
    {
      key: "createdAt",
      label: "Eingereicht am",
      track: `${DATE_COLUMN_WIDTH}px`,
      minWidth: DATE_COLUMN_WIDTH,
    },
    {
      key: "submittedBy",
      label: "Eingereicht von",
      track: "minmax(140px,1fr)",
      minWidth: 140,
    },
    {
      key: "actions",
      label: "Aktionen",
      track: "44px",
      minWidth: 44,
      headerClassName: "sr-only",
    },
  ],
} satisfies {
  readonly citizen: TableColumn;
  readonly end: readonly TableColumn[];
};
