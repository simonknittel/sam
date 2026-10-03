"use client";

import clsx from "clsx";
import { Calculator } from "./Calculator";
import { CETCESTPopover } from "./CETCESTPopover";
import { GMTBSTPopover } from "./GMTBSTPopover";
import { PacificTimePopover } from "./PacificTimePopover";
import { Timezone } from "./Timezone";
import { UTCPopover } from "./UTCPopover";

interface Props {
  readonly className?: string;
}

export const TimezonesClientContainer = ({ className }: Props) => {
  const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className={clsx(className)}>
      <section>
        <Timezone
          heading="Deine lokale Zeit"
          headingClassName="text-me"
          timeZone={localTimeZone}
        />

        <div className="mt-0.5 flex flex-col gap-0.5 md:flex-row">
          <Timezone
            heading="CIG Los Angeles"
            subheading="Vereinigte Staaten von Amerika"
            timeZone="America/Los_Angeles"
            timezonePopoverChildren={<PacificTimePopover />}
          />

          <Timezone
            heading="UTC"
            subheading="Koordinierte Weltzeit"
            timeZone="UTC"
            timezonePopoverChildren={<UTCPopover />}
          />

          <Timezone
            heading="CIG Manchester"
            subheading="Großbritannien"
            timeZone="Europe/London"
            timezonePopoverChildren={<GMTBSTPopover />}
          />

          <Timezone
            heading="CIG Frankfurt"
            subheading="Deutschland"
            timeZone="Europe/Berlin"
            timezonePopoverChildren={<CETCESTPopover />}
          />
        </div>
      </section>

      <Calculator className="mt-8" />
    </div>
  );
};
