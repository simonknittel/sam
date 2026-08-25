import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { TRow } from "@/modules/common/components/Table";
import clsx from "clsx";
import type { UpcomingBirthday } from "../queries/getUpcomingBirthdays";

/** The date is a UTC midnight, see `getNextBirthday` */
const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const TOMORROW = 1;

const formatDaysUntil = (daysUntil: number) => {
  if (daysUntil === 0) return "heute";
  if (daysUntil === TOMORROW) return "morgen";
  return `in ${daysUntil} Tagen`;
};

interface Props {
  readonly birthday: UpcomingBirthday;
}

export const UpcomingBirthdayRow = ({ birthday }: Props) => {
  const isToday = birthday.daysUntil === 0;

  return (
    <TRow>
      <td className={clsx({ "text-me": isToday })}>
        {dateFormatter.format(birthday.date)}
      </td>

      <td className="overflow-hidden">
        <CitizenLink citizen={birthday.citizen} />
      </td>

      <td className={clsx("font-mono", { "text-me": isToday })}>
        {formatDaysUntil(birthday.daysUntil)}
      </td>
    </TRow>
  );
};
