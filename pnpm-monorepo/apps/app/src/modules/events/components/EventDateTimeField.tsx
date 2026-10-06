"use client";

import { DateTimeInput } from "@/modules/common/components/form/DateTimeInput";
import { ORGANIZATION_TIMEZONE, wallTimeToInstant } from "@sam-monorepo/domain";
import clsx from "clsx";
import { useState, useSyncExternalStore } from "react";

/** The field reads the time zone of the browser one time. */
const subscribeToNothing = () => () => undefined;

const getBrowserTimeZone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * The server does not know the time zone of the viewer. Thus the server
 * render and the hydration show no hint.
 */
const getServerTimeZone = () => null;

interface Props {
  readonly className?: string;
  readonly name: string;
  readonly label: string;
  /** Accepts the union returned by `getDefaultValueWithFallback` */
  readonly defaultValue?: string | number | readonly string[];
  readonly required?: boolean;
}

/**
 * datetime-local input interpreted as wall time in the time zone of the
 * organization, with a hint showing the equivalent in the viewer's local
 * timezone for travelling users. The hint disappears when the viewer already
 * is in the time zone of the organization.
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

  const browserTimeZone = useSyncExternalStore(
    subscribeToNothing,
    getBrowserTimeZone,
    getServerTimeZone,
  );

  let localTimeHint: string | null = null;
  if (value && browserTimeZone && browserTimeZone !== ORGANIZATION_TIMEZONE) {
    try {
      localTimeHint = wallTimeToInstant(
        value,
        ORGANIZATION_TIMEZONE,
      ).toLocaleString("de-DE", {
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
        value={value}
        onChange={(changeEvent) => setValue(changeEvent.target.value)}
        required={required}
      />

      <p className="mt-1 text-xs text-white/40">
        Zeitzone: {ORGANIZATION_TIMEZONE}
      </p>

      {localTimeHint && (
        <p className="mt-1 text-xs text-white/40">
          In deiner Zeitzone ({browserTimeZone}): {localTimeHint}
        </p>
      )}
    </div>
  );
};
