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
    <section className="mt-4 w-full max-w-xl p-4 lg:p-8 rounded-primary bg-neutral-800/50 ">
      <h2 className="font-bold text-xl mb-4">Full schedule</h2>

      <ul className="flex flex-col gap-2 list-disc pl-5">
        {schedule.map((time) => (
          <li
            key={time.start.toISOString()}
            className={clsx({
              "text-neutral-500": time.end < getNow(),
              "text-green-500 font-bold": time === currentlyLive,
            })}
          >
            {formatDate(time.start, "short")}{" "}
            {time.start.toLocaleTimeString(undefined, {
              timeStyle: "short",
              timeZone: "Europe/Berlin",
            })}{" "}
            - {formatDate(time.end, "short")}{" "}
            {time.end.toLocaleTimeString(undefined, {
              timeStyle: "short",
              timeZone: "Europe/Berlin",
            })}{" "}
            (region: {time.region})
          </li>
        ))}
      </ul>

      <p className="mt-4">
        Source:{" "}
        <Link
          href="https://robertsspaceindustries.com/spectrum/community/SC/forum/1/thread/pyro-preview-channel-update"
          className="inline-flex items-center justify-center rounded-secondary gap-2 text-brand-red-500 hover:bg-sinisterborder-brand-red-300 hover:text-brand-red-300 active:text-brand-red-300 underline"
          rel="noreferrer"
        >
          Spectrum
        </Link>
      </p>
    </section>
  );
};

export default FullSchedule;
