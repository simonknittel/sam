"use client";

import { DateTimeInput } from "@/modules/common/components/form/DateTimeInput";
import { Select } from "@/modules/common/components/form/Select";
import clsx from "clsx";
import { format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { parseAsIsoDateTime, parseAsStringLiteral, useQueryState } from "nuqs";
import { useId, type ChangeEventHandler } from "react";
import { getActiveTimeZoneName } from "../utils/getActiveTimeZoneName";
import { TimezoneCompact } from "./TimezoneCompact";

interface Props {
  readonly className?: string;
}

/** Returns the wall-clock time in the given timezone formatted for datetime-local input */
const toDateTimeLocalValue = (date: Date, timeZone: string): string =>
  format(toZonedTime(date, timeZone), "yyyy-MM-dd'T'HH:mm");

export const Calculator = ({ className }: Props) => {
  const [date, setDate] = useQueryState(
    "dt",
    parseAsIsoDateTime.withDefault(new Date()),
  );
  const [timeZone, setTimeZone] = useQueryState(
    "tz",
    parseAsStringLiteral([
      "UTC",
      "Europe/London",
      "Europe/Berlin",
      "America/Los_Angeles",
    ]).withDefault("UTC"),
  );
  const timezoneSelectId = useId();

  const handleDateChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const newDate = fromZonedTime(event.target.value, timeZone);
    if (!isNaN(newDate.getTime())) void setDate(newDate);
  };

  const handleTimeZoneChange: ChangeEventHandler<HTMLSelectElement> = (
    event,
  ) => {
    const newTimeZone = event.target.value as typeof timeZone;
    // Keep the same wall-clock string but re-interpret it in the new timezone
    const currentWallClock = toDateTimeLocalValue(date, timeZone);
    const newDate = fromZonedTime(currentWallClock, newTimeZone);
    void setDate(newDate);
    void setTimeZone(newTimeZone);
  };

  return (
    <section className={clsx("bg-secondary p-4 rounded-primary", className)}>
      <div>
        <h3 className="font-mono uppercase text-xl text-center">Rechner</h3>

        <div className="flex flex-col md:flex-row mt-2">
          {/* Input */}
          <div className="flex-1 flex flex-col gap-4 pb-4 md:pb-0 md:pr-4">
            <div>
              <DateTimeInput
                label="Datum und Uhrzeit"
                type="datetime-local"
                value={toDateTimeLocalValue(date, timeZone)}
                onChange={handleDateChange}
              />
            </div>

            <div>
              <label className="block" htmlFor={timezoneSelectId}>
                Zeitzone
              </label>
              <Select
                id={timezoneSelectId}
                className="mt-2"
                value={timeZone}
                onChange={handleTimeZoneChange}
              >
                <option value="UTC">{getActiveTimeZoneName("UTC")}</option>

                <option value="Europe/London">
                  {getActiveTimeZoneName("Europe/London")}
                </option>

                <option value="Europe/Berlin">
                  {getActiveTimeZoneName("Europe/Berlin")}
                </option>

                <option value="America/Los_Angeles">
                  {getActiveTimeZoneName("America/Los_Angeles")}
                </option>
              </Select>
            </div>
          </div>

          {/* Output */}
          <div className="flex-1 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-4 flex flex-col gap-2">
            <TimezoneCompact
              date={date}
              timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}
              isLocalTimeZone
            />
            <TimezoneCompact date={date} timeZone="America/Los_Angeles" />
            <TimezoneCompact date={date} timeZone="UTC" />
            <TimezoneCompact date={date} timeZone="Europe/London" />
            <TimezoneCompact date={date} timeZone="Europe/Berlin" />
          </div>
        </div>
      </div>
    </section>
  );
};
