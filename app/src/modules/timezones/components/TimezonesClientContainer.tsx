"use client";

import clsx from "clsx";
import dynamic from "next/dynamic";
import { ErrorBoundary } from "react-error-boundary";
import { Calculator } from "./Calculator";
import { CETCESTPopover } from "./CETCESTPopover";
import { GMTBSTPopover } from "./GMTBSTPopover";
import { PacificTimePopover } from "./PacificTimePopover";
import { Timezone } from "./Timezone";
import { UTCPopover } from "./UTCPopover";

const GlobeLazy = dynamic(() => import("./Globe").then((m) => m.Globe), {
  ssr: false,
  loading: () => <div className="w-1/4 max-h-60" />,
});

interface Props {
  readonly className?: string;
}

export const TimezonesClientContainer = ({ className }: Props) => {
  const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className={clsx(className)}>
      <section className="flex flex-col gap-0.5">
        <div className="hidden md:flex">
          <ErrorBoundary fallback={null}>
            <GlobeLazy className="w-1/4 max-h-60" />
          </ErrorBoundary>

          <Timezone
            heading="Deine lokale Zeit"
            headingClassName="text-me"
            timeZone={localTimeZone}
            className="w-3/4"
          />
        </div>

        <div className="flex flex-col md:flex-row gap-0.5">
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
