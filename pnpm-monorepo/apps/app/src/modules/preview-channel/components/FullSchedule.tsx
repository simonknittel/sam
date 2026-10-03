"use client";

import { Link } from "@/modules/common/components/Link";
import { formatDate } from "@/modules/common/utils/formatDate";
import clsx from "clsx";
import { getNow } from "../utils/getNow";
import type { Schedule } from "../utils/schedule";
import { useSchedule } from "../utils/useSchedule";

interface Props {
  schedule: Schedule;
}

const FullSchedule = ({ schedule }: Readonly<Props>) => {
  const { currentlyLive } = useSchedule(schedule);

  return (
    <section className="mt-4 w-full max-w-xl rounded-primary bg-neutral-800/50 p-4 lg:p-8">
      <h2 className="mb-4 text-xl font-bold">Full schedule</h2>

      <ul className="flex list-disc flex-col gap-2 pl-5">
        {schedule.map((time) => (
          <li
            key={time.start.toISOString()}
            className={clsx({
              "text-neutral-500": time.end < getNow(),
              "font-bold text-green-500": time === currentlyLive,
            })}
          >
            {formatDate(time.start)} - {formatDate(time.end)} (region:{" "}
            {time.region})
          </li>
        ))}
      </ul>

      <p className="mt-4">
        Source:{" "}
        <Link
          href="https://robertsspaceindustries.com/spectrum/community/SC/forum/1/thread/pyro-preview-channel-update"
          className="inline-flex items-center justify-center gap-2 rounded-secondary border-brand-red-300 text-brand-red-500 underline hover:text-brand-red-300 active:text-brand-red-300"
          rel="noreferrer"
        >
          Spectrum
        </Link>
      </p>
    </section>
  );
};

export default FullSchedule;
