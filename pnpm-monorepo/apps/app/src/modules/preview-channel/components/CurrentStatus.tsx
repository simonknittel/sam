"use client";

import { FaRegCheckCircle, FaRegTimesCircle } from "react-icons/fa";
import type { Schedule } from "../utils/schedule";
import { useSchedule } from "../utils/useSchedule";
import { Countdown } from "./Countdown";

interface Props {
  schedule: Schedule;
}

const CurrentStatus = ({ schedule }: Readonly<Props>) => {
  const { currentlyLive, nextLive } = useSchedule(schedule);

  return (
    <section className="mt-4 w-full max-w-xl rounded-primary bg-neutral-800/50 p-4 lg:p-8">
      <h2 className="mb-4 text-xl font-bold">Current status</h2>

      <div className="flex items-baseline gap-2">
        {currentlyLive ? (
          <>
            <FaRegCheckCircle className="relative top-[2px] text-green-500" />

            <div>
              <p>
                The preview channel is currently active (region:{" "}
                <strong>{currentlyLive.region}</strong>).
              </p>

              <p>
                Closes in{" "}
                <strong>
                  <Countdown date={currentlyLive.end} />
                </strong>
              </p>

              {nextLive ? (
                <p className="mt-4 text-neutral-500">
                  Re-opens in{" "}
                  <strong>
                    <Countdown date={nextLive.start} />
                  </strong>{" "}
                  (region: <strong>{nextLive.region})</strong>
                </p>
              ) : (
                <p className="mt-4 text-neutral-500">
                  No further schedule known.
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <FaRegTimesCircle className="relative top-[2px] text-brand-red-500" />

            <div>
              <p>The preview channel is currently not active.</p>

              {nextLive ? (
                <p>
                  Opens in{" "}
                  <strong>
                    <Countdown date={nextLive.start} />
                  </strong>{" "}
                  (region: <strong>{nextLive.region}</strong>)
                </p>
              ) : (
                <p>No further schedule known.</p>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default CurrentStatus;
