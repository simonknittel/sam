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
    <section className="mt-4 w-full max-w-xl p-4 lg:p-8 rounded-primary bg-neutral-800/50 ">
      <h2 className="font-bold text-xl mb-4">Current status</h2>

      <div className="flex items-baseline gap-2">
        {currentlyLive ? (
          <>
            <FaRegCheckCircle className="text-green-500 relative top-[2px]" />

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
                <p className="text-neutral-500 mt-4">
                  Re-opens in{" "}
                  <strong>
                    <Countdown date={nextLive.start} />
                  </strong>{" "}
                  (region: <strong>{nextLive.region})</strong>
                </p>
              ) : (
                <p className="text-neutral-500 mt-4">
                  No further schedule known.
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <FaRegTimesCircle className="text-brand-red-500 relative top-[2px]" />

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
