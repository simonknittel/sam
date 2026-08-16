"use client";

import { DateTimeInput } from "@/modules/common/components/form/DateTimeInput";
import clsx from "clsx";
import { useState } from "react";
import { berlinWallTimeToUtc } from "../utils/berlinWallTime";

const BERLIN_TIME_ZONE = "Europe/Berlin";

interface Props {
  readonly className?: string;
  readonly name: string;
  readonly label: string;
  /** Accepts the union returned by `getDefaultValueWithFallback` */
  readonly defaultValue?: string | number | readonly string[];
  readonly required?: boolean;
}

/**
 * datetime-local input interpreted as fixed Europe/Berlin wall time, with a
 * hint showing the equivalent in the viewer's local timezone for travelling
 * users. The hint disappears when the viewer already is on Berlin time.
 */
export const EventDateTimeField = ({
  className,
  name,
  label,
  defaultValue,
  required,
}: Props) => {
  const [value, setValue] = useState(
    typeof defaultValue === "string" ? defaultValue : "",
  );

  const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  let localTimeHint: string | null = null;
  if (value && browserTimeZone !== BERLIN_TIME_ZONE) {
    try {
      localTimeHint = berlinWallTimeToUtc(value).toLocaleString("de-DE", {
        weekday: "short",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      localTimeHint = null;
    }
  }

  return (
    <div className={clsx(className)}>
      <DateTimeInput
        name={name}
        label={label}
        hint="Zeitzone: Europe/Berlin"
        value={value}
        onChange={(changeEvent) => setValue(changeEvent.target.value)}
        required={required}
      />

      {localTimeHint && (
        <p className="text-xs mt-1 text-gray-400">
          In deiner Zeitzone ({browserTimeZone}): {localTimeHint}
        </p>
      )}
    </div>
  );
};
