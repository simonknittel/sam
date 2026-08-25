import {
  TableTile,
  type TableColumn,
} from "@/modules/common/components/TableTile";
import { getUpcomingBirthdays } from "../queries/getUpcomingBirthdays";
import { UpcomingBirthdayRow } from "./UpcomingBirthdayRow";

const COLUMNS: TableColumn[] = [
  { key: "date", label: "Datum", track: "200px", minWidth: 200 },
  { key: "citizen", label: "Citizen", track: "1fr", minWidth: 200 },
  { key: "daysUntil", label: "Verbleibend", track: "160px", minWidth: 160 },
];

interface Props {
  readonly className?: string;
}

export const UpcomingBirthdaysTile = async ({ className }: Props) => {
  const birthdays = await getUpcomingBirthdays();

  return (
    <TableTile
      className={className}
      columns={COLUMNS}
      isEmpty={birthdays.length === 0}
      emptyMessage="Keine Citizens mit einem Geburtstag gefunden. Citizens geben ihren Geburtstag selbst unter Account / Profil an."
      footer={
        <p className="text-xs text-neutral-500 px-4">
          Alle Angaben in der Zeitzone Europe/Berlin. Jeder Citizen steht genau
          einmal in der Liste, mit seinem nächsten Geburtstag.
        </p>
      }
    >
      {birthdays.map((birthday) => (
        <UpcomingBirthdayRow key={birthday.citizen.id} birthday={birthday} />
      ))}
    </TableTile>
  );
};
