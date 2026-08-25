import {
  TableTile,
  type TableColumn,
} from "@/modules/common/components/TableTile";
import { createLoader, parseAsString, type SearchParams } from "nuqs/server";
import { getUpcomingBirthdays } from "../queries/getUpcomingBirthdays";
import { BIRTHDAY_LIST_TIMEZONE } from "../utils/upcomingBirthdays";
import { UpcomingBirthdayRow } from "./UpcomingBirthdayRow";

const COLUMNS: TableColumn[] = [
  { key: "date", label: "Datum", track: "200px", minWidth: 200 },
  { key: "citizen", label: "Citizen", track: "1fr", minWidth: 200 },
  { key: "daysUntil", label: "Verbleibend", track: "160px", minWidth: 160 },
];

const loadSearchParams = createLoader({
  q: parseAsString,
});

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

export const UpcomingBirthdaysTile = async ({
  className,
  searchParams,
}: Props) => {
  const { q } = await loadSearchParams(searchParams);
  const birthdays = await getUpcomingBirthdays(q);

  return (
    <TableTile
      className={className}
      columns={COLUMNS}
      isEmpty={birthdays.length === 0}
      emptyMessage={
        q
          ? "Kein Citizen mit diesem Handle hat einen Geburtstag angegeben."
          : "Kein Citizen hat bisher einen Geburtstag angegeben. Citizens tragen ihn selbst unter Account / Profil ein."
      }
      footer={
        <p className="text-xs text-neutral-500 px-4">
          Alle Angaben in der Zeitzone {BIRTHDAY_LIST_TIMEZONE}. Jeder Citizen
          steht genau einmal in der Liste, mit seinem nächsten Geburtstag.
        </p>
      }
    >
      {birthdays.map((birthday) => (
        <UpcomingBirthdayRow key={birthday.citizen.id} birthday={birthday} />
      ))}
    </TableTile>
  );
};
