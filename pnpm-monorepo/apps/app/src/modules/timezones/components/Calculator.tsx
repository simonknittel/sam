"use client";

import { DateTimeInput } from "@/modules/common/components/form/DateTimeInput";
import { Select } from "@/modules/common/components/form/Select";
import { instantToWallTime, wallTimeToInstant } from "@sam-monorepo/domain";
import clsx from "clsx";
import { parseAsIsoDateTime, parseAsStringLiteral, useQueryState } from "nuqs";
import { useId, type ChangeEventHandler } from "react";
import { getActiveTimeZoneName } from "../utils/getActiveTimeZoneName";
import { TimezoneCompact } from "./TimezoneCompact";

interface Props {
  readonly className?: string;
}

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
    try {
      void setDate(wallTimeToInstant(event.target.value, timeZone));
    } catch {
      // The input is empty or not complete, thus the date stays
    }
  };

  const handleTimeZoneChange: ChangeEventHandler<HTMLSelectElement> = (
    event,
  ) => {
    const newTimeZone = event.target.value as typeof timeZone;
    // Keep the same wall-clock string but re-interpret it in the new timezone
    const currentWallTime = instantToWallTime(date, timeZone);
    void setDate(wallTimeToInstant(currentWallTime, newTimeZone));
    void setTimeZone(newTimeZone);
  };

  return (
    <section className={clsx("rounded-primary bg-secondary p-4", className)}>
      <div>
        <h3 className="text-center font-mono text-xl uppercase">Rechner</h3>

        <div className="mt-2 flex flex-col md:flex-row">
          {/* Input */}
          <div className="flex flex-1 flex-col gap-4 pb-4 md:pr-4 md:pb-0">
            <div>
              <DateTimeInput
                label="Datum und Uhrzeit"
                type="datetime-local"
                value={instantToWallTime(date, timeZone)}
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
          <div className="flex flex-1 flex-col gap-2 border-t border-white/10 pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-4">
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
