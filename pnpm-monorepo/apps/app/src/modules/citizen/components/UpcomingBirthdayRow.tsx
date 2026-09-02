import { BirthdayHat } from "@/modules/common/components/BirthdayHat";
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
      <td className={clsx({ "font-bold": isToday })}>
        {dateFormatter.format(birthday.date)}
      </td>

      <td className="overflow-hidden">
        <span className="flex items-center gap-2">
          {/* A long handle must give way to the hat, not push it out of the
          cell. The popover of the link shows the full handle. */}
          <span className="min-w-0 truncate">
            <CitizenLink citizen={birthday.citizen} />
          </span>

          {isToday && <BirthdayHat className="size-4 flex-none" />}
        </span>
      </td>

      <td className={clsx("font-mono", { "font-bold": isToday })}>
        {formatDaysUntil(birthday.daysUntil)}
      </td>
    </TRow>
  );
};
